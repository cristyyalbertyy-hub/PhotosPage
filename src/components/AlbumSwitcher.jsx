import { useState } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { useLanguage } from '../i18n/LanguageContext'

export default function AlbumSwitcher({
  albums,
  currentAlbumId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}) {
  const { t } = useLanguage()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const current = albums.find((album) => album.id === currentAlbumId)

  return (
    <div className="album-switcher">
      <label className="album-switcher-label">
        <span>{t('currentAlbum')}</span>
        <select
          value={currentAlbumId}
          onChange={(event) => onSwitch(event.target.value)}
        >
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </label>
      <input
        className="album-name-input"
        value={current?.name || ''}
        onChange={(event) => onRename(event.target.value)}
        aria-label={t('renameAlbum')}
      />
      <button type="button" className="album-switcher-btn" onClick={onCreate}>
        {t('newAlbum')}
      </button>
      <button
        type="button"
        className="album-switcher-btn album-switcher-btn--danger"
        onClick={() => setConfirmDelete(true)}
        disabled={albums.length <= 1}
      >
        {t('deleteAlbum')}
      </button>

      <ConfirmDialog
        open={confirmDelete}
        title={t('confirmDeleteAlbumTitle')}
        message={t('confirmDeleteAlbumMessage')}
        confirmLabel={t('confirmDeleteAlbumYes')}
        cancelLabel={t('confirmNo')}
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete()
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
