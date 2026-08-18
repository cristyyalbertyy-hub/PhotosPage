import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { useLanguage } from '../i18n/LanguageContext'
import { usePhotoAspects } from '../hooks/usePhotoAspects'
import {
  getSavedRecipient,
  saveRecipient,
  sendPdfByEmail,
} from '../utils/emailShare'
import {
  buildPdfFiles,
  estimatePdfSize,
  formatBytes,
  generatePdf,
} from '../utils/pdfGenerator'
import AlbumViewer from './AlbumViewer'
import LayoutPreview from './LayoutPreview'
import { rotatedAspect } from '../utils/pageLayout'
import {
  chunkBySizes,
  fixedPageSizes,
  pageSizesByFill,
} from '../utils/pagination'

const EMAIL_MESSAGE_KEY = 'photosPage-email-message'
const EMPTY_PAGES = new Set()

export default function PrintPanel({
  photos,
  album,
  onUpdateAlbum,
  onMoveToPosition,
  onReorderPhotos,
  onRotatePhoto,
  onCaptionChange,
  onSetCover,
  onScaleChange,
}) {
  const { lang, t } = useLanguage()
  const photosPerPage = album.photosPerPage
  const orientation = album.orientation
  const layoutMode = album.layoutMode
  const filename = album.filename
  const quality = album.quality
  const [downloadAsZip, setDownloadAsZip] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [noSelectionAlert, setNoSelectionAlert] = useState(false)
  const [recipient, setRecipient] = useState(() => getSavedRecipient())
  const [emailMessage, setEmailMessage] = useState(
    () => localStorage.getItem(EMAIL_MESSAGE_KEY) || '',
  )
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailInfo, setEmailInfo] = useState('')
  const [noPagesAlert, setNoPagesAlert] = useState(false)

  const selectedPhotos = useMemo(
    () => photos.filter((p) => p.selected),
    [photos],
  )
  const aspects = usePhotoAspects(selectedPhotos)
  // In "fill" mode each sheet may hold a different number of photos, chosen so
  // that the shapes of the photos leave as little white space as possible.
  const pageSizes = useMemo(() => {
    const ready = selectedPhotos.every((photo) => aspects[photo.id] != null)
    if (layoutMode !== 'fill' || !ready) {
      return fixedPageSizes(selectedPhotos.length, photosPerPage)
    }
    return pageSizesByFill({
      aspects: selectedPhotos.map((photo) =>
        rotatedAspect(aspects[photo.id], photo.rotation ?? 0),
      ),
      perPage: photosPerPage,
      orientation,
    })
  }, [selectedPhotos, aspects, layoutMode, photosPerPage, orientation])
  const pages = useMemo(
    () => chunkBySizes(selectedPhotos, pageSizes),
    [selectedPhotos, pageSizes],
  )
  const pageKey = `${photosPerPage}:${layoutMode}:${pageSizes.join('.')}:${selectedPhotos
    .map((p) => p.id)
    .join(',')}`
  const excludedPages = useMemo(
    () =>
      album.excludedKey === pageKey ? new Set(album.excludedPages) : EMPTY_PAGES,
    [album.excludedKey, album.excludedPages, pageKey],
  )
  const includedPages = useMemo(
    () => pages.filter((_, index) => !excludedPages.has(index)),
    [pages, excludedPages],
  )
  const includedPhotos = useMemo(
    () => includedPages.flat(),
    [includedPages],
  )
  const includedPageSizes = useMemo(
    () => includedPages.map((pagePhotos) => pagePhotos.length),
    [includedPages],
  )
  const photoItems = useMemo(
    () =>
      includedPhotos.map((photo) => ({
        url: photo.url,
        rotation: photo.rotation || 0,
        scale: photo.scale ?? 1,
        caption: photo.caption || '',
      })),
    [includedPhotos],
  )
  const coverPhoto =
    selectedPhotos.find((photo) => photo.id === album.coverPhotoId) ||
    selectedPhotos[0] ||
    null
  const cover = useMemo(
    () =>
      album.includeCover
        ? {
            enabled: true,
            title: album.title,
            date: album.date,
            url: coverPhoto?.url,
            rotation: coverPhoto?.rotation || 0,
          }
        : null,
    [
      album.includeCover,
      album.title,
      album.date,
      coverPhoto?.url,
      coverPhoto?.rotation,
    ],
  )
  const canExport = includedPhotos.length > 0 || album.includeCover

  function handleMoveToPage(photoId, pageIndex) {
    const start = pageSizes
      .slice(0, pageIndex)
      .reduce((total, size) => total + size, 0)
    // Sheet limits are recalculated after the move, so the photo is dropped in
    // the middle of the target sheet to make sure it stays on it.
    onMoveToPosition(photoId, start + Math.floor((pageSizes[pageIndex] ?? 0) / 2))
  }

  function togglePageIncluded(pageIndex) {
    const current =
      album.excludedKey === pageKey ? new Set(album.excludedPages) : new Set()
    if (current.has(pageIndex)) current.delete(pageIndex)
    else current.add(pageIndex)
    onUpdateAlbum({
      excludedKey: pageKey,
      excludedPages: [...current],
    })
  }

  useEffect(() => {
    if (photoItems.length === 0 && !cover?.enabled) {
      setEstimate(null)
      setEstimating(false)
      return
    }

    let cancelled = false
    setEstimating(true)

    const timer = setTimeout(async () => {
      try {
        const result = await estimatePdfSize(
          null,
          photosPerPage,
          orientation,
          quality,
          layoutMode,
          photoItems,
          cover,
          includedPageSizes,
        )
        if (!cancelled) setEstimate(result)
      } catch {
        if (!cancelled) setEstimate(null)
      } finally {
        if (!cancelled) setEstimating(false)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    photoItems,
    photosPerPage,
    orientation,
    quality,
    layoutMode,
    cover,
    includedPageSizes,
  ])

  useEffect(() => {
    if (estimate?.partCount > 1) setDownloadAsZip(true)
  }, [estimate?.partCount])

  function handleNoSelection() {
    setNoSelectionAlert(true)
  }

  function handleSaveClick() {
    if (selectedPhotos.length === 0) {
      handleNoSelection()
      return
    }
    if (!canExport) {
      setNoPagesAlert(true)
      return
    }
    handlePrint()
  }

  async function handleSendEmail() {
    setError('')
    setEmailInfo('')

    if (selectedPhotos.length === 0) {
      handleNoSelection()
      return
    }

    if (!canExport) {
      setNoPagesAlert(true)
      return
    }

    if (!recipient.trim()) {
      setError(t('emailNoRecipient'))
      return
    }

    setSendingEmail(true)
    setProgress(null)

    try {
      saveRecipient(recipient)
      localStorage.setItem(EMAIL_MESSAGE_KEY, emailMessage)

      const result = await buildPdfFiles({
        photoItems,
        photosPerPage,
        pageSizes: includedPageSizes,
        filename,
        orientation,
        quality,
        layoutMode,
        cover,
        onProgress: ({ current, total }) => {
          setProgress({ current, total })
        },
      })

      const body = emailMessage.trim() || t('emailBodyDefault')

      const sendResult = await sendPdfByEmail({
        files: result.files,
        safeName: result.safeName,
        recipient,
        subject: t('emailSubject', result.safeName),
        body,
        attachHint: t('emailAttachHint'),
      })

      setEmailInfo(
        sendResult.method === 'share'
          ? t('emailSuccessShare')
          : t('emailSuccessMailto'),
      )
    } catch (err) {
      if (err.message === 'NO_RECIPIENT') {
        setError(t('emailNoRecipient'))
      } else if (err.message === 'INVALID_EMAIL') {
        setError(t('emailInvalid'))
      } else if (err.message === 'SHARE_CANCELLED') {
        setEmailInfo(t('emailCancelled'))
      } else if (err.message === 'NO_PHOTOS_SELECTED') {
        handleNoSelection()
      } else {
        setError(t('pdfError'))
      }
    } finally {
      setSendingEmail(false)
      setProgress(null)
    }
  }

  async function handlePrint() {
    setError('')
    setProgress(null)
    if (selectedPhotos.length === 0 || !canExport) return

    setPrinting(true)
    try {
      await generatePdf({
        photoItems,
        photosPerPage,
        pageSizes: includedPageSizes,
        filename,
        orientation,
        quality,
        layoutMode,
        cover,
        downloadAsZip: estimate?.partCount > 1 && downloadAsZip,
        onProgress: ({ current, total }) => {
          setProgress({ current, total })
        },
      })
    } catch (err) {
      if (err.message === 'NO_PHOTOS_SELECTED') {
        setError(t('noPhotosSelected'))
      } else {
        setError(t('pdfError'))
      }
    } finally {
      setPrinting(false)
      setProgress(null)
    }
  }

  const totalPages = pages.length
  const includedPageCount = includedPages.length

  function renderSizeEstimate() {
    if (selectedPhotos.length === 0) return null
    if (estimating) {
      return <p className="size-estimate size-estimate--loading">{t('estimatingSize')}</p>
    }
    if (!estimate) return null

    const sizeLabel = formatBytes(estimate.totalBytes)
    if (estimate.fitsEmail) {
      return (
        <p className="size-estimate size-estimate--ok">
          {t('sizeEstimateOk', sizeLabel)}
        </p>
      )
    }

    return (
      <p className="size-estimate size-estimate--warn">
        {t('sizeEstimateSplit', sizeLabel, estimate.partCount)}
      </p>
    )
  }

  function renderProgressLabel() {
    if (!progress) {
      return sendingEmail ? t('sendingEmail') : t('generatingPdf')
    }
    if (progress.total > 1) {
      return t('generatingPart', progress.current, progress.total)
    }
    return sendingEmail ? t('sendingEmail') : t('generatingPdf')
  }

  const isBusy = printing || sendingEmail

  return (
    <section className="print-panel">
      <div className="print-header">
        <span className="printer-icon" aria-hidden="true">
          📖
        </span>
        <h2>{t('printTitle')}</h2>
      </div>
      <p className="section-desc">{t('printDesc')}</p>

      <div className="print-controls">
        <label className="control-group">
          <span>{t('orientation')}</span>
          <div className="orientation-options">
            <button
              type="button"
              className={`orientation-btn ${orientation === 'portrait' ? 'active' : ''}`}
              onClick={() => onUpdateAlbum({ orientation: 'portrait' })}
            >
              <span className="orientation-icon" aria-hidden="true">
                ▯
              </span>
              {t('portrait')}
            </button>
            <button
              type="button"
              className={`orientation-btn ${orientation === 'landscape' ? 'active' : ''}`}
              onClick={() => onUpdateAlbum({ orientation: 'landscape' })}
            >
              <span
                className="orientation-icon orientation-icon--landscape"
                aria-hidden="true"
              >
                ▭
              </span>
              {t('landscape')}
            </button>
          </div>
        </label>

        <label className="control-group">
          <span>{t('photosPerPage')}</span>
          <div className="per-page-options">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                className={`per-page-btn ${photosPerPage === n ? 'active' : ''}`}
                onClick={() => onUpdateAlbum({ photosPerPage: n })}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="control-hint">
            {layoutMode === 'fill'
              ? t('photosPerPageFlexible')
              : t('photosPerPageExact')}
          </span>
        </label>

        <label className="control-group">
          <span>{t('layoutMode')}</span>
          <div className="orientation-options">
            <button
              type="button"
              className={`orientation-btn ${layoutMode === 'fill' ? 'active' : ''}`}
              onClick={() => onUpdateAlbum({ layoutMode: 'fill' })}
            >
              {t('layoutModeFill')}
            </button>
            <button
              type="button"
              className={`orientation-btn ${layoutMode === 'grid' ? 'active' : ''}`}
              onClick={() => onUpdateAlbum({ layoutMode: 'grid' })}
            >
              {t('layoutModeGrid')}
            </button>
          </div>
          <p className="control-hint">
            {t(layoutMode === 'fill' ? 'layoutModeHint_fill' : 'layoutModeHint_grid')}
          </p>
        </label>

        {selectedPhotos.length > 0 ? (
          <AlbumViewer
            photos={selectedPhotos}
            pages={pages}
            aspects={aspects}
            photosPerPage={photosPerPage}
            orientation={orientation}
            layoutMode={layoutMode}
            excludedPages={excludedPages}
            onTogglePage={togglePageIncluded}
            album={album}
            onUpdateAlbum={onUpdateAlbum}
            onMoveToPage={handleMoveToPage}
            onReorderPhotos={onReorderPhotos}
            onRotatePhoto={onRotatePhoto}
            onCaptionChange={onCaptionChange}
            onSetCover={onSetCover}
            onScaleChange={onScaleChange}
          />
        ) : (
          <div className="album-viewer album-viewer--empty">
            <p className="album-empty">{t('albumEmpty')}</p>
            <LayoutPreview
              photosPerPage={photosPerPage}
              orientation={orientation}
              photoCount={photosPerPage}
            />
          </div>
        )}

        <label className="control-group">
          <span>{t('filename')}</span>
          <div className="filename-input">
            <input
              type="text"
              value={filename}
              onChange={(e) => onUpdateAlbum({ filename: e.target.value })}
              placeholder={lang === 'en' ? 'photos' : 'fotos'}
            />
            <span className="extension">
              {estimate?.partCount > 1 && downloadAsZip ? '.zip' : '.pdf'}
            </span>
          </div>
        </label>

        {selectedPhotos.length > 0 && (
          <p className="print-info">
            {excludedPages.size > 0
              ? t(
                  'printSummarySkipped',
                  includedPhotos.length,
                  includedPageCount,
                  totalPages,
                )
              : t('printSummary', selectedPhotos.length, totalPages)}
          </p>
        )}

        <label className="control-group">
          <span>{t('quality')}</span>
          <div className="orientation-options">
            <button
              type="button"
              className={`orientation-btn ${quality === 'email' ? 'active' : ''}`}
              onClick={() => onUpdateAlbum({ quality: 'email' })}
            >
              {t('qualityEmail')}
            </button>
            <button
              type="button"
              className={`orientation-btn ${quality === 'print' ? 'active' : ''}`}
              onClick={() => onUpdateAlbum({ quality: 'print' })}
            >
              {t('qualityPrint')}
            </button>
          </div>
          <p className="control-hint">
            {t(quality === 'email' ? 'qualityHint_email' : 'qualityHint_print')}
          </p>
        </label>

        {renderSizeEstimate()}

        {estimate?.partCount > 1 && (
          <label className="zip-option">
            <input
              type="checkbox"
              checked={downloadAsZip}
              onChange={(e) => setDownloadAsZip(e.target.checked)}
            />
            <span>{t('downloadAsZip')}</span>
          </label>
        )}

        {error && <p className="print-error">{error}</p>}
        {emailInfo && <p className="print-info email-info">{emailInfo}</p>}

        <button
          type="button"
          className={`btn-print ${!canExport && !isBusy ? 'btn-print--inactive' : ''}`}
          onClick={handleSaveClick}
          disabled={isBusy || estimating}
          aria-disabled={!canExport}
        >
          <span className="printer-icon-sm" aria-hidden="true">
            🖨️
          </span>
          {printing ? renderProgressLabel() : t('savePdf')}
        </button>

        <div className="email-section">
          <h3 className="email-section-title">{t('emailSection')}</h3>
          <p className="control-hint">{t('emailHint')}</p>

          <label className="control-group">
            <span>{t('emailRecipient')}</span>
            <input
              type="email"
              className="email-input"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={t('emailRecipientPlaceholder')}
            />
          </label>

          <label className="control-group">
            <span>{t('emailMessage')}</span>
            <textarea
              className="email-textarea"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder={t('emailMessagePlaceholder')}
              rows={3}
            />
          </label>

          <button
            type="button"
            className={`btn-email ${!canExport && !isBusy ? 'btn-print--inactive' : ''}`}
            onClick={handleSendEmail}
            disabled={isBusy || estimating}
            aria-disabled={!canExport}
          >
            <span aria-hidden="true">✉️</span>
            {sendingEmail ? renderProgressLabel() : t('sendEmail')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={noSelectionAlert}
        variant="alert"
        title={t('selectPhotosAlertTitle')}
        message={t('selectPhotosAlertMessage')}
        confirmLabel={t('selectPhotosAlertOk')}
        onCancel={() => setNoSelectionAlert(false)}
      />
      <ConfirmDialog
        open={noPagesAlert}
        variant="alert"
        title={t('noPagesAlertTitle')}
        message={t('noPagesAlertMessage')}
        confirmLabel={t('selectPhotosAlertOk')}
        onCancel={() => setNoPagesAlert(false)}
      />
    </section>
  )
}
