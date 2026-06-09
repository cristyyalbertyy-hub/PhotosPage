import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { useLanguage } from '../i18n/LanguageContext'

export default function PhotoList({
  photos,
  onToggleSelect,
  onRemove,
  onSelectAll,
  onClearAll,
  onRemoveSelected,
  onReorder,
}) {
  const { t } = useLanguage()
  const [confirmClearOpen, setConfirmClearOpen] = useState(false)
  const [confirmRemoveSelectedOpen, setConfirmRemoveSelectedOpen] = useState(false)
  const [draggedId, setDraggedId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null)

  if (photos.length === 0) {
    return (
      <section className="photo-list">
        <h2>{t('listTitle')}</h2>
        <p className="empty-state">{t('listEmpty')}</p>
      </section>
    )
  }

  const selectedCount = photos.filter((p) => p.selected).length
  const allSelected = selectedCount === photos.length

  async function handleConfirmClear() {
    setConfirmClearOpen(false)
    await onClearAll()
  }

  async function handleConfirmRemoveSelected() {
    setConfirmRemoveSelectedOpen(false)
    const ids = photos.filter((p) => p.selected).map((p) => p.id)
    await onRemoveSelected(ids)
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
      onReorder(draggedId, targetId)
    }
    setDraggedId(null)
    setDropTargetId(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDropTargetId(null)
  }

  return (
    <section className="photo-list">
      <div className="list-header">
        <div>
          <h2>{t('listTitle')}</h2>
          <p className="section-desc">
            {t('selectedOf', selectedCount, photos.length)}
          </p>
          <p className="drag-hint">{t('dragToReorder')}</p>
        </div>
        <div className="list-actions">
          <button
            type="button"
            className="btn-select-all"
            onClick={() => onSelectAll(!allSelected)}
          >
            {allSelected ? t('deselectAll') : t('selectAll')}
          </button>
          <button
            type="button"
            className="btn-remove-selected"
            onClick={() => setConfirmRemoveSelectedOpen(true)}
            disabled={selectedCount === 0}
          >
            {t('removeSelected')}
          </button>
          <button
            type="button"
            className="btn-clear-all"
            onClick={() => setConfirmClearOpen(true)}
          >
            {t('clearAll')}
          </button>
        </div>
      </div>

      <div className="photo-grid">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={[
              'photo-card',
              photo.selected ? 'selected' : '',
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
              onClick={() => onRemove(photo.id)}
              title={t('removePhoto')}
              aria-label={t('removePhoto')}
            >
              ✕
            </button>

            <img src={photo.url} alt={photo.name} draggable={false} />

            <button
              type="button"
              className={`select-box ${photo.selected ? 'checked' : ''}`}
              onClick={() => onToggleSelect(photo.id)}
              title={photo.selected ? t('deselectPhoto') : t('selectForPrint')}
              aria-label={
                photo.selected ? t('deselectPhoto') : t('selectForPrint')
              }
              aria-pressed={photo.selected}
            >
              {photo.selected && <span className="check-mark">✓</span>}
            </button>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmRemoveSelectedOpen}
        title={t('confirmRemoveSelectedTitle', selectedCount)}
        message={t('confirmRemoveSelectedMessage')}
        confirmLabel={t('confirmRemoveSelectedYes')}
        cancelLabel={t('confirmNo')}
        onConfirm={handleConfirmRemoveSelected}
        onCancel={() => setConfirmRemoveSelectedOpen(false)}
      />

      <ConfirmDialog
        open={confirmClearOpen}
        title={t('confirmClearTitle')}
        message={t('confirmClearMessage')}
        confirmLabel={t('confirmYes')}
        cancelLabel={t('confirmNo')}
        onConfirm={handleConfirmClear}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </section>
  )
}
