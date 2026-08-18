import { zipSync } from 'fflate'
import { jsPDF } from 'jspdf'
import { getPageDimensions, layoutPage, rotatedAspect } from './pageLayout'

export { MARGIN, GAP, getPageDimensions } from './pageLayout'

export const EMAIL_SIZE_LIMIT = 20 * 1024 * 1024

export const QUALITY_PROFILES = {
  email: { dpi: 200, jpegQuality: 0.72 },
  print: { dpi: 300, jpegQuality: 0.88 },
}

const PDF_OVERHEAD_PER_PAGE = 4096
const CAPTION_MM = 5

function mmToPx(mm, dpi) {
  return Math.max(1, Math.round((mm / 25.4) * dpi))
}

function dataUrlByteSize(dataUrl) {
  const base64 = dataUrl.split(',')[1] || ''
  return Math.ceil((base64.length * 3) / 4)
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

function normalizePhotos(photoUrls, photoItems) {
  if (photoItems?.length) return photoItems
  return (photoUrls || []).map((url) => ({
    url,
    rotation: 0,
    scale: 1,
    caption: '',
  }))
}

function rotateToDataUrl(img, rotation, maxW, maxH, jpegQuality) {
  const swap = rotation % 180 === 90
  const srcW = img.naturalWidth
  const srcH = img.naturalHeight
  const outW = swap ? srcH : srcW
  const outH = swap ? srcW : srcH
  const scale = Math.min(maxW / outW, maxH / outH, 1)
  const w = Math.max(1, Math.round(outW * scale))
  const h = Math.max(1, Math.round(outH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(w / 2, h / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  const drawW = Math.max(1, Math.round(srcW * scale))
  const drawH = Math.max(1, Math.round(srcH * scale))
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH)
  const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality)
  return { dataUrl, width: w, height: h, byteSize: dataUrlByteSize(dataUrl) }
}

function prepareImageForRect(img, rect, profile, rotation = 0) {
  const maxW = mmToPx(rect.w, profile.dpi)
  const maxH = mmToPx(rect.h, profile.dpi)
  return rotateToDataUrl(img, rotation, maxW, maxH, profile.jpegQuality)
}

function imageAspect(img, rotation = 0) {
  return rotatedAspect(img.naturalWidth / img.naturalHeight, rotation)
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function drawCaption(pdf, text, rect) {
  const caption = text.trim()
  if (!caption) return 0
  pdf.setFontSize(8)
  pdf.setTextColor(70, 70, 70)
  pdf.text(caption, rect.x + rect.w / 2, rect.y + rect.h - 1.4, {
    align: 'center',
    maxWidth: Math.max(10, rect.w - 2),
  })
  pdf.setTextColor(0, 0, 0)
  return CAPTION_MM
}

function addCoverPage(pdf, cover, profile, orientation) {
  const { width: pageW, height: pageH } = getPageDimensions(orientation)
  const margin = 18
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(22)
  pdf.setTextColor(40, 40, 40)
  const title = (cover.title || '').trim() || ' '
  pdf.text(title, pageW / 2, margin + 8, { align: 'center', maxWidth: pageW - margin * 2 })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(12)
  pdf.setTextColor(90, 90, 90)
  if (cover.date?.trim()) {
    pdf.text(cover.date.trim(), pageW / 2, margin + 18, { align: 'center' })
  }

  if (cover.image) {
    const top = margin + 28
    const box = {
      x: margin,
      y: top,
      w: pageW - margin * 2,
      h: pageH - top - margin,
    }
    const prepared = prepareImageForRect(cover.image, box, profile, cover.rotation || 0)
    const aspect = imageAspect(cover.image, cover.rotation || 0)
    const scale = Math.min(box.w / aspect, box.h)
    const w = aspect * scale
    const h = scale
    pdf.addImage(
      prepared.dataUrl,
      'JPEG',
      box.x + (box.w - w) / 2,
      box.y + (box.h - h) / 2,
      w,
      h,
    )
  }
}

export async function estimatePdfSize(
  photoUrls,
  photosPerPage,
  orientation = 'portrait',
  quality = 'email',
  layoutMode = 'fill',
  photoItems,
  cover,
) {
  const items = normalizePhotos(photoUrls, photoItems)
  if (items.length === 0 && !cover?.enabled) {
    return { totalBytes: 0, partCount: 0, fitsEmail: true }
  }

  const profile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.email
  const images = await Promise.all(items.map((item) => loadImageElement(item.url)))
  let imageBytes = 0
  let pageCount = 0

  if (cover?.enabled) {
    pageCount += 1
    if (cover.url) {
      const coverImg = await loadImageElement(cover.url)
      const { width: pageW, height: pageH } = getPageDimensions(orientation)
      const box = { x: 0, y: 0, w: pageW - 36, h: pageH - 64 }
      imageBytes += prepareImageForRect(coverImg, box, profile, cover.rotation || 0).byteSize
    }
  }

  for (let pageStart = 0; pageStart < images.length; pageStart += photosPerPage) {
    const pageImages = images.slice(pageStart, pageStart + photosPerPage)
    const pageItems = items.slice(pageStart, pageStart + photosPerPage)
    const { rects } = layoutPage({
      aspects: pageImages.map((img, i) => imageAspect(img, pageItems[i].rotation)),
      photosPerPage,
      orientation,
      mode: layoutMode,
      scales: pageItems.map((item) => item.scale ?? 1),
    })

    pageImages.forEach((img, index) => {
      imageBytes += prepareImageForRect(
        img,
        rects[index],
        profile,
        pageItems[index].rotation,
      ).byteSize
    })
    pageCount += 1
  }

  const totalBytes = imageBytes + pageCount * PDF_OVERHEAD_PER_PAGE
  const partCount =
    totalBytes <= EMAIL_SIZE_LIMIT
      ? 1
      : Math.ceil(totalBytes / (EMAIL_SIZE_LIMIT * 0.85))

  return {
    totalBytes,
    partCount,
    fitsEmail: totalBytes <= EMAIL_SIZE_LIMIT,
  }
}

function splitItems(items, partCount) {
  if (partCount <= 1) return [items]
  const photosPerPart = Math.ceil(items.length / partCount)
  const parts = []
  for (let i = 0; i < items.length; i += photosPerPart) {
    parts.push(items.slice(i, i + photosPerPart))
  }
  return parts
}

async function buildPdfBlob(items, photosPerPage, orientation, profile, layoutMode, cover) {
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const images = await Promise.all(items.map((item) => loadImageElement(item.url)))
  let started = false

  if (cover?.enabled) {
    const coverImage = cover.url ? await loadImageElement(cover.url) : null
    addCoverPage(
      pdf,
      { ...cover, image: coverImage },
      profile,
      orientation,
    )
    started = true
  }

  for (let pageStart = 0; pageStart < images.length; pageStart += photosPerPage) {
    if (started) pdf.addPage(orientation, 'a4')
    started = true

    const pageImages = images.slice(pageStart, pageStart + photosPerPage)
    const pageItems = items.slice(pageStart, pageStart + photosPerPage)
    const { rects } = layoutPage({
      aspects: pageImages.map((img, i) => imageAspect(img, pageItems[i].rotation)),
      photosPerPage,
      orientation,
      mode: layoutMode,
      scales: pageItems.map((item) => item.scale ?? 1),
    })

    pageImages.forEach((img, i) => {
      const rect = rects[i]
      const captionH = pageItems[i].caption?.trim() ? CAPTION_MM : 0
      const photoRect = { ...rect, h: rect.h - captionH }
      const prepared = prepareImageForRect(img, photoRect, profile, pageItems[i].rotation)
      pdf.addImage(prepared.dataUrl, 'JPEG', photoRect.x, photoRect.y, photoRect.w, photoRect.h)
      if (captionH) drawCaption(pdf, pageItems[i].caption, rect)
    })
  }

  if (!started) {
    throw new Error('NO_PHOTOS_SELECTED')
  }

  return pdf.output('blob')
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function createZipBlob(files) {
  const entries = {}
  for (const { name, blob } of files) {
    entries[name] = new Uint8Array(await blob.arrayBuffer())
  }
  const zipped = zipSync(entries)
  return new Blob([zipped], { type: 'application/zip' })
}

async function downloadZip(files, zipName) {
  const zipBlob = await createZipBlob(files)
  downloadBlob(zipBlob, zipName)
}

export async function buildPdfFiles({
  photoUrls,
  photoItems,
  photosPerPage,
  filename,
  orientation = 'portrait',
  quality = 'email',
  layoutMode = 'fill',
  cover = null,
  onProgress,
}) {
  const items = normalizePhotos(photoUrls, photoItems)
  if (items.length === 0 && !cover?.enabled) {
    throw new Error('NO_PHOTOS_SELECTED')
  }

  const profile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.email
  const safeName = filename.trim() || 'fotos'
  const estimate = await estimatePdfSize(
    photoUrls,
    photosPerPage,
    orientation,
    quality,
    layoutMode,
    items,
    cover,
  )
  const shouldSplit = !estimate.fitsEmail
  const parts = shouldSplit ? splitItems(items, estimate.partCount) : [items]

  const files = []
  for (let i = 0; i < parts.length; i++) {
    onProgress?.({ current: i + 1, total: parts.length })
    const partCover = i === 0 ? cover : null
    const blob = await buildPdfBlob(
      parts[i],
      photosPerPage,
      orientation,
      profile,
      layoutMode,
      partCover,
    )
    const partName =
      parts.length === 1 ? `${safeName}.pdf` : `${safeName}_parte${i + 1}.pdf`
    files.push({ name: partName, blob })
  }

  return {
    files,
    safeName,
    partCount: files.length,
    totalBytes: estimate.totalBytes,
    split: files.length > 1,
    fitsEmail: estimate.fitsEmail,
  }
}

export async function generatePdf({
  photoUrls,
  photoItems,
  photosPerPage,
  filename,
  orientation = 'portrait',
  quality = 'email',
  layoutMode = 'fill',
  cover = null,
  downloadAsZip = false,
  onProgress,
}) {
  const result = await buildPdfFiles({
    photoUrls,
    photoItems,
    photosPerPage,
    filename,
    orientation,
    quality,
    layoutMode,
    cover,
    onProgress,
  })

  const { files, safeName } = result

  if (files.length === 1) {
    downloadBlob(files[0].blob, files[0].name)
  } else if (downloadAsZip) {
    await downloadZip(files, `${safeName}.zip`)
  } else {
    for (const file of files) {
      downloadBlob(file.blob, file.name)
    }
  }

  return {
    partCount: result.partCount,
    totalBytes: result.totalBytes,
    split: result.split,
  }
}
