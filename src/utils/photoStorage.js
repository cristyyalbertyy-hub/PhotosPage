const DB_NAME = 'photosPage'
const STORE_NAME = 'photos'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function runTransaction(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const store = tx.objectStore(STORE_NAME)
        fn(store)

        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      }),
  )
}

export async function loadPhotos() {
  const db = await openDB()

  const records = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  return records
    .sort((a, b) => {
      const sa = a.sortOrder ?? Infinity
      const sb = b.sortOrder ?? Infinity
      if (sa !== sb) return sa - sb
      return a.addedAt - b.addedAt
    })
    .map((record) => ({
      id: record.id,
      name: record.name,
      selected: record.selected,
      blob: record.blob,
      url: URL.createObjectURL(record.blob),
      addedAt: record.addedAt,
      sortOrder: record.sortOrder ?? null,
    }))
}

export async function savePhoto(photo) {
  await runTransaction('readwrite', (store) => {
    store.put({
      id: photo.id,
      name: photo.name,
      selected: photo.selected,
      blob: photo.blob,
      addedAt: photo.addedAt,
      sortOrder: photo.sortOrder ?? null,
    })
  })
}

export async function deletePhoto(id) {
  await runTransaction('readwrite', (store) => {
    store.delete(id)
  })
}

export async function savePhotoOrder(photos) {
  await Promise.all(photos.map((photo) => savePhoto(photo)))
}

export async function clearAllPhotos() {
  await runTransaction('readwrite', (store) => {
    store.clear()
  })
}

export async function saveAllSelections(photos) {
  const db = await openDB()

  await Promise.all(
    photos.map(
      (photo) =>
        new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite')
          const store = tx.objectStore(STORE_NAME)
          const getReq = store.get(photo.id)

          getReq.onsuccess = () => {
            const record = getReq.result
            if (record) {
              record.selected = photo.selected
              store.put(record)
            }
            resolve()
          }

          getReq.onerror = () => reject(getReq.error)
          tx.onerror = () => reject(tx.error)
        }),
    ),
  )
}
