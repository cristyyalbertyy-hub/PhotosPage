import { useEffect, useMemo, useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { useLanguage } from '../i18n/LanguageContext'
import { estimatePdfSize, formatBytes, generatePdf } from '../utils/pdfGenerator'
import LayoutPreview from './LayoutPreview'

export default function PrintPanel({ photos }) {
  const { lang, t } = useLanguage()
  const [photosPerPage, setPhotosPerPage] = useState(4)
  const [orientation, setOrientation] = useState('portrait')
  const [filename, setFilename] = useState(lang === 'en' ? 'photos' : 'fotos')
  const [quality, setQuality] = useState('email')
  const [downloadAsZip, setDownloadAsZip] = useState(true)
  const [printing, setPrinting] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [estimate, setEstimate] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [noSelectionAlert, setNoSelectionAlert] = useState(false)

  const selectedPhotos = useMemo(
    () => photos.filter((p) => p.selected),
    [photos],
  )
  const selectedUrls = useMemo(
    () => selectedPhotos.map((p) => p.url),
    [selectedPhotos],
  )

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
  }, [selectedUrls, photosPerPage, orientation, quality])

  useEffect(() => {
    if (estimate?.partCount > 1) setDownloadAsZip(true)
  }, [estimate?.partCount])

  function handleSaveClick() {
    if (selectedPhotos.length === 0) {
      setNoSelectionAlert(true)
      return
    }
    handlePrint()
  }

  async function handlePrint() {
    setError('')
    setProgress(null)
    if (selectedPhotos.length === 0) return

    setPrinting(true)
    try {
      await generatePdf({
        photoUrls: selectedUrls,
        photosPerPage,
        filename,
        orientation,
        quality,
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
  const lastPageCount =
    selectedPhotos.length % photosPerPage || photosPerPage

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
    if (!progress) return t('generatingPdf')
    if (progress.total > 1) {
      return t('generatingPart', progress.current, progress.total)
    }
    return t('generatingPdf')
  }

  return (
    <section className="print-panel">
      <div className="print-header">
        <span className="printer-icon" aria-hidden="true">
          🖨️
        </span>
        <h2>{t('printTitle')}</h2>
      </div>
      <p className="section-desc">{t('printDesc')}</p>

      <div className="print-controls">
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

        <LayoutPreview
          photosPerPage={photosPerPage}
          orientation={orientation}
          photoCount={
            selectedPhotos.length > 0
              ? totalPages > 1
                ? lastPageCount
                : selectedPhotos.length
              : photosPerPage
          }
        />

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
            {t('printSummary', selectedPhotos.length, totalPages)}
          </p>
        )}

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

        <button
          type="button"
          className={`btn-print ${selectedPhotos.length === 0 && !printing ? 'btn-print--inactive' : ''}`}
          onClick={handleSaveClick}
          disabled={printing || estimating}
          aria-disabled={selectedPhotos.length === 0}
        >
          <span className="printer-icon-sm" aria-hidden="true">
            🖨️
          </span>
          {printing ? renderProgressLabel() : t('savePdf')}
        </button>
      </div>

      <ConfirmDialog
        open={noSelectionAlert}
        variant="alert"
        title={t('selectPhotosAlertTitle')}
        message={t('selectPhotosAlertMessage')}
        confirmLabel={t('selectPhotosAlertOk')}
        onCancel={() => setNoSelectionAlert(false)}
      />
    </section>
  )
}
