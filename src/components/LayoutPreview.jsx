import { getSlotsForPage, LAYOUT_META } from '../utils/pdfLayouts'

export default function LayoutPreview({ photosPerPage, photoCount, orientation = 'portrait' }) {
  const layout = LAYOUT_META[photosPerPage]
  const countOnPage = Math.min(photoCount || photosPerPage, photosPerPage)
  const slots = getSlotsForPage(photosPerPage, countOnPage)
  const isLandscape = orientation === 'landscape'

  return (
    <div className="layout-preview">
      <p className="layout-label">
        {layout.label} — {isLandscape ? 'paisagem' : 'retrato'}
      </p>
      <div
        className={`layout-page ${isLandscape ? 'layout-page--landscape' : ''}`}
      >
        {Array.from({ length: layout.cols * layout.rows }).map((_, i) => {
          const col = i % layout.cols
          const row = Math.floor(i / layout.cols)
          return (
            <div
              key={`bg-${i}`}
              className="layout-cell-bg"
              style={{
                left: `${(col / layout.cols) * 100}%`,
                top: `${(row / layout.rows) * 100}%`,
                width: `${100 / layout.cols}%`,
                height: `${100 / layout.rows}%`,
              }}
            />
          )
        })}
        {slots.map((slot, i) => (
          <div
            key={i}
            className="layout-cell filled"
            style={{
              left: `${(slot.col / layout.cols) * 100}%`,
              top: `${(slot.row / layout.rows) * 100}%`,
              width: `${(slot.colSpan / layout.cols) * 100}%`,
              height: `${(slot.rowSpan / layout.rows) * 100}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
