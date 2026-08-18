import { useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

const DRAG_THRESHOLD = 6

// How many cards come before the pointer, reading the grid left to right, top to bottom.
function insertionIndexAtPoint(rects, x, y) {
  let index = 0

  rects.forEach(({ rect }) => {
    const inSameRow = y >= rect.top && y <= rect.bottom
    const centerX = rect.left + rect.width / 2
    if (y > rect.bottom || (inSameRow && x > centerX)) index++
  })

  return index
}

export default function SelectedPhotos({
  photos,
  onToggleSelect,
  onReorderSelected,
  onRotatePhoto,
  onDeselectAll,
  onOpenAlbum,
}) {
  const { t } = useLanguage()
  const gridRef = useRef(null)
  const dragRef = useRef(null)
  const [drag, setDrag] = useState(null)

  const selectedPhotos = photos.filter((p) => p.selected)

  if (selectedPhotos.length === 0) {
    return (
      <section className="photo-list">
        <h2>{t('selectedTitle')}</h2>
        <p className="empty-state">{t('selectedEmpty')}</p>
      </section>
    )
  }

  function measureCards() {
    const grid = gridRef.current
    if (!grid) return []
    return Array.from(grid.querySelectorAll('[data-photo-card]')).map((el) => ({
      id: el.dataset.photoCard,
      rect: el.getBoundingClientRect(),
    }))
  }

  function handlePointerDown(e, id) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    if (e.target.closest('button')) return

    // Touch needs the handle so a finger on the photo still scrolls the page.
    const fromHandle = Boolean(e.target.closest('[data-drag-handle]'))
    if (e.pointerType === 'touch' && !fromHandle) return

    const rects = measureCards()
    const fromIndex = rects.findIndex((item) => item.id === id)
    if (fromIndex === -1) return

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Without capture the drag still works while the pointer stays over the grid.
    }

    dragRef.current = {
      id,
      fromIndex,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      rects,
      active: false,
    }
  }

  function targetIndex(state, x, y) {
    const insertion = insertionIndexAtPoint(state.rects, x, y)
    return insertion > state.fromIndex ? insertion - 1 : insertion
  }

  function handlePointerMove(e) {
    const state = dragRef.current
    if (!state || state.pointerId !== e.pointerId) return

    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY

    if (!state.active) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      state.active = true
    }

    e.preventDefault()
    setDrag({
      id: state.id,
      dx,
      dy,
      toIndex: targetIndex(state, e.clientX, e.clientY),
    })
  }

  function handlePointerUp(e) {
    const state = dragRef.current
    if (!state || state.pointerId !== e.pointerId) return

    dragRef.current = null
    setDrag(null)
    if (!state.active) return

    const toIndex = targetIndex(state, e.clientX, e.clientY)
    if (toIndex !== state.fromIndex) {
      onReorderSelected(state.id, toIndex)
    }
  }

  function handlePointerCancel() {
    dragRef.current = null
    setDrag(null)
  }

  return (
    <section className="photo-list">
      <div className="list-header">
        <div>
          <h2>{t('selectedTitle')}</h2>
          <p className="section-desc">{t('selectedCount', selectedPhotos.length)}</p>
          <p className="drag-hint">{t('selectedDragHint')}</p>
        </div>
        <div className="list-actions">
          <button type="button" className="btn-select-all" onClick={onOpenAlbum}>
            {t('openAlbum')}
          </button>
          <button type="button" className="btn-remove-selected" onClick={onDeselectAll}>
            {t('deselectAll')}
          </button>
        </div>
      </div>

      <div
        className={`photo-grid photo-grid--sortable ${drag ? 'is-dragging' : ''}`}
        ref={gridRef}
      >
        {selectedPhotos.map((photo, index) => {
          const isGhost = drag?.id === photo.id
          const isOver = Boolean(drag) && !isGhost && drag.toIndex === index

          return (
            <div
              key={photo.id}
              data-photo-card={photo.id}
              className={[
                'photo-card',
                'selected',
                isGhost ? 'photo-card--ghost' : '',
                isOver ? 'drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                isGhost
                  ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.04)` }
                  : undefined
              }
              onPointerDown={(e) => handlePointerDown(e, photo.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
            >
              <span className="order-badge" aria-hidden="true">
                {index + 1}
              </span>

              <span
                className="drag-handle drag-handle--grab"
                data-drag-handle=""
                aria-hidden="true"
                title={t('dragHandle')}
              >
                ⠿
              </span>

              <button
                type="button"
                className="btn-remove"
                onClick={() => onToggleSelect(photo.id)}
                title={t('deselectPhoto')}
                aria-label={t('deselectPhoto')}
              >
                ✕
              </button>

              <img
                src={photo.url}
                alt={photo.name}
                draggable={false}
                style={{ transform: `rotate(${photo.rotation || 0}deg)` }}
              />

              <button
                type="button"
                className="btn-rotate"
                onClick={() => onRotatePhoto(photo.id)}
                title={t('rotatePhoto')}
                aria-label={t('rotatePhoto')}
              >
                ↻
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
