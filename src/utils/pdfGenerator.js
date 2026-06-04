import { jsPDF } from 'jspdf'
import { getSlotsForPage, LAYOUT_META, slotToRect } from './pdfLayouts'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 10
const GAP = 4

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.92),
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
    }
    img.onerror = reject
    img.src = url
  })
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

export async function generatePdf(photoUrls, photosPerPage, filename) {
  if (photoUrls.length === 0) {
    throw new Error('Nenhuma foto selecionada')
  }

  const layout = LAYOUT_META[photosPerPage]
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const loadedImages = await Promise.all(photoUrls.map(loadImage))

  for (let pageStart = 0; pageStart < loadedImages.length; pageStart += photosPerPage) {
    if (pageStart > 0) pdf.addPage()

    const pagePhotos = loadedImages.slice(pageStart, pageStart + photosPerPage)
    const slots = getSlotsForPage(photosPerPage, pagePhotos.length)

    pagePhotos.forEach((img, i) => {
      const rect = slotToRect(
        slots[i],
        layout.cols,
        layout.rows,
        MARGIN,
        GAP,
        PAGE_WIDTH,
        PAGE_HEIGHT,
      )
      const fit = fitInCell(img.width, img.height, rect.cellW, rect.cellH)
      pdf.addImage(
        img.dataUrl,
        'JPEG',
        rect.x + fit.x,
        rect.y + fit.y,
        fit.w,
        fit.h,
      )
    })
  }

  const safeName = filename.trim() || 'fotos'
  pdf.save(`${safeName}.pdf`)
}
