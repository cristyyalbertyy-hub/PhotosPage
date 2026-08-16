import { useEffect, useState } from 'react'

export function usePhotoAspects(photos) {
  const [aspects, setAspects] = useState({})

  useEffect(() => {
    let cancelled = false
    const missing = photos.filter((photo) => photo.url && aspects[photo.id] == null)

    missing.forEach((photo) => {
      const image = new Image()
      image.onload = () => {
        if (cancelled) return
        const aspect = image.naturalWidth / image.naturalHeight
        setAspects((prev) =>
          prev[photo.id] != null ? prev : { ...prev, [photo.id]: aspect },
        )
      }
      image.onerror = () => {
        if (cancelled) return
        setAspects((prev) =>
          prev[photo.id] != null ? prev : { ...prev, [photo.id]: 1 },
        )
      }
      image.src = photo.url
    })

    return () => {
      cancelled = true
    }
  }, [photos, aspects])

  return aspects
}
