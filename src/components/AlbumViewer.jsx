import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { chunkPhotos } from '../utils/pageLayout'
import AlbumPage from './AlbumPage'

export default function AlbumViewer({
  photos,
  aspects,
  photosPerPage,
  orientation,
  layoutMode,
}) {
  const { t } = useLanguage()
  const pages = chunkPhotos(photos, photosPerPage)
  const [pageIndex, setPageIndex] = useState(0)
  const totalPages = pages.length
  const currentIndex = Math.min(pageIndex, Math.max(totalPages - 1, 0))
  const currentPhotos = pages[currentIndex] || []

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'ArrowLeft') {
        setPageIndex((prev) => Math.max(0, Math.min(prev, totalPages - 1) - 1))
      }
      if (event.key === 'ArrowRight') {
        setPageIndex((prev) => Math.min(totalPages - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [totalPages])

  if (photos.length === 0) {
    return (
      <div className="album-viewer album-viewer--empty">
        <p className="album-empty">{t('albumEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="album-viewer">
      <div className="album-toolbar">
        <p className="album-page-of">{t('albumPageOf', currentIndex + 1, totalPages)}</p>
        <div className="album-nav">
          <button
            type="button"
            className="album-nav-btn"
            onClick={() => setPageIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            aria-label={t('albumPrev')}
          >
            ←
          </button>
          <button
            type="button"
            className="album-nav-btn"
            onClick={() => setPageIndex(Math.min(totalPages - 1, currentIndex + 1))}
            disabled={currentIndex >= totalPages - 1}
            aria-label={t('albumNext')}
          >
            →
          </button>
        </div>
      </div>

      <div className="album-stage">
        <AlbumPage
          photos={currentPhotos}
          aspects={aspects}
          photosPerPage={photosPerPage}
          orientation={orientation}
          layoutMode={layoutMode}
          pageNumber={t('albumSheet', currentIndex + 1)}
          fillLabel={(pct) => t('albumFillRatio', pct)}
        />
      </div>

      {totalPages > 1 && (
        <div className="album-filmstrip" role="tablist" aria-label={t('albumSheets')}>
          {pages.map((pagePhotos, index) => (
            <AlbumPage
              key={index}
              photos={pagePhotos}
              aspects={aspects}
              photosPerPage={photosPerPage}
              orientation={orientation}
              layoutMode={layoutMode}
              pageNumber={index + 1}
              compact
              selected={index === currentIndex}
              onSelect={() => setPageIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
