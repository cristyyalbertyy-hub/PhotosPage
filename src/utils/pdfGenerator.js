import { zipSync } from 'fflate'
import { jsPDF } from 'jspdf'
import { getSlotsForPage, LAYOUT_META, slotToRect } from './pdfLayouts'

export const MARGIN = 10
export const GAP = 4
export const EMAIL_SIZE_LIMIT = 20 * 1024 * 1024

export const QUALITY_PROFILES = {
  email: { dpi: 200, jpegQuality: 0.72 },
  print: { dpi: 300, jpegQuality: 0.88 },
}

const PDF_OVERHEAD_PER_PAGE = 4096

export function getPageDimensions(orientation) {
  if (orientation === 'landscape') {
    return { width: 297, height: 210 }
  }
  return { width: 210, height: 297 }
}

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

function fitInCell(imgW, imgH, cellW, cellH) {
  const scale = Math.min(cellW / imgW, cellH / imgH)
  const w = imgW * scale
  const h = imgH * scale
  return {
    x: (cellW - w) / 2,
    y: (cellH - h) / 2,
    w,
    h,
  }
}

function getSlotRect(photosPerPage, indexOnPage, countOnPage, orientation) {
  const layout = LAYOUT_META[photosPerPage]
  const { width: pageWidth, height: pageHeight } = getPageDimensions(orientation)
  const slots = getSlotsForPage(photosPerPage, countOnPage)
  return slotToRect(
    slots[indexOnPage],
    layout.cols,
    layout.rows,
    MARGIN,
    GAP,
    pageWidth,
    pageHeight,
  )
}

function prepareImageForSlot(img, photosPerPage, indexOnPage, countOnPage, orientation, profile) {
  const rect = getSlotRect(photosPerPage, indexOnPage, countOnPage, orientation)
  const maxW = mmToPx(rect.cellW, profile.dpi)
  const maxH = mmToPx(rect.cellH, profile.dpi)
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
) {
  if (photoUrls.length === 0) {
    return { totalBytes: 0, partCount: 0, fitsEmail: true }
  }

  const profile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.email
  const images = await Promise.all(photoUrls.map(loadImageElement))
  let imageBytes = 0

  for (let i = 0; i < images.length; i++) {
    const pageStart = Math.floor(i / photosPerPage) * photosPerPage
    const pageEnd = Math.min(pageStart + photosPerPage, images.length)
    const countOnPage = pageEnd - pageStart
    const indexOnPage = i - pageStart
    const prepared = prepareImageForSlot(
      images[i],
      photosPerPage,
      indexOnPage,
      countOnPage,
      orientation,
      profile,
    )
    imageBytes += prepared.byteSize
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

async function buildPdfBlob(photoUrls, photosPerPage, orientation, profile) {
  const layout = LAYOUT_META[photosPerPage]
  const { width: pageWidth, height: pageHeight } = getPageDimensions(orientation)
  const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  const images = await Promise.all(photoUrls.map(loadImageElement))

  for (let pageStart = 0; pageStart < images.length; pageStart += photosPerPage) {
    if (pageStart > 0) pdf.addPage(orientation, 'a4')

    const pageImages = images.slice(pageStart, pageStart + photosPerPage)
    const countOnPage = pageImages.length
    const slots = getSlotsForPage(photosPerPage, countOnPage)

    pageImages.forEach((img, i) => {
      const rect = slotToRect(
        slots[i],
        layout.cols,
        layout.rows,
        MARGIN,
        GAP,
        pageWidth,
        pageHeight,
      )
      const maxW = mmToPx(rect.cellW, profile.dpi)
      const maxH = mmToPx(rect.cellH, profile.dpi)
      const prepared = resizeToDataUrl(img, maxW, maxH, profile.jpegQuality)
      const fit = fitInCell(prepared.width, prepared.height, rect.cellW, rect.cellH)
      pdf.addImage(
        prepared.dataUrl,
        'JPEG',
        rect.x + fit.x,
        rect.y + fit.y,
        fit.w,
        fit.h,
      )
    })
  }

  return pdf.output('blob')
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function downloadZip(files, zipName) {
  const entries = {}
  for (const { name, blob } of files) {
    entries[name] = new Uint8Array(await blob.arrayBuffer())
  }
  const zipped = zipSync(entries)
  downloadBlob(new Blob([zipped], { type: 'application/zip' }), zipName)
}

export async function generatePdf({
  photoUrls,
  photosPerPage,
  filename,
  orientation = 'portrait',
  quality = 'email',
  downloadAsZip = false,
  onProgress,
}) {
  if (photoUrls.length === 0) {
    throw new Error('NO_PHOTOS_SELECTED')
  }

  const profile = QUALITY_PROFILES[quality] || QUALITY_PROFILES.email
  const safeName = filename.trim() || 'fotos'
  const estimate = await estimatePdfSize(photoUrls, photosPerPage, orientation, quality)
  const shouldSplit = !estimate.fitsEmail
  const parts = shouldSplit
    ? splitPhotoUrls(photoUrls, photosPerPage, orientation, quality, estimate.partCount)
    : [photoUrls]

  const pdfFiles = []
  for (let i = 0; i < parts.length; i++) {
    onProgress?.({ current: i + 1, total: parts.length })
    const blob = await buildPdfBlob(parts[i], photosPerPage, orientation, profile)
    const partName =
      parts.length === 1 ? `${safeName}.pdf` : `${safeName}_parte${i + 1}.pdf`
    pdfFiles.push({ name: partName, blob })
  }

  if (pdfFiles.length === 1) {
    downloadBlob(pdfFiles[0].blob, pdfFiles[0].name)
  } else if (downloadAsZip) {
    downloadZip(pdfFiles, `${safeName}.zip`)
  } else {
    for (const file of pdfFiles) {
      downloadBlob(file.blob, file.name)
    }
  }

  return {
    partCount: pdfFiles.length,
    totalBytes: estimate.totalBytes,
    split: pdfFiles.length > 1,
  }
}
