export default function CoverSheet({
  title,
  date,
  coverPhoto,
  rotation = 0,
  orientation,
  compact = false,
  selected = false,
  onSelect,
  included = true,
  onToggleIncluded,
  includeLabel,
  excludeLabel,
  pageNumber,
  onTitleChange,
  onDateChange,
  titlePlaceholder,
  datePlaceholder,
  emptyHint,
  onMoveToCover,
}) {
  const isLandscape = orientation === 'landscape'
  const pageW = isLandscape ? 297 : 210
  const pageH = isLandscape ? 210 : 297

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

  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(event) {
    event.preventDefault()
    event.stopPropagation()
    const photoId = event.dataTransfer.getData('text/plain')
    if (photoId && onMoveToCover) onMoveToCover(photoId)
  }

  return (
    <div
      className={className}
      onDragOver={onMoveToCover ? handleDragOver : undefined}
      onDrop={onMoveToCover ? handleDrop : undefined}
    >
      <div
        className="album-page-sheet album-cover-sheet"
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
        {compact ? (
          <div className="album-cover-mini">
            <strong>{title || '★'}</strong>
            {date ? <span>{date}</span> : null}
          </div>
        ) : (
          <div className="album-cover-content">
            <input
              className="album-cover-title"
              value={title}
              onChange={(event) => onTitleChange?.(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              placeholder={titlePlaceholder}
              maxLength={60}
            />
            <input
              className="album-cover-date"
              value={date}
              onChange={(event) => onDateChange?.(event.target.value)}
              onClick={(event) => event.stopPropagation()}
              placeholder={datePlaceholder}
              maxLength={40}
            />
            {coverPhoto ? (
              <img
                src={coverPhoto.url}
                alt={coverPhoto.name}
                className="album-cover-photo"
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            ) : (
              <p className="album-cover-empty">{emptyHint}</p>
            )}
          </div>
        )}
      </div>
      {pageNumber != null && (
        <span className="album-page-caption">
          <span>{pageNumber}</span>
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
          {!compact && <span>{included ? includeLabel : excludeLabel}</span>}
        </button>
      )}
    </div>
  )
}
