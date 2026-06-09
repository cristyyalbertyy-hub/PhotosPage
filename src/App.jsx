import { useEffect, useRef, useState } from 'react'
import PhotoEntry from './components/PhotoEntry'
import PhotoList from './components/PhotoList'
import PrintPanel from './components/PrintPanel'
import { useLanguage } from './i18n/LanguageContext'
import {
  clearAllPhotos,
  deletePhoto,
  loadPhotos,
  saveAllSelections,
  savePhoto,
  savePhotoOrder,
} from './utils/photoStorage'
import './App.css'

function App() {
  const { lang, setLang, t } = useLanguage()
  const [photos, setPhotos] = useState([])
  const [activeTab, setActiveTab] = useState('entrada')
  const [loading, setLoading] = useState(true)
  const photosRef = useRef([])

  photosRef.current = photos

  useEffect(() => {
    loadPhotos()
      .then((loaded) => {
        setPhotos(loaded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [])

  async function handleAddMany(items) {
    if (items.length === 0) return

    setPhotos((prev) => {
      const batch = items.map((item, i) => ({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(item.blob),
        name: item.name,
        selected: false,
        blob: item.blob,
        addedAt: Date.now() + i,
        sortOrder: prev.length + i,
      }))
      batch.forEach((p) => savePhoto(p))
      return [...prev, ...batch]
    })
  }

  async function handleToggleSelect(id) {
    setPhotos((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, selected: !p.selected } : p,
      )
      saveAllSelections(updated)
      return updated
    })
  }

  async function handleSelectAll(selected) {
    setPhotos((prev) => {
      const updated = prev.map((p) => ({ ...p, selected }))
      saveAllSelections(updated)
      return updated
    })
  }

  async function handleRemove(id) {
    let reordered = []
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo) URL.revokeObjectURL(photo.url)
      reordered = prev
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, sortOrder: i }))
      return reordered
    })
    await deletePhoto(id)
    await savePhotoOrder(reordered)
  }

  async function handleClearAll() {
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    await clearAllPhotos()
    setPhotos([])
  }

  async function handleReorder(fromId, toId) {
    let reordered = null

    setPhotos((prev) => {
      const fromIndex = prev.findIndex((p) => p.id === fromId)
      const toIndex = prev.findIndex((p) => p.id === toId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev
      }

      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      reordered = next.map((p, i) => ({ ...p, sortOrder: i }))
      return reordered
    })

    if (reordered) await savePhotoOrder(reordered)
  }

  async function handleRemoveSelected(ids) {
    if (ids.length === 0) return

    const idSet = new Set(ids)
    let reordered = []

    setPhotos((prev) => {
      prev.filter((p) => idSet.has(p.id)).forEach((p) => URL.revokeObjectURL(p.url))
      reordered = prev
        .filter((p) => !idSet.has(p.id))
        .map((p, i) => ({ ...p, sortOrder: i }))
      return reordered
    })

    await Promise.all(ids.map((id) => deletePhoto(id)))
    await savePhotoOrder(reordered)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">
          <div className="spinner" />
          <p>{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <h1>{t('appTitle')}</h1>
          <div className="lang-toggle" role="group" aria-label="Language">
            <button
              type="button"
              className={`lang-btn ${lang === 'pt' ? 'active' : ''}`}
              onClick={() => setLang('pt')}
            >
              PT
            </button>
            <button
              type="button"
              className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
              onClick={() => setLang('en')}
            >
              EN
            </button>
          </div>
        </div>
        <p className="subtitle">{t('subtitle')}</p>
        {photos.length > 0 && (
          <p className="persist-hint">{t('persistHint')}</p>
        )}
      </header>

      <nav className="menu">
        <button
          type="button"
          className={`menu-btn ${activeTab === 'entrada' ? 'active' : ''}`}
          onClick={() => setActiveTab('entrada')}
        >
          📷 {t('tabEntry')}
        </button>
        <button
          type="button"
          className={`menu-btn ${activeTab === 'lista' ? 'active' : ''}`}
          onClick={() => setActiveTab('lista')}
        >
          🖼️ {t('tabList')}
          {photos.length > 0 && <span className="badge">{photos.length}</span>}
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'entrada' && <PhotoEntry onAddMany={handleAddMany} />}

        {activeTab === 'lista' && (
          <>
            <PhotoList
              photos={photos}
              onToggleSelect={handleToggleSelect}
              onRemove={handleRemove}
              onSelectAll={handleSelectAll}
              onClearAll={handleClearAll}
              onRemoveSelected={handleRemoveSelected}
              onReorder={handleReorder}
            />
            <PrintPanel photos={photos} />
          </>
        )}
      </main>
    </div>
  )
}

export default App
