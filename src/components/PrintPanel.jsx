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

const EMAIL_MESSAGE_KEY = 'photosPage-email-message'
const EMPTY_PAGES = new Set()

export default function PrintPanel({ photos }) {
  const { lang, t } = useLanguage()
  const [photosPerPage, setPhotosPerPage] = useState(4)
  const [orientation, setOrientation] = useState('portrait')
  const [layoutMode, setLayoutMode] = useState('fill')
  const [filename, setFilename] = useState(lang === 'en' ? 'photos' : 'fotos')
  const [quality, setQuality] = useState('email')
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
  const [excludeState, setExcludeState] = useState({ key: '', pages: new Set() })
  const [noPagesAlert, setNoPagesAlert] = useState(false)

  const selectedPhotos = useMemo(
    () => photos.filter((p) => p.selected),
    [photos],
  )
  const pageKey = `${photosPerPage}:${selectedPhotos.map((p) => p.id).join(',')}`
  const excludedPages =
    excludeState.key === pageKey ? excludeState.pages : EMPTY_PAGES
  const includedPhotos = useMemo(
    () =>
      selectedPhotos.filter((_, index) => {
        const pageIndex = Math.floor(index / photosPerPage)
        return !excludedPages.has(pageIndex)
      }),
    [selectedPhotos, photosPerPage, excludedPages],
  )
  const selectedUrls = useMemo(
    () => includedPhotos.map((p) => p.url),
    [includedPhotos],
  )
  const aspects = usePhotoAspects(selectedPhotos)

  function togglePageIncluded(pageIndex) {
    setExcludeState((prev) => {
      const current = prev.key === pageKey ? prev.pages : new Set()
      const next = new Set(current)
      if (next.has(pageIndex)) next.delete(pageIndex)
      else next.add(pageIndex)
      return { key: pageKey, pages: next }
    })
  }

  useEffect(() => {
    setFilename((prev) => {
      if (prev === 'fotos' || prev === 'photos') {
        return lang === 'en' ? 'photos' : 'fotos'
      }
      return prev
    })
  }, [lang])

  useEffect(() => {
    if (selectedUrls.length === 0) {
      setEstimate(null)
      setEstimating(false)
      return
    }

    let cancelled = false
    setEstimating(true)

    const timer = setTimeout(async () => {
      try {
        const result = await estimatePdfSize(
          selectedUrls,
          photosPerPage,
          orientation,
          quality,
          layoutMode,
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
  }, [selectedUrls, photosPerPage, orientation, quality, layoutMode])

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
    if (includedPhotos.length === 0) {
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

    if (includedPhotos.length === 0) {
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
        photoUrls: selectedUrls,
        photosPerPage,
        filename,
        orientation,
        quality,
        layoutMode,
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
    if (selectedPhotos.length === 0 || includedPhotos.length === 0) return

    setPrinting(true)
    try {
      await generatePdf({
        photoUrls: selectedUrls,
        photosPerPage,
        filename,
        orientation,
        quality,
        layoutMode,
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

  const totalPages = Math.ceil(selectedPhotos.length / photosPerPage)
  const includedPageCount = totalPages - excludedPages.size

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
              onClick={() => setOrientation('portrait')}
            >
              <span className="orientation-icon" aria-hidden="true">
                ▯
              </span>
              {t('portrait')}
            </button>
            <button
              type="button"
              className={`orientation-btn ${orientation === 'landscape' ? 'active' : ''}`}
              onClick={() => setOrientation('landscape')}
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
                onClick={() => setPhotosPerPage(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </label>

        <label className="control-group">
          <span>{t('layoutMode')}</span>
          <div className="orientation-options">
            <button
              type="button"
              className={`orientation-btn ${layoutMode === 'fill' ? 'active' : ''}`}
              onClick={() => setLayoutMode('fill')}
            >
              {t('layoutModeFill')}
            </button>
            <button
              type="button"
              className={`orientation-btn ${layoutMode === 'grid' ? 'active' : ''}`}
              onClick={() => setLayoutMode('grid')}
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
            aspects={aspects}
            photosPerPage={photosPerPage}
            orientation={orientation}
            layoutMode={layoutMode}
            excludedPages={excludedPages}
            onTogglePage={togglePageIncluded}
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
              onChange={(e) => setFilename(e.target.value)}
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
              onClick={() => setQuality('email')}
            >
              {t('qualityEmail')}
            </button>
            <button
              type="button"
              className={`orientation-btn ${quality === 'print' ? 'active' : ''}`}
              onClick={() => setQuality('print')}
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
          className={`btn-print ${includedPhotos.length === 0 && !isBusy ? 'btn-print--inactive' : ''}`}
          onClick={handleSaveClick}
          disabled={isBusy || estimating}
          aria-disabled={includedPhotos.length === 0}
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
            className={`btn-email ${includedPhotos.length === 0 && !isBusy ? 'btn-print--inactive' : ''}`}
            onClick={handleSendEmail}
            disabled={isBusy || estimating}
            aria-disabled={includedPhotos.length === 0}
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
