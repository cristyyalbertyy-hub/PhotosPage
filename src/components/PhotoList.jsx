import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { useLanguage } from '../i18n/LanguageContext'

export default function PhotoList({
  photos,
  onToggleSelect,
  onRemove,
  onSelectAll,
  onClearAll,
}) {
  const { t } = useLanguage()
  const [confirmOpen, setConfirmOpen] = useState(false)

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
    setConfirmOpen(false)
    await onClearAll()
  }

  return (
    <section className="photo-list">
      <div className="list-header">
        <div>
          <h2>{t('listTitle')}</h2>
          <p className="section-desc">
            {t('selectedOf', selectedCount, photos.length)}
          </p>
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
            className="btn-clear-all"
            onClick={() => setConfirmOpen(true)}
          >
            {t('clearAll')}
          </button>
        </div>
      </div>

      <div className="photo-grid">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`photo-card ${photo.selected ? 'selected' : ''}`}
          >
            <button
              type="button"
              className="btn-remove"
              onClick={() => onRemove(photo.id)}
              title={t('removePhoto')}
              aria-label={t('removePhoto')}
            >
              ✕
            </button>

            <img src={photo.url} alt={photo.name} />

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
        open={confirmOpen}
        title={t('confirmClearTitle')}
        message={t('confirmClearMessage')}
        confirmLabel={t('confirmYes')}
        cancelLabel={t('confirmNo')}
        onConfirm={handleConfirmClear}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  )
}
