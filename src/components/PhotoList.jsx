import { useState } from 'react'
import { applyCustomOrder } from '../utils/photoOrder'

export default function PhotoList({
  photos,
  onToggleSelect,
  onRemove,
  onSelectAll,
  onApplyOrder,
}) {
  const [orderDraft, setOrderDraft] = useState({})
  const [orderError, setOrderError] = useState('')

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
  const hasDraftNumbers = Object.values(orderDraft).some((v) => v.trim() !== '')

  function handleOrderChange(id, value) {
    if (value === '' || /^\d+$/.test(value)) {
      setOrderDraft((prev) => ({ ...prev, [id]: value }))
      setOrderError('')
    }
  }

  function handleApplyOrder() {
    setOrderError('')
    try {
      const reordered = applyCustomOrder(photos, orderDraft)
      onApplyOrder(reordered)
      setOrderDraft({})
    } catch (err) {
      setOrderError(err.message)
    }
  }

  function handleClearOrder() {
    setOrderDraft({})
    setOrderError('')
  }

  return (
    <section className="photo-list">
      <div className="list-header">
        <div>
          <h2>Lista de Fotos</h2>
          <p className="section-desc">
            {selectedCount} de {photos.length} selecionada{selectedCount !== 1 ? 's' : ''}
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

      <div className="order-bar">
        <p className="order-hint">
          Escreva 1, 2, 3… nos quadradinhos para definir a ordem desejada
        </p>
        <div className="order-actions">
          {hasDraftNumbers && (
            <button type="button" className="btn-clear-order" onClick={handleClearOrder}>
              Limpar números
            </button>
          )}
          <button
            type="button"
            className="btn-apply-order"
            onClick={handleApplyOrder}
            disabled={!hasDraftNumbers}
          >
            Ordenar lista
          </button>
        </div>
      </div>

      {orderError && <p className="order-error">{orderError}</p>}

      <div className="photo-grid">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`photo-card ${photo.selected ? 'selected' : ''}`}
          >
            <input
              type="text"
              inputMode="numeric"
              className="order-box"
              value={orderDraft[photo.id] ?? ''}
              onChange={(e) => handleOrderChange(photo.id, e.target.value)}
              placeholder={`${index + 1}`}
              title="Número de ordem"
              aria-label={`Ordem da foto ${photo.name}`}
              maxLength={3}
            />

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
