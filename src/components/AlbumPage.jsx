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
  included = true,
  onToggleIncluded,
  includeLabel,
  excludeLabel,
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
    included ? '' : 'album-page--excluded',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <div
        className="album-page-sheet"
        style={{ aspectRatio: `${pageW} / ${pageH}` }}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onClick={onSelect}
        onKeyDown={
          onSelect
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect()
                }
              }
            : undefined
        }
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
      {onToggleIncluded && (
        <button
          type="button"
          className={`album-page-include ${included ? 'album-page-include--yes' : 'album-page-include--no'}`}
          onClick={(event) => {
            event.stopPropagation()
            onToggleIncluded()
          }}
          aria-pressed={included}
          aria-label={included ? includeLabel : excludeLabel}
          title={included ? includeLabel : excludeLabel}
        >
          <span aria-hidden="true">{included ? '✓' : '✕'}</span>
          {!compact && (
            <span>{included ? includeLabel : excludeLabel}</span>
          )}
        </button>
      )}
    </div>
  )
}
