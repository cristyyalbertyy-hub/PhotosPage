import { useRef, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

function createPendingItem(file) {
  return {
    id: crypto.randomUUID(),
    blob: file,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
  }
}

export default function PhotoEntry({ onAddMany }) {
  const { t } = useLanguage()
  const inputRef = useRef(null)
  const [pending, setPending] = useState([])
  const [addedHint, setAddedHint] = useState('')

  function addFiles(fileList) {
    const images = [...fileList].filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) return

    setPending((prev) => [...prev, ...images.map(createPendingItem)])
    setAddedHint('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleFileChange(e) {
    if (e.target.files?.length) addFiles(e.target.files)
  }

  function handleDrop(e) {
    e.preventDefault()
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  function removePending(id) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }

  function clearPending() {
    pending.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPending([])
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleAddAll() {
    if (pending.length === 0) return

    const n = pending.length
    onAddMany(pending.map((p) => ({ blob: p.blob, name: p.name })))
    pending.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPending([])
    if (inputRef.current) inputRef.current.value = ''

    setAddedHint(t('addedHint', n))
  }

  return (
    <section className="photo-entry">
      <h2>{t('entryTitle')}</h2>
      <p className="section-desc">{t('entryDesc')}</p>

      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="drop-placeholder">
          <span className="drop-icon">📷</span>
          <span>{t('dropHint')}</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          hidden
        />
      </div>

      {pending.length > 0 && (
        <>
          <div className="pending-header">
            <p className="pending-count">{t('pendingCount', pending.length)}</p>
            <button
              type="button"
              className="btn-clear-pending"
              onClick={clearPending}
            >
              {t('clearPending')}
            </button>
          </div>

          <div className="pending-grid">
            {pending.map((item) => (
              <div key={item.id} className="pending-card">
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removePending(item.id)}
                  title={t('removeFromSelection')}
                  aria-label={t('removeFromSelection')}
                >
                  ✕
                </button>
                <img src={item.previewUrl} alt={item.name} />
                <p className="pending-name">{item.name}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {addedHint && <p className="add-hint">{addedHint}</p>}

      <button
        type="button"
        className="btn-add"
        onClick={handleAddAll}
        disabled={pending.length === 0}
        title={t('addToCollection')}
      >
        <span className="plus">+</span>
        {pending.length > 0
          ? t('addPhotos', pending.length)
          : t('addToCollection')}
      </button>
    </section>
  )
}
