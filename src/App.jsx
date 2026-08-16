import { useEffect, useRef, useState } from 'react'
import AlbumSwitcher from './components/AlbumSwitcher'
import PhotoEntry from './components/PhotoEntry'
import PhotoList from './components/PhotoList'
import PrintPanel from './components/PrintPanel'
import { useLanguage } from './i18n/LanguageContext'
import {
  clearAlbumPhotos,
  createAlbumRecord,
  deleteAlbumRecord,
  deletePhoto,
  loadAlbumPhotos,
  loadWorkspace,
  saveAlbum,
  saveAllSelections,
  savePhoto,
  savePhotoOrder,
  setCurrentAlbumId,
} from './utils/photoStorage'
import './App.css'

function App() {
  const { lang, setLang, t } = useLanguage()
  const [albums, setAlbums] = useState([])
  const [currentAlbumId, setCurrentAlbumIdState] = useState(null)
  const [photos, setPhotos] = useState([])
  const [activeTab, setActiveTab] = useState('entrada')
  const [loading, setLoading] = useState(true)
  const photosRef = useRef([])

  photosRef.current = photos
  const currentAlbum = albums.find((album) => album.id === currentAlbumId) || null

  useEffect(() => {
    loadWorkspace(lang)
      .then(({ albums: loadedAlbums, currentAlbumId: albumId, photos: loaded }) => {
        setAlbums(loadedAlbums)
        setCurrentAlbumIdState(albumId)
        setPhotos(loaded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    return () => {
      photosRef.current.forEach((p) => URL.revokeObjectURL(p.url))
    }
  }, [])

  async function switchAlbum(albumId) {
    if (albumId === currentAlbumId) return
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.url))
    setCurrentAlbumId(albumId)
    setCurrentAlbumIdState(albumId)
    const loaded = await loadAlbumPhotos(albumId)
    setPhotos(loaded)
  }

  async function handleCreateAlbum() {
    const index = albums.length + 1
    const album = createAlbumRecord(
      lang === 'en' ? `Album ${index}` : `Álbum ${index}`,
      lang,
    )
    await saveAlbum(album)
    setAlbums((prev) => [...prev, album])
    await switchAlbum(album.id)
  }

  async function handleRenameAlbum(name) {
    if (!currentAlbum) return
    const updated = { ...currentAlbum, name }
    setAlbums((prev) => prev.map((album) => (album.id === updated.id ? updated : album)))
    await saveAlbum(updated)
  }

  async function handleDeleteAlbum() {
    if (!currentAlbum || albums.length <= 1) return
    const removedId = currentAlbum.id
    photos.forEach((p) => URL.revokeObjectURL(p.url))
    await deleteAlbumRecord(removedId)
    const remaining = albums.filter((album) => album.id !== removedId)
    setAlbums(remaining)
    await switchAlbum(remaining[0].id)
  }

  async function handleUpdateAlbum(patch) {
    if (!currentAlbum) return
    const updated = { ...currentAlbum, ...patch, updatedAt: Date.now() }
    setAlbums((prev) => prev.map((album) => (album.id === updated.id ? updated : album)))
    await saveAlbum(updated)
  }

  async function handleAddMany(items) {
    if (items.length === 0 || !currentAlbumId) return

    setPhotos((prev) => {
      const batch = items.map((item, i) => ({
        id: crypto.randomUUID(),
        albumId: currentAlbumId,
        url: URL.createObjectURL(item.blob),
        name: item.name,
        selected: false,
        blob: item.blob,
        addedAt: Date.now() + i,
        sortOrder: prev.length + i,
        rotation: 0,
        caption: '',
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
    await clearAlbumPhotos(currentAlbumId)
    setPhotos([])
  }

  async function persistReorder(next) {
    const reordered = next.map((p, i) => ({ ...p, sortOrder: i }))
    setPhotos(reordered)
    await savePhotoOrder(reordered)
  }

  async function handleReorder(fromId, toId) {
    const fromIndex = photos.findIndex((p) => p.id === fromId)
    const toIndex = photos.findIndex((p) => p.id === toId)
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

    const next = [...photos]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    await persistReorder(next)
  }

  async function handleMoveToPage(photoId, targetPageIndex) {
    const perPage = currentAlbum?.photosPerPage || 4
    const selected = photos.filter((p) => p.selected)
    const from = selected.findIndex((p) => p.id === photoId)
    if (from === -1) return

    const nextSelected = [...selected]
    const [moved] = nextSelected.splice(from, 1)
    let insertAt = Math.min(targetPageIndex * perPage, nextSelected.length)
    if (from < insertAt) insertAt = Math.max(0, insertAt - 1)
    nextSelected.splice(insertAt, 0, moved)

    let selectedIndex = 0
    const next = photos.map((photo) => {
      if (!photo.selected) return photo
      return nextSelected[selectedIndex++]
    })
    await persistReorder(next)
  }

  async function handleRotatePhoto(id) {
    setPhotos((prev) => {
      const updated = prev.map((p) =>
        p.id === id ? { ...p, rotation: ((p.rotation || 0) + 90) % 360 } : p,
      )
      const photo = updated.find((p) => p.id === id)
      if (photo) savePhoto(photo)
      return updated
    })
  }

  async function handleCaptionChange(id, caption) {
    setPhotos((prev) => {
      const updated = prev.map((p) => (p.id === id ? { ...p, caption } : p))
      const photo = updated.find((p) => p.id === id)
      if (photo) savePhoto(photo)
      return updated
    })
  }

  async function handleSetCover(photoId) {
    await handleUpdateAlbum({ coverPhotoId: photoId })
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

  const selectedCount = photos.filter((p) => p.selected).length

  if (loading || !currentAlbum) {
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
        <AlbumSwitcher
          albums={albums}
          currentAlbumId={currentAlbumId}
          onSwitch={switchAlbum}
          onCreate={handleCreateAlbum}
          onRename={handleRenameAlbum}
          onDelete={handleDeleteAlbum}
        />
        {photos.length > 0 && <p className="persist-hint">{t('persistHint')}</p>}
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
        <button
          type="button"
          className={`menu-btn ${activeTab === 'album' ? 'active' : ''}`}
          onClick={() => setActiveTab('album')}
        >
          📖 {t('tabAlbum')}
          {selectedCount > 0 && <span className="badge">{selectedCount}</span>}
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'entrada' && <PhotoEntry onAddMany={handleAddMany} />}

        {activeTab === 'lista' && (
          <PhotoList
            photos={photos}
            onToggleSelect={handleToggleSelect}
            onRemove={handleRemove}
            onSelectAll={handleSelectAll}
            onClearAll={handleClearAll}
            onRemoveSelected={handleRemoveSelected}
            onReorder={handleReorder}
            onRotatePhoto={handleRotatePhoto}
          />
        )}

        {activeTab === 'album' && (
          <PrintPanel
            photos={photos}
            album={currentAlbum}
            onUpdateAlbum={handleUpdateAlbum}
            onMoveToPage={handleMoveToPage}
            onReorderPhotos={handleReorder}
            onRotatePhoto={handleRotatePhoto}
            onCaptionChange={handleCaptionChange}
            onSetCover={handleSetCover}
          />
        )}
      </main>
    </div>
  )
}

export default App
