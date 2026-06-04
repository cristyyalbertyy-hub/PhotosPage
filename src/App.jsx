import { useEffect, useRef, useState } from 'react'
import PhotoEntry from './components/PhotoEntry'
import PhotoList from './components/PhotoList'
import PrintPanel from './components/PrintPanel'
import {
  deletePhoto,
  loadPhotos,
  saveAllSelections,
  savePhoto,
  savePhotoOrder,
} from './utils/photoStorage'
import './App.css'

function App() {
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

  async function handleApplyOrder(reordered) {
    setPhotos(reordered)
    await savePhotoOrder(reordered)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-state">
          <div className="spinner" />
          <p>A carregar fotos guardadas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Photos Page</h1>
        <p className="subtitle">Adicione, organize e exporte as suas fotos em PDF</p>
        {photos.length > 0 && (
          <p className="persist-hint">As fotos ficam guardadas neste browser</p>
        )}
      </header>

      <nav className="menu">
        <button
          type="button"
          className={`menu-btn ${activeTab === 'entrada' ? 'active' : ''}`}
          onClick={() => setActiveTab('entrada')}
        >
          📷 Entrada de Fotos
        </button>
        <button
          type="button"
          className={`menu-btn ${activeTab === 'lista' ? 'active' : ''}`}
          onClick={() => setActiveTab('lista')}
        >
          🖼️ Lista de Fotos
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
              onApplyOrder={handleApplyOrder}
            />
            <PrintPanel photos={photos} />
          </>
        )}
      </main>
    </div>
  )
}

export default App
