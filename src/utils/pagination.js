import { layoutPage } from './pageLayout'

export const MAX_PER_PAGE = 8

// Beyond this the search is not worth the wait, so the sheets stay uniform.
const MAX_PHOTOS = 200
// How far a sheet may stray from the number of photos asked for.
const DEFAULT_SPREAD = 2

export function fixedPageSizes(count, perPage) {
  const sizes = []
  for (let i = 0; i < count; i += perPage) {
    sizes.push(Math.min(perPage, count - i))
  }
  return sizes
}

export function chunkBySizes(items, sizes) {
  const pages = []
  let index = 0

  for (const size of sizes) {
    if (index >= items.length) break
    pages.push(items.slice(index, index + size))
    index += size
  }
  if (index < items.length) pages.push(items.slice(index))

  return pages
}

/**
 * Chooses how many photos go on each sheet, keeping the album order and the
 * number of sheets, so that portrait and landscape photos end up on the sheets
 * where they leave the least white space.
 */
export function pageSizesByFill({
  aspects,
  perPage,
  orientation,
  spread = DEFAULT_SPREAD,
}) {
  const count = aspects.length
  const target = Math.min(Math.max(Math.round(perPage) || 4, 1), MAX_PER_PAGE)
  if (count === 0) return []

  const pageCount = Math.ceil(count / target)
  const fallback = () => fixedPageSizes(count, target)
  if (pageCount === 1 || count > MAX_PHOTOS) return fallback()

  const minSize = Math.max(1, target - spread)
  const maxSize = Math.min(MAX_PER_PAGE, target + spread)

  const cache = new Map()
  function fillOf(start, size) {
    const key = `${start}:${size}`
    if (!cache.has(key)) {
      const { fillRatio } = layoutPage({
        aspects: aspects.slice(start, start + size),
        photosPerPage: size,
        orientation,
        mode: 'fill',
      })
      cache.set(key, fillRatio)
    }
    return cache.get(key)
  }

  // best[sheetsLeft][firstPhoto] = most filled sheets achievable from there.
  const best = Array.from({ length: pageCount + 1 }, () =>
    new Float64Array(count + 1).fill(Number.NEGATIVE_INFINITY),
  )
  const chosen = Array.from({ length: pageCount + 1 }, () =>
    new Int8Array(count + 1),
  )
  best[0][count] = 0

  for (let sheets = 1; sheets <= pageCount; sheets++) {
    for (let start = count - 1; start >= 0; start--) {
      let bestScore = Number.NEGATIVE_INFINITY
      let bestSize = 0
      const limit = Math.min(maxSize, count - start)

      for (let size = minSize; size <= limit; size++) {
        const rest = best[sheets - 1][start + size]
        if (rest === Number.NEGATIVE_INFINITY) continue
        // The nudge only breaks ties, keeping sheets near the chosen number.
        const score = fillOf(start, size) - 0.001 * Math.abs(size - target) + rest
        if (score > bestScore) {
          bestScore = score
          bestSize = size
        }
      }

      best[sheets][start] = bestScore
      chosen[sheets][start] = bestSize
    }
  }

  if (best[pageCount][0] === Number.NEGATIVE_INFINITY) return fallback()

  const sizes = []
  let start = 0
  for (let sheets = pageCount; sheets > 0; sheets--) {
    const size = chosen[sheets][start]
    if (!size) return fallback()
    sizes.push(size)
    start += size
  }

  function totalFill(pageSizes) {
    let total = 0
    let offset = 0
    for (const size of pageSizes) {
      total += fillOf(offset, size)
      offset += size
    }
    return total
  }

  // Uniform sheets can still win, for instance when the leftover photo happens
  // to fill a page on its own. Only change the split when it gains something.
  const uniform = fallback()
  return totalFill(sizes) > totalFill(uniform) ? sizes : uniform
}
