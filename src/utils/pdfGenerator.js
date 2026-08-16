import { zipSync } from 'fflate'
import { jsPDF } from 'jspdf'
import { layoutPage } from './pageLayout'

export { MARGIN, GAP, getPageDimensions } from './pageLayout'

export const EMAIL_SIZE_LIMIT = 20 * 1024 * 1024

export const QUALITY_PROFILES = {
  email: { dpi: 200, jpegQuality: 0.72 },
  print: { dpi: 300, jpegQuality: 0.88 },
}

const PDF_OVERHEAD_PER_PAGE = 4096

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

function resizeToDataUrl(img, maxW, maxH, jpegQuality) {
  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1)
  const w = Math.max(1, Math.round(img.naturalWidth * scale))
  const h = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(img, 0, 0, w, h)
  const dataUrl = canvas.toDataURL('image/jpeg', jpegQuality)
  return { dataUrl, width: w, height: h, byteSize: dataUrlByteSize(dataUrl) }
}

function prepareImageForRect(img, rect, profile) {
  const maxW = mmToPx(rect.w, profile.dpi)
  const maxH = mmToPx(rect.h, profile.dpi)
  return resizeToDataUrl(img, maxW, maxH, profile.jpegQuality)
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function estimatePdfSize(
  photoUrls,
  photosPerPage,
  orientation = 'portrait',
  quality = 'email',
  layoutMode = 'fill',
) {
  if (photoUrls.length === 0) {
    return { totalBytes: 0, partCount: 0, fitsEmail: true }
  }

  const profile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.email
  const images = await Promise.all(photoUrls.map(loadImageElement))
  let imageBytes = 0

  for (let pageStart = 0; pageStart < images.length; pageStart += photosPerPage) {
    const pageImages = images.slice(pageStart, pageStart + photosPerPage)
    const { rects } = layoutPage({
      aspects: pageImages.map((img) => img.naturalWidth / img.naturalHeight),
      photosPerPage,
      orientation,
      mode: layoutMode,
    })

    pageImages.forEach((img, index) => {
      imageBytes += prepareImageForRect(img, rects[index], profile).byteSize
    })
  }

  const pageCount = Math.ceil(images.length / photosPerPage)
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

function splitPhotoUrls(photoUrls, photosPerPage, orientation, quality, partCount) {
  if (partCount <= 1) return [photoUrls]

  const photosPerPart = Math.ceil(photoUrls.length / partCount)
  const parts = []
  for (let i = 0; i < photoUrls.length; i += photosPerPart) {
    parts.push(photoUrls.slice(i, i + photosPerPart))
  }
  return parts
}

async function buildPdfBlob(photoUrls, photosPerPage, orientation, profile, layoutMode) {
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const images = await Promise.all(photoUrls.map(loadImageElement))

  for (let pageStart = 0; pageStart < images.length; pageStart += photosPerPage) {
    if (pageStart > 0) pdf.addPage(orientation, 'a4')

    const pageImages = images.slice(pageStart, pageStart + photosPerPage)
    const { rects } = layoutPage({
      aspects: pageImages.map((img) => img.naturalWidth / img.naturalHeight),
      photosPerPage,
      orientation,
      mode: layoutMode,
    })

    pageImages.forEach((img, i) => {
      const rect = rects[i]
      const prepared = prepareImageForRect(img, rect, profile)
      pdf.addImage(prepared.dataUrl, 'JPEG', rect.x, rect.y, rect.w, rect.h)
    })
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
  photosPerPage,
  filename,
  orientation = 'portrait',
  quality = 'email',
  layoutMode = 'fill',
  onProgress,
}) {
  if (photoUrls.length === 0) {
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
  )
  const shouldSplit = !estimate.fitsEmail
  const parts = shouldSplit
    ? splitPhotoUrls(photoUrls, photosPerPage, orientation, quality, estimate.partCount)
    : [photoUrls]

  const files = []
  for (let i = 0; i < parts.length; i++) {
    onProgress?.({ current: i + 1, total: parts.length })
    const blob = await buildPdfBlob(
      parts[i],
      photosPerPage,
      orientation,
      profile,
      layoutMode,
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
  photosPerPage,
  filename,
  orientation = 'portrait',
  quality = 'email',
  layoutMode = 'fill',
  downloadAsZip = false,
  onProgress,
}) {
  const result = await buildPdfFiles({
    photoUrls,
    photosPerPage,
    filename,
    orientation,
    quality,
    layoutMode,
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
