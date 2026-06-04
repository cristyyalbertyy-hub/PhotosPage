export default function PhotoList({ photos, onToggleSelect, onRemove, onSelectAll }) {
  if (photos.length === 0) {
    return (
      <section className="photo-list">
        <h2>Lista de Fotos</h2>
        <p className="empty-state">Ainda não há fotos. Adicione na secção de entrada.</p>
      </section>
    )
  }

  const selectedCount = photos.filter((p) => p.selected).length
  const allSelected = selectedCount === photos.length

  return (
    <section className="photo-list">
      <div className="list-header">
        <div>
          <h2>Lista de Fotos</h2>
          <p className="section-desc">
            {selectedCount} de {photos.length} selecionada{selectedCount !== 1 ? 's' : ''}
            {' — '}ordem de adição
          </p>
        </div>
        <div className="list-actions">
          <button
            type="button"
            className="btn-select-all"
            onClick={() => onSelectAll(!allSelected)}
          >
            {allSelected ? 'Desselecionar todas' : 'Selecionar todas'}
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
              title="Remover foto"
              aria-label="Remover foto"
            >
              ✕
            </button>

            <img src={photo.url} alt={photo.name} />

            <button
              type="button"
              className={`select-box ${photo.selected ? 'checked' : ''}`}
              onClick={() => onToggleSelect(photo.id)}
              title={photo.selected ? 'Desselecionar' : 'Selecionar para imprimir'}
              aria-label={photo.selected ? 'Desselecionar foto' : 'Selecionar foto'}
              aria-pressed={photo.selected}
            >
              {photo.selected && <span className="check-mark">✓</span>}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
