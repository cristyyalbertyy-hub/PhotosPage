import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from './translations'

const STORAGE_KEY = 'photosPage-lang'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'pt'
  })

  function setLang(next) {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => {
    const dict = translations[lang]

    function t(key, ...args) {
      const entry = dict[key]
      if (typeof entry === 'function') return entry(...args)
      return entry ?? key
    }

    function layoutLabel(n) {
      return dict.layouts[n] ?? ''
    }

    return {
      lang,
      setLang,
      t,
      layoutLabel,
      orientationShort: dict.orientationShort,
    }
  }, [lang])

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
