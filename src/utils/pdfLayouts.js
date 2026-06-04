/**
 * Definições de grelha para cada quantidade de fotos por página.
 * Cada layout inclui dimensões da grelha e posições dos slots (com suporte a col/row fracionários para centrar).
 */
export const LAYOUT_META = {
  1: { cols: 1, rows: 1, label: '1 foto — página inteira' },
  2: { cols: 2, rows: 1, label: '2 fotos — lado a lado' },
  3: { cols: 3, rows: 1, label: '3 fotos — fila horizontal' },
  4: { cols: 2, rows: 2, label: '4 fotos — grelha 2×2' },
  5: { cols: 3, rows: 2, label: '5 fotos — 3 em cima, 2 centradas em baixo' },
  6: { cols: 2, rows: 3, label: '6 fotos — 2 por fila (3 filas)' },
  7: { cols: 4, rows: 2, label: '7 fotos — 4 em cima, 3 centradas em baixo' },
  8: { cols: 4, rows: 2, label: '8 fotos — grelha 4×2' },
}

const SLOT_TEMPLATES = {
  1: {
    1: [{ col: 0, row: 0, colSpan: 1, rowSpan: 1 }],
  },
  2: {
    1: [{ col: 0, row: 0, colSpan: 2, rowSpan: 1 }],
    2: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
    ],
  },
  3: {
    1: [{ col: 1, row: 0, colSpan: 1, rowSpan: 1 }],
    2: [
      { col: 0.5, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 0, colSpan: 1, rowSpan: 1 },
    ],
    3: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
    ],
  },
  4: {
    1: [{ col: 0.5, row: 0.5, colSpan: 1, rowSpan: 1 }],
    2: [
      { col: 0, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0.5, colSpan: 1, rowSpan: 1 },
    ],
    3: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    4: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
    ],
  },
  5: {
    1: [{ col: 1, row: 0.5, colSpan: 1, rowSpan: 1 }],
    2: [
      { col: 0.5, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 0.5, colSpan: 1, rowSpan: 1 },
    ],
    3: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    4: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    5: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
  },
  6: {
    1: [{ col: 0.5, row: 1, colSpan: 1, rowSpan: 1 }],
    2: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
    ],
    3: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    4: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    5: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 2, colSpan: 1, rowSpan: 1 },
    ],
    6: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 0, row: 2, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 2, colSpan: 1, rowSpan: 1 },
    ],
  },
  7: {
    1: [{ col: 1.5, row: 0.5, colSpan: 1, rowSpan: 1 }],
    2: [
      { col: 1, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0.5, colSpan: 1, rowSpan: 1 },
    ],
    3: [
      { col: 0.5, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 2.5, row: 0.5, colSpan: 1, rowSpan: 1 },
    ],
    4: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
    ],
    5: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    6: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    7: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 2.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
  },
  8: {
    1: [{ col: 1.5, row: 0.5, colSpan: 1, rowSpan: 1 }],
    2: [
      { col: 1, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0.5, colSpan: 1, rowSpan: 1 },
    ],
    3: [
      { col: 0.5, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 0.5, colSpan: 1, rowSpan: 1 },
      { col: 2.5, row: 0.5, colSpan: 1, rowSpan: 1 },
    ],
    4: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
    ],
    5: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    6: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    7: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0.5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1.5, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 2.5, row: 1, colSpan: 1, rowSpan: 1 },
    ],
    8: [
      { col: 0, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 0, colSpan: 1, rowSpan: 1 },
      { col: 0, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 1, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 2, row: 1, colSpan: 1, rowSpan: 1 },
      { col: 3, row: 1, colSpan: 1, rowSpan: 1 },
    ],
  },
}

export function getSlotsForPage(photosPerPage, countOnPage) {
  const templates = SLOT_TEMPLATES[photosPerPage]
  const capped = Math.min(countOnPage, photosPerPage)
  return templates[capped] || templates[photosPerPage]
}

export function slotToRect(slot, cols, rows, margin, gap, pageW, pageH) {
  const usableW = pageW - margin * 2
  const usableH = pageH - margin * 2
  const cellW = (usableW - gap * (cols - 1)) / cols
  const cellH = (usableH - gap * (rows - 1)) / rows

  const x = margin + slot.col * (cellW + gap)
  const y = margin + slot.row * (cellH + gap)
  const w = slot.colSpan * cellW + (slot.colSpan - 1) * gap
  const h = slot.rowSpan * cellH + (slot.rowSpan - 1) * gap

  return { x, y, cellW: w, cellH: h }
}
