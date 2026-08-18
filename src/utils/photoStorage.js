const DB_NAME = 'photosPage'
const PHOTOS_STORE = 'photos'
const ALBUMS_STORE = 'albums'
const DB_VERSION = 2
const CURRENT_ALBUM_KEY = 'photosPage-currentAlbum'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        db.createObjectStore(PHOTOS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(ALBUMS_STORE)) {
        db.createObjectStore(ALBUMS_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function storeGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const request = tx.objectStore(storeName).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function storePut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function storeDelete(db, storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function createAlbumRecord(name, lang = 'pt') {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name,
    title: '',
    date: '',
    coverPhotoId: null,
    includeCover: true,
    orientation: 'portrait',
    photosPerPage: 4,
    layoutMode: 'fill',
    quality: 'email',
    filename: lang === 'en' ? 'photos' : 'fotos',
    excludedPages: [],
    excludedKey: '',
    createdAt: now,
    updatedAt: now,
  }
}

function mapPhoto(record) {
  return {
    id: record.id,
    albumId: record.albumId ?? null,
    name: record.name,
    selected: record.selected,
    blob: record.blob,
    url: URL.createObjectURL(record.blob),
    addedAt: record.addedAt,
    sortOrder: record.sortOrder ?? null,
    rotation: record.rotation ?? 0,
    scale: record.scale ?? 1,
    caption: record.caption ?? '',
  }
}

function photoRecord(photo) {
  return {
    id: photo.id,
    albumId: photo.albumId ?? null,
    name: photo.name,
    selected: photo.selected,
    blob: photo.blob,
    addedAt: photo.addedAt,
    sortOrder: photo.sortOrder ?? null,
    rotation: photo.rotation ?? 0,
    scale: photo.scale ?? 1,
    caption: photo.caption ?? '',
  }
}

export async function loadWorkspace(lang = 'pt') {
  const db = await openDB()
  let albums = await storeGetAll(db, ALBUMS_STORE)
  const allPhotos = await storeGetAll(db, PHOTOS_STORE)

  if (albums.length === 0) {
    const album = createAlbumRecord(lang === 'en' ? 'Album 1' : 'Álbum 1', lang)
    await storePut(db, ALBUMS_STORE, album)
    albums = [album]

    for (const record of allPhotos) {
      if (!record.albumId) {
        record.albumId = album.id
        record.rotation = record.rotation ?? 0
        record.caption = record.caption ?? ''
        await storePut(db, PHOTOS_STORE, record)
      }
    }
  }

  albums.sort((a, b) => a.createdAt - b.createdAt)

  const savedId = localStorage.getItem(CURRENT_ALBUM_KEY)
  const currentAlbum = albums.find((album) => album.id === savedId) || albums[0]
  localStorage.setItem(CURRENT_ALBUM_KEY, currentAlbum.id)

  const photos = allPhotos
    .filter((record) => record.albumId === currentAlbum.id)
    .sort((a, b) => {
      const sa = a.sortOrder ?? Infinity
      const sb = b.sortOrder ?? Infinity
      if (sa !== sb) return sa - sb
      return a.addedAt - b.addedAt
    })
    .map(mapPhoto)

  return { albums, currentAlbumId: currentAlbum.id, photos }
}

export function setCurrentAlbumId(id) {
  localStorage.setItem(CURRENT_ALBUM_KEY, id)
}

export async function loadAlbumPhotos(albumId) {
  const db = await openDB()
  const allPhotos = await storeGetAll(db, PHOTOS_STORE)
  return allPhotos
    .filter((record) => record.albumId === albumId)
    .sort((a, b) => {
      const sa = a.sortOrder ?? Infinity
      const sb = b.sortOrder ?? Infinity
      if (sa !== sb) return sa - sb
      return a.addedAt - b.addedAt
    })
    .map(mapPhoto)
}

export async function saveAlbum(album) {
  const db = await openDB()
  await storePut(db, ALBUMS_STORE, { ...album, updatedAt: Date.now() })
}

export async function deleteAlbumRecord(albumId) {
  const db = await openDB()
  const allPhotos = await storeGetAll(db, PHOTOS_STORE)
  for (const record of allPhotos) {
    if (record.albumId === albumId) {
      await storeDelete(db, PHOTOS_STORE, record.id)
    }
  }
  await storeDelete(db, ALBUMS_STORE, albumId)
}

export async function savePhoto(photo) {
  const db = await openDB()
  await storePut(db, PHOTOS_STORE, photoRecord(photo))
}

export async function deletePhoto(id) {
  const db = await openDB()
  await storeDelete(db, PHOTOS_STORE, id)
}

export async function savePhotoOrder(photos) {
  await Promise.all(photos.map((photo) => savePhoto(photo)))
}

export async function movePhotosToAlbum(photos, targetAlbumId) {
  const db = await openDB()
  const allPhotos = await storeGetAll(db, PHOTOS_STORE)
  const destCount = allPhotos.filter((record) => record.albumId === targetAlbumId)
    .length

  await Promise.all(
    photos.map((photo, i) =>
      savePhoto({
        ...photo,
        albumId: targetAlbumId,
        sortOrder: destCount + i,
      }),
    ),
  )
}

export async function clearAlbumPhotos(albumId) {
  const db = await openDB()
  const allPhotos = await storeGetAll(db, PHOTOS_STORE)
  for (const record of allPhotos) {
    if (record.albumId === albumId) {
      await storeDelete(db, PHOTOS_STORE, record.id)
    }
  }
}

export async function saveAllSelections(photos) {
  await Promise.all(photos.map((photo) => savePhoto(photo)))
}
