import { useRef, useState } from 'react'

export default function PhotoEntry({ onAdd }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [file, setFile] = useState(null)
  const [fileName, setFileName] = useState('')

  function handleFileChange(e) {
    const selected = e.target.files?.[0]
    if (!selected) return

    if (preview) URL.revokeObjectURL(preview)
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setFileName(selected.name)
  }

  function handleAdd() {
    if (!file) return
    onAdd({ blob: file, name: fileName })
    setPreview(null)
    setFile(null)
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (!dropped || !dropped.type.startsWith('image/')) return

    if (preview) URL.revokeObjectURL(preview)
    setFile(dropped)
    setPreview(URL.createObjectURL(dropped))
    setFileName(dropped.name)
  }

  return (
    <section className="photo-entry">
      <h2>Entrada de Fotos</h2>
      <p className="section-desc">Selecione uma imagem e adicione à coleção</p>

      <div
        className="drop-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        {preview ? (
          <img src={preview} alt="Pré-visualização" className="preview-img" />
        ) : (
          <div className="drop-placeholder">
            <span className="drop-icon">📷</span>
            <span>Clique ou arraste uma imagem</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          hidden
        />
      </div>

      {fileName && <p className="file-name">{fileName}</p>}

      <button
        type="button"
        className="btn-add"
        onClick={handleAdd}
        disabled={!file}
        title="Adicionar foto"
      >
        <span className="plus">+</span>
        Adicionar foto
      </button>
    </section>
  )
}
