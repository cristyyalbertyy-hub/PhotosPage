import { layoutPage } from '../utils/pageLayout'

export default function AlbumPage({
  photos,
  aspects,
  photosPerPage,
  orientation,
  layoutMode,
  pageNumber,
  compact = false,
  selected = false,
  onSelect,
  fillLabel,
}) {
  const ready = photos.every((photo) => aspects[photo.id] != null)
  const photoAspects = photos.map((photo) => aspects[photo.id] ?? 1)
  const { rects, pageW, pageH, fillRatio } = layoutPage({
    aspects: photoAspects,
    photosPerPage,
    orientation,
    mode: layoutMode,
  })
  const isLandscape = orientation === 'landscape'
  const percent = Math.round(fillRatio * 100)

  const className = [
    'album-page',
    isLandscape ? 'album-page--landscape' : '',
    compact ? 'album-page--compact' : '',
    selected ? 'album-page--selected' : '',
    onSelect ? 'album-page--clickable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <div
        className="album-page-sheet"
        style={{ aspectRatio: `${pageW} / ${pageH}` }}
      >
        {!ready && (
          <div className="album-page-loading">
            <div className="spinner" />
          </div>
        )}
        {ready &&
          photos.map((photo, index) => {
            const rect = rects[index]
            if (!rect) return null
            return (
              <img
                key={photo.id}
                src={photo.url}
                alt={photo.name}
                className="album-photo"
                style={{
                  left: `${(rect.x / pageW) * 100}%`,
                  top: `${(rect.y / pageH) * 100}%`,
                  width: `${(rect.w / pageW) * 100}%`,
                  height: `${(rect.h / pageH) * 100}%`,
                }}
              />
            )
          })}
      </div>
      {(pageNumber != null || fillLabel) && (
        <span className="album-page-caption">
          {pageNumber != null && <span>{pageNumber}</span>}
          {fillLabel && ready && (
            <span className="album-page-fill">{fillLabel(percent)}</span>
          )}
        </span>
      )}
    </>
  )

  if (onSelect) {
    return (
      <div
        className={className}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
      >
        {content}
      </div>
    )
  }

  return <div className={className}>{content}</div>
}
