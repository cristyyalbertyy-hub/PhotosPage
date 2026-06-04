import { useState } from 'react'
import { generatePdf } from '../utils/pdfGenerator'
import LayoutPreview from './LayoutPreview'

export default function PrintPanel({ photos }) {
  const [photosPerPage, setPhotosPerPage] = useState(4)
  const [filename, setFilename] = useState('fotos')
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState('')

  const selectedPhotos = photos.filter((p) => p.selected)

  async function handlePrint() {
    setError('')
    if (selectedPhotos.length === 0) {
      setError('Selecione pelo menos uma foto para imprimir')
      return
    }

    setPrinting(true)
    try {
      await generatePdf(
        selectedPhotos.map((p) => p.url),
        photosPerPage,
        filename,
      )
    } catch (err) {
      setError(err.message || 'Erro ao gerar PDF')
    } finally {
      setPrinting(false)
    }
  }

  const totalPages = Math.ceil(selectedPhotos.length / photosPerPage)
  const lastPageCount =
    selectedPhotos.length % photosPerPage || photosPerPage

  return (
    <section className="print-panel">
      <div className="print-header">
        <span className="printer-icon" aria-hidden="true">
          🖨️
        </span>
        <h2>Imprimir</h2>
      </div>
      <p className="section-desc">Guardar as fotos selecionadas num ficheiro PDF</p>

      <div className="print-controls">
        <label className="control-group">
          <span>Fotos por página</span>
          <div className="per-page-options">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                className={`per-page-btn ${photosPerPage === n ? 'active' : ''}`}
                onClick={() => setPhotosPerPage(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </label>

        <LayoutPreview
          photosPerPage={photosPerPage}
          photoCount={
            selectedPhotos.length > 0
              ? totalPages > 1
                ? lastPageCount
                : selectedPhotos.length
              : photosPerPage
          }
        />

        <label className="control-group">
          <span>Nome do ficheiro</span>
          <div className="filename-input">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="fotos"
            />
            <span className="extension">.pdf</span>
          </div>
        </label>

        {selectedPhotos.length > 0 && (
          <p className="print-info">
            {selectedPhotos.length} foto{selectedPhotos.length !== 1 ? 's' : ''} → {totalPages}{' '}
            página{totalPages !== 1 ? 's' : ''}
          </p>
        )}

        {error && <p className="print-error">{error}</p>}

        <button
          type="button"
          className="btn-print"
          onClick={handlePrint}
          disabled={printing || selectedPhotos.length === 0}
        >
          <span className="printer-icon-sm" aria-hidden="true">
            🖨️
          </span>
          {printing ? 'A gerar PDF...' : 'Guardar PDF'}
        </button>
      </div>
    </section>
  )
}
