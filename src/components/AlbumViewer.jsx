import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { chunkPhotos } from '../utils/pageLayout'
import AlbumPage from './AlbumPage'
import CoverSheet from './CoverSheet'

export default function AlbumViewer({
  photos,
  aspects,
  photosPerPage,
  orientation,
  layoutMode,
  excludedPages,
  onTogglePage,
  album,
  onUpdateAlbum,
  onMoveToPage,
  onReorderPhotos,
  onRotatePhoto,
  onCaptionChange,
  onSetCover,
}) {
  const { t } = useLanguage()
  const pages = chunkPhotos(photos, photosPerPage)
  const [pageIndex, setPageIndex] = useState(0)
  const totalPhotoPages = pages.length
  const totalViews = totalPhotoPages + 1
  const currentIndex = Math.min(pageIndex, Math.max(totalViews - 1, 0))
  const onCover = currentIndex === 0
  const photoPageIndex = currentIndex - 1
  const currentPhotos = onCover ? [] : pages[photoPageIndex] || []
  const coverPhoto =
    photos.find((photo) => photo.id === album.coverPhotoId) || photos[0] || null

  useEffect(() => {
    function handleKey(event) {
      if (event.target.closest('input, textarea')) return
      if (event.key === 'ArrowLeft') {
        setPageIndex((prev) => Math.max(0, Math.min(prev, totalViews - 1) - 1))
      }
      if (event.key === 'ArrowRight') {
        setPageIndex((prev) => Math.min(totalViews - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [totalViews])

  if (photos.length === 0) {
    return (
      <div className="album-viewer album-viewer--empty">
        <p className="album-empty">{t('albumEmpty')}</p>
      </div>
    )
  }

  const sharedPageProps = {
    aspects,
    photosPerPage,
    orientation,
    layoutMode,
    includeLabel: t('albumPageInclude'),
    excludeLabel: t('albumPageExclude'),
    onMoveToPage,
    onReorderPhotos,
    onRotatePhoto,
    onCaptionChange,
    onSetCover,
    rotateLabel: t('rotatePhoto'),
    coverLabel: t('setAsCover'),
    captionPlaceholder: t('captionPlaceholder'),
    dropLabel: t('dropOnPage'),
  }

  return (
    <div className="album-viewer">
      <div className="album-toolbar">
        <p className="album-page-of">
          {onCover
            ? t('coverSheet')
            : t('albumPageOf', photoPageIndex + 1, totalPhotoPages)}
        </p>
        <p className="album-move-hint">{t('albumMoveHint')}</p>
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
            onClick={() => setPageIndex(Math.min(totalViews - 1, currentIndex + 1))}
            disabled={currentIndex >= totalViews - 1}
            aria-label={t('albumNext')}
          >
            →
          </button>
        </div>
      </div>

      <div className="album-stage">
        {onCover ? (
          <CoverSheet
            title={album.title}
            date={album.date}
            coverPhoto={coverPhoto}
            rotation={coverPhoto?.rotation ?? 0}
            orientation={orientation}
            included={album.includeCover}
            onToggleIncluded={() =>
              onUpdateAlbum({ includeCover: !album.includeCover })
            }
            includeLabel={t('albumPageInclude')}
            excludeLabel={t('albumPageExclude')}
            pageNumber={t('coverSheet')}
            onTitleChange={(title) => onUpdateAlbum({ title })}
            onDateChange={(date) => onUpdateAlbum({ date })}
            titlePlaceholder={t('coverTitlePlaceholder')}
            datePlaceholder={t('coverDatePlaceholder')}
            emptyHint={t('coverEmptyHint')}
            onMoveToCover={onSetCover}
          />
        ) : (
          <AlbumPage
            {...sharedPageProps}
            photos={currentPhotos}
            pageIndex={photoPageIndex}
            pageNumber={t('albumSheet', photoPageIndex + 1)}
            fillLabel={(pct) => t('albumFillRatio', pct)}
            included={!excludedPages.has(photoPageIndex)}
            onToggleIncluded={() => onTogglePage(photoPageIndex)}
          />
        )}
      </div>

      <div className="album-filmstrip" role="tablist" aria-label={t('albumSheets')}>
        <CoverSheet
          title={album.title}
          date={album.date}
          coverPhoto={coverPhoto}
          rotation={coverPhoto?.rotation ?? 0}
          orientation={orientation}
          compact
          selected={onCover}
          onSelect={() => setPageIndex(0)}
          included={album.includeCover}
          onToggleIncluded={() =>
            onUpdateAlbum({ includeCover: !album.includeCover })
          }
          includeLabel={t('albumPageInclude')}
          excludeLabel={t('albumPageExclude')}
          pageNumber={t('coverShort')}
          onMoveToCover={onSetCover}
        />
        {pages.map((pagePhotos, index) => (
          <AlbumPage
            key={index}
            {...sharedPageProps}
            photos={pagePhotos}
            pageIndex={index}
            pageNumber={index + 1}
            compact
            selected={!onCover && index === photoPageIndex}
            onSelect={() => setPageIndex(index + 1)}
            included={!excludedPages.has(index)}
            onToggleIncluded={() => onTogglePage(index)}
          />
        ))}
      </div>
    </div>
  )
}
