import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

export default function SelectedPhotos({
  photos,
  onToggleSelect,
  onReorderSelected,
  onRotatePhoto,
  onDeselectAll,
  onOpenAlbum,
}) {
  const { t } = useLanguage()
  const [draggedId, setDraggedId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null)

  const selectedPhotos = photos.filter((p) => p.selected)

  if (selectedPhotos.length === 0) {
    return (
      <section className="photo-list">
        <h2>{t('selectedTitle')}</h2>
        <p className="empty-state">{t('selectedEmpty')}</p>
      </section>
    )
  }

  function handleDragStart(e, id) {
    if (e.target.closest('button')) {
      e.preventDefault()
      return
    }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
    setDraggedId(id)
  }

  function handleDragOver(e, id) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggedId) setDropTargetId(id)
  }

  function handleDragLeave(e, id) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTargetId((prev) => (prev === id ? null : prev))
    }
  }

  function handleDrop(e, targetId) {
    e.preventDefault()
    if (draggedId && targetId && draggedId !== targetId) {
      onReorderSelected(draggedId, targetId)
    }
    setDraggedId(null)
    setDropTargetId(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDropTargetId(null)
  }

  function moveStep(index, delta) {
    const target = selectedPhotos[index + delta]
    if (!target) return
    onReorderSelected(selectedPhotos[index].id, target.id)
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

      <div className="photo-grid">
        {selectedPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className={[
              'photo-card',
              'selected',
              draggedId === photo.id ? 'dragging' : '',
              dropTargetId === photo.id ? 'drop-target' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable
            onDragStart={(e) => handleDragStart(e, photo.id)}
            onDragOver={(e) => handleDragOver(e, photo.id)}
            onDragLeave={(e) => handleDragLeave(e, photo.id)}
            onDrop={(e) => handleDrop(e, photo.id)}
            onDragEnd={handleDragEnd}
          >
            <span className="order-badge" aria-hidden="true">
              {index + 1}
            </span>

            <span className="drag-handle" aria-hidden="true" title={t('dragHandle')}>
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

            <div className="photo-steps">
              <button
                type="button"
                onClick={() => moveStep(index, -1)}
                disabled={index === 0}
                title={t('moveEarlier')}
                aria-label={t('moveEarlier')}
              >
                ◀
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, 1)}
                disabled={index === selectedPhotos.length - 1}
                title={t('moveLater')}
                aria-label={t('moveLater')}
              >
                ▶
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
