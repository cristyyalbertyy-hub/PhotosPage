import { useRef, useState } from 'react'
import { clampScale, layoutPage, rotatedAspect } from '../utils/pageLayout'

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
  onMoveToPage,
  onReorderPhotos,
  onRotatePhoto,
  onCaptionChange,
  onSetCover,
  onScaleChange,
  pageIndex,
  rotateLabel,
  coverLabel,
  captionPlaceholder,
  dropLabel,
  resizeLabel,
}) {
  const resizeRef = useRef(null)
  const [resizing, setResizing] = useState(null)

  const ready = photos.every((photo) => aspects[photo.id] != null)
  const photoAspects = photos.map((photo) =>
    rotatedAspect(aspects[photo.id] ?? 1, photo.rotation ?? 0),
  )
  const scales = photos.map((photo) =>
    resizing?.id === photo.id ? resizing.scale : photo.scale ?? 1,
  )
  const { rects, baseRects, pageW, pageH, fillRatio } = layoutPage({
    aspects: photoAspects,
    photosPerPage,
    orientation,
    mode: layoutMode,
    scales,
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

  function handleDragStart(event, photoId) {
    if (event.target.closest('button, input')) {
      event.preventDefault()
      return
    }
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', photoId)
  }

  function handleDragOver(event) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  function handleDropOnPage(event) {
    event.preventDefault()
    event.stopPropagation()
    const photoId = event.dataTransfer.getData('text/plain')
    if (photoId && onMoveToPage && pageIndex != null) {
      onMoveToPage(photoId, pageIndex)
    }
  }

  function handleResizeDown(event, photo, index) {
    const sheet = event.currentTarget.closest('.album-page-sheet')
    const base = baseRects[index]
    if (!sheet || !base) return

    event.preventDefault()
    event.stopPropagation()

    const pxPerMm = sheet.getBoundingClientRect().width / pageW
    const baseW = base.w * pxPerMm
    const baseH = base.h * pxPerMm
    const diagonal = Math.hypot(baseW, baseH) || 1
    const startScale = photo.scale ?? 1

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Without capture the resize still follows the pointer over the sheet.
    }

    resizeRef.current = {
      id: photo.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScale,
      scale: startScale,
      // Unit vector along the photo diagonal, so the corner follows the pointer.
      dirX: baseW / diagonal,
      dirY: baseH / diagonal,
      diagonal,
    }
    setResizing({ id: photo.id, scale: startScale })
  }

  function handleResizeMove(event) {
    const state = resizeRef.current
    if (!state || state.pointerId !== event.pointerId) return

    event.preventDefault()
    const along =
      (event.clientX - state.startX) * state.dirX +
      (event.clientY - state.startY) * state.dirY
    // The photo grows from its centre, so the corner moves half of the growth.
    const scale = clampScale(state.startScale + (2 * along) / state.diagonal)

    state.scale = scale
    setResizing({ id: state.id, scale })
  }

  function handleResizeUp(event) {
    const state = resizeRef.current
    if (!state || state.pointerId !== event.pointerId) return

    resizeRef.current = null
    setResizing(null)
    if (state.scale !== state.startScale) onScaleChange(state.id, state.scale)
  }

  function handleResizeCancel() {
    resizeRef.current = null
    setResizing(null)
  }

  function handleDropOnPhoto(event, targetId) {
    event.preventDefault()
    event.stopPropagation()
    const photoId = event.dataTransfer.getData('text/plain')
    if (photoId && targetId && photoId !== targetId && onReorderPhotos) {
      onReorderPhotos(photoId, targetId)
    }
  }

  return (
    <div
      className={className}
      onDragOver={onMoveToPage ? handleDragOver : undefined}
      onDrop={onMoveToPage ? handleDropOnPage : undefined}
    >
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
            const rotation = photo.rotation ?? 0
            const swapped = rotation % 180 === 90
            const fillScale = swapped
              ? Math.max(rect.w / rect.h, rect.h / rect.w)
              : 1
            return (
              <div
                key={photo.id}
                className="album-photo-wrap"
                draggable={!compact}
                onDragStart={(event) => handleDragStart(event, photo.id)}
                onDragOver={handleDragOver}
                onDrop={(event) => handleDropOnPhoto(event, photo.id)}
                style={{
                  left: `${(rect.x / pageW) * 100}%`,
                  top: `${(rect.y / pageH) * 100}%`,
                  width: `${(rect.w / pageW) * 100}%`,
                  height: `${(rect.h / pageH) * 100}%`,
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="album-photo"
                  draggable={false}
                  style={{
                    transform: `rotate(${rotation}deg) scale(${fillScale})`,
                  }}
                />
                {!compact && (
                  <div className="album-photo-actions">
                    {onRotatePhoto && (
                      <button
                        type="button"
                        className="album-photo-btn"
                        onClick={(event) => {
                          event.stopPropagation()
                          onRotatePhoto(photo.id)
                        }}
                        title={rotateLabel}
                        aria-label={rotateLabel}
                      >
                        ↻
                      </button>
                    )}
                    {onSetCover && (
                      <button
                        type="button"
                        className="album-photo-btn"
                        onClick={(event) => {
                          event.stopPropagation()
                          onSetCover(photo.id)
                        }}
                        title={coverLabel}
                        aria-label={coverLabel}
                      >
                        ★
                      </button>
                    )}
                  </div>
                )}
                {!compact && onScaleChange && (
                  <>
                    {(resizing?.id === photo.id || scales[index] !== 1) && (
                      <span className="album-photo-scale" aria-hidden="true">
                        {Math.round(scales[index] * 100)}%
                      </span>
                    )}
                    <button
                      type="button"
                      className="album-photo-resize"
                      title={resizeLabel}
                      aria-label={resizeLabel}
                      onPointerDown={(event) => handleResizeDown(event, photo, index)}
                      onPointerMove={handleResizeMove}
                      onPointerUp={handleResizeUp}
                      onPointerCancel={handleResizeCancel}
                      onDoubleClick={() => onScaleChange(photo.id, 1)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      ◢
                    </button>
                  </>
                )}
                {!compact && onCaptionChange && (
                  <input
                    className={`album-photo-caption ${onScaleChange ? 'album-photo-caption--inset' : ''}`}
                    value={photo.caption || ''}
                    maxLength={40}
                    placeholder={captionPlaceholder}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onCaptionChange(photo.id, event.target.value)}
                  />
                )}
              </div>
            )
          })}
        {compact && onMoveToPage && (
          <span className="album-drop-hint" aria-hidden="true">
            {dropLabel}
          </span>
        )}
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
          {!compact && <span>{included ? includeLabel : excludeLabel}</span>}
        </button>
      )}
    </div>
  )
}
