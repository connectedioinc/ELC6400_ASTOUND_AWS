import axios from 'axios'
import { useMainStore } from '@/stores/main'

export const i18n = {
  cachedTranslations: {},
  /**
   * translates string
   * @param {string} text
   * @returns {string} translated string
   */
  t: function (text) {
    const store = useMainStore()
    if (!import.meta.env.PROD && (text[0] === ' ' || text[text.length - 1] === ' ')) {
      console.error(`i18n: given string [${text}] will not be translated. Text cannot start or end with SPACE`)
    }
    text = text.replace(/\s+/g, ' ') // strip multiple spaces
    const lang = store.lang || 'en'
    if (i18n.cachedTranslations[lang]) {
      return i18n.cachedTranslations[lang][text] || text
    }
    return text
  },

  loadLang: async function (fullLangFileName, saveToStorage = false, reload = false) {
    const store = useMainStore()
    fullLangFileName = fullLangFileName || 'en'
    let langCode = 'en'
    let langFileName = 'en'
    if (fullLangFileName !== 'en') {
      langCode = fullLangFileName.substring(0, 2)
      langFileName = fullLangFileName.replace('.json.gz', '')
    }
    if (saveToStorage) {
      localStorage.language = langCode
    }
    document.documentElement.setAttribute('lang', langCode)
    store.lang = langCode
    if (langCode === 'en' && reload) return store.rerender()
    if (langCode === 'en' || (i18n.cachedTranslations[langCode] && !reload)) return
    try {
      const response = await axios.get(`${location.origin}/i18n/${langFileName}.json`)
      if (response.headers['content-type'] !== 'application/json') throw new Error('Invalid content type')
      i18n.cachedTranslations[langCode] = response.data
      store.rerender()
    } catch {
      console.error(`Language file '/i18n/${langFileName}.json' not found`)
    }
  },

  deleteLang: function (lang) {
    const store = useMainStore()
    if (lang in i18n.cachedTranslations) {
      delete i18n.cachedTranslations[lang]
    }
    this.loadLang('en')
    store.rerender()
  },

  languages: [
    {
      name: 'Español',
      description: 'Spanish Language Support (Español)',
      package: 'vuci-i18n-spanish',
      code: 'es'
    },
    {
      name: '日本語',
      description: 'Japanese Language Support (日本語)',
      package: 'vuci-i18n-japanese',
      code: 'ja'
    },
    {
      name: 'Português',
      description: 'Portuguese Language Support (Português)',
      package: 'vuci-i18n-portuguese',
      code: 'pt'
    },
    {
      name: 'Türkçe',
      description: 'Turkish Language Support (Türkçe)',
      package: 'vuci-i18n-turkish',
      code: 'tr'
    },
    {
      name: 'Deutsch',
      description: 'German Language Support (Deutsch)',
      package: 'vuci-i18n-german',
      code: 'de'
    },
    {
      name: 'Українська',
      description: 'Ukrainian Language Support (Українська)',
      package: 'vuci-i18n-ukrainian',
      code: 'ua'
    }
  ]
}

export default {
  install(app) {
    app.config.globalProperties.$t = i18n.t
    app.config.globalProperties.$i18n = i18n
  }
}
