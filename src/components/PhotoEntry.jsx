import { useRef, useState } from 'react'

function createPendingItem(file) {
  return {
    id: crypto.randomUUID(),
    blob: file,
    name: file.name,
    previewUrl: URL.createObjectURL(file),
  }
}

export default function PhotoEntry({ onAddMany }) {
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

    onAddMany(pending.map((p) => ({ blob: p.blob, name: p.name })))
    pending.forEach((p) => URL.revokeObjectURL(p.previewUrl))
    setPending([])
    if (inputRef.current) inputRef.current.value = ''

    const n = pending.length
    setAddedHint(
      `${n} foto${n !== 1 ? 's' : ''} adicionada${n !== 1 ? 's' : ''} à coleção. Pode escolher mais.`,
    )
  }

  return (
    <section className="photo-entry">
      <h2>Entrada de Fotos</h2>
      <p className="section-desc">
        Escolha uma ou várias imagens. Remova as que não quiser (✕) e depois adicione à
        coleção.
      </p>

      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="drop-placeholder">
          <span className="drop-icon">📷</span>
          <span>Clique ou arraste imagens (pode escolher várias)</span>
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
            <p className="pending-count">
              {pending.length} foto{pending.length !== 1 ? 's' : ''} selecionada
              {pending.length !== 1 ? 's' : ''}
            </p>
            <button
              type="button"
              className="btn-clear-pending"
              onClick={clearPending}
            >
              Limpar tudo
            </button>
          </div>

          <div className="pending-grid">
            {pending.map((item) => (
              <div key={item.id} className="pending-card">
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => removePending(item.id)}
                  title="Remover desta seleção"
                  aria-label="Remover desta seleção"
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
        title="Adicionar fotos à coleção"
      >
        <span className="plus">+</span>
        {pending.length > 0
          ? `Adicionar ${pending.length} foto${pending.length !== 1 ? 's' : ''}`
          : 'Adicionar à coleção'}
      </button>
    </section>
  )
}
