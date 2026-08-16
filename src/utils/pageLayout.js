import { getSlotsForPage, LAYOUT_META, slotToRect } from './pdfLayouts'

export const MARGIN = 10
export const GAP = 4

export function getPageDimensions(orientation) {
  if (orientation === 'landscape') {
    return { width: 297, height: 210 }
  }
  return { width: 210, height: 297 }
}

function safeAspect(value) {
  if (!Number.isFinite(value) || value <= 0) return 1
  return value
}

function containInBox(aspect, x, y, boxW, boxH) {
  const scale = Math.min(boxW / aspect, boxH)
  const w = aspect * scale
  const h = scale
  return {
    x: x + (boxW - w) / 2,
    y: y + (boxH - h) / 2,
    w,
    h,
  }
}

function layoutGrid(aspects, photosPerPage, pageW, pageH, margin, gap) {
  const layout = LAYOUT_META[photosPerPage]
  const slots = getSlotsForPage(photosPerPage, aspects.length)

  return slots.map((slot, i) => {
    const cell = slotToRect(
      slot,
      layout.cols,
      layout.rows,
      margin,
      gap,
      pageW,
      pageH,
    )
    return containInBox(aspects[i] ?? 1, cell.x, cell.y, cell.cellW, cell.cellH)
  })
}

function compositions(n, maxPart) {
  const result = []

  function walk(remaining, acc) {
    if (remaining === 0) {
      result.push([...acc])
      return
    }
    const limit = Math.min(maxPart, remaining)
    for (let size = 1; size <= limit; size++) {
      acc.push(size)
      walk(remaining - size, acc)
      acc.pop()
    }
  }

  walk(n, [])
  return result
}

function layoutByRows(aspects, rowSizes, usableW, gap) {
  const rects = []
  let y = 0
  let index = 0

  for (const size of rowSizes) {
    const rowAspects = aspects.slice(index, index + size)
    const sumAspect = rowAspects.reduce((sum, aspect) => sum + aspect, 0)
    const height = (usableW - gap * (size - 1)) / sumAspect
    let x = 0

    for (const aspect of rowAspects) {
      const width = height * aspect
      rects.push({ x, y, w: width, h: height })
      x += width + gap
    }

    y += height + gap
    index += size
  }

  return {
    rects,
    contentW: usableW,
    contentH: y - gap,
  }
}

function layoutByCols(aspects, colSizes, usableH, gap) {
  const columns = []
  let index = 0

  for (const size of colSizes) {
    const colAspects = aspects.slice(index, index + size)
    const invSum = colAspects.reduce((sum, aspect) => sum + 1 / aspect, 0)
    const width = (usableH - gap * (size - 1)) / invSum
    const rects = []
    let y = 0

    for (const aspect of colAspects) {
      const height = width / aspect
      rects.push({ x: 0, y, w: width, h: height })
      y += height + gap
    }

    columns.push({ width, height: y - gap, rects })
    index += size
  }

  const rects = []
  let x = 0
  for (const column of columns) {
    for (const rect of column.rects) {
      rects.push({ ...rect, x })
    }
    x += column.width + gap
  }

  return {
    rects,
    contentW: x - gap,
    contentH: Math.max(...columns.map((column) => column.height)),
  }
}

function placeCentered(rects, contentW, contentH, usableW, usableH, margin) {
  const scale = Math.min(usableW / contentW, usableH / contentH)
  const usedW = contentW * scale
  const usedH = contentH * scale
  const offsetX = margin + (usableW - usedW) / 2
  const offsetY = margin + (usableH - usedH) / 2

  return rects.map((rect) => ({
    x: offsetX + rect.x * scale,
    y: offsetY + rect.y * scale,
    w: rect.w * scale,
    h: rect.h * scale,
  }))
}

function fillScore(rects, usableW, usableH) {
  const filled = rects.reduce((sum, rect) => sum + rect.w * rect.h, 0)
  return filled / (usableW * usableH)
}

function layoutFill(aspects, pageW, pageH, margin, gap, orientation) {
  const count = aspects.length
  if (count === 0) return []

  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2

  if (count === 1) {
    return [containInBox(aspects[0], margin, margin, usableW, usableH)]
  }

  const maxPerRow = orientation === 'landscape' ? 5 : 4
  const maxPerCol = orientation === 'landscape' ? 3 : 4

  let best = null
  let bestScore = -1

  function consider(laid) {
    if (laid.contentW <= 0 || laid.contentH <= 0) return
    const placed = placeCentered(
      laid.rects,
      laid.contentW,
      laid.contentH,
      usableW,
      usableH,
      margin,
    )
    const score = fillScore(placed, usableW, usableH)
    if (score > bestScore) {
      bestScore = score
      best = placed
    }
  }

  for (const partition of compositions(count, maxPerRow)) {
    consider(layoutByRows(aspects, partition, usableW, gap))
  }

  for (const partition of compositions(count, maxPerCol)) {
    consider(layoutByCols(aspects, partition, usableH, gap))
  }

  return best ?? [containInBox(aspects[0], margin, margin, usableW, usableH)]
}

export function computeFillRatio(rects, pageW, pageH, margin = MARGIN) {
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  if (usableW <= 0 || usableH <= 0) return 0
  return fillScore(rects, usableW, usableH)
}

export function layoutPage({
  aspects,
  photosPerPage,
  orientation,
  mode = 'fill',
  margin = MARGIN,
  gap = GAP,
}) {
  const { width: pageW, height: pageH } = getPageDimensions(orientation)
  const safe = aspects.map(safeAspect)
  const rects =
    mode === 'grid'
      ? layoutGrid(safe, photosPerPage, pageW, pageH, margin, gap)
      : layoutFill(safe, pageW, pageH, margin, gap, orientation)

  return {
    rects,
    pageW,
    pageH,
    fillRatio: computeFillRatio(rects, pageW, pageH, margin),
  }
}

export function chunkPhotos(photos, photosPerPage) {
  const pages = []
  for (let i = 0; i < photos.length; i += photosPerPage) {
    pages.push(photos.slice(i, i + photosPerPage))
  }
  return pages
}
