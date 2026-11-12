import { createI18n } from 'vue-i18n'
import en from './locales/en'
import fr from './locales/fr'

const fallbackLocale = 'en'

function detectLocale(): string {
  const saved = localStorage.getItem('locale')
  if (saved) return saved

  const browserLang = navigator.language.slice(0, 2)
  if (browserLang === 'fr') return 'fr'

  return fallbackLocale
}

const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale,
  messages: { en, fr },
})

export function setLocale(locale: string) {
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
}

export default i18n
