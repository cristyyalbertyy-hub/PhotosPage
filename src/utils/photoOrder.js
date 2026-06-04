export function applyCustomOrder(photos, orderDraft) {
  const entries = photos.map((photo) => {
    const raw = orderDraft[photo.id]?.trim()
    const num = raw ? parseInt(raw, 10) : null
    return { photo, num: num && num > 0 ? num : null }
  })

  const numbered = entries.filter((e) => e.num !== null)
  const unnumbered = entries.filter((e) => e.num === null)

  const nums = numbered.map((e) => e.num)
  if (new Set(nums).size !== nums.length) {
    throw new Error('Cada número só pode ser usado uma vez')
  }

  numbered.sort((a, b) => a.num - b.num)

  return [...numbered, ...unnumbered].map((entry, index) => ({
    ...entry.photo,
    sortOrder: index,
  }))
}
