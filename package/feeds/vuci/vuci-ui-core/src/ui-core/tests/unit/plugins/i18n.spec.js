import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import axios from 'axios'
import i18nPlugin, { i18n } from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'

describe('i18n.js', () => {
  beforeEach(() => {
    setActivePinia(createTestingPinia())
    i18nPlugin.install({ config: { globalProperties: {} } })
  })
  it.each`
    method
    ${'cachedTranslations'}
    ${'t'}
    ${'loadLang'}
  `('i18n.js contain and export $method method.', async ({ method }) => {
    expect(!!i18n[method]).toEqual(true)
  })

  it('method t. Returns untranslated text when language is not found.', async () => {
    const text = 'test'
    const translated = i18n.t(text)
    expect(text).toEqual(translated)
  })

  it('method t. Returns untranslated text when language exists but translation is unavailable.', async () => {
    const store = useMainStore()
    store.lang = 'en'
    const text = 'test'
    i18n.cachedTranslations = {
      en: {}
    }
    const translated = i18n.t(text)
    expect(translated).toEqual(text)
  })

  it('method t. Returns translated text when translation is available.', async () => {
    const store = useMainStore()
    store.lang = 'en'
    const text = 'test'
    i18n.cachedTranslations = {
      en: {
        test: 'test en'
      }
    }
    const translated = i18n.t(text)
    expect(translated).not.toEqual(text)
  })

  it('method loadLang. Load english language and save to local storage.', async () => {
    const store = useMainStore()
    const lang = 'en'
    await i18n.loadLang(lang, true)
    expect(localStorage.language).toEqual(lang)
    expect(store.lang).toEqual(lang)
  })

  it('method loadLang. Language to load is not found.', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const lang = 'gb'
    const error = `Language file '/i18n/${lang}.json' not found`
    axios.get = vi.fn()
    axios.get.mockRejectedValueOnce()
    await i18n.loadLang(lang)
    expect(console.error).toHaveBeenCalled()
    expect(console.error.mock.calls[0][0]).toContain(error)
  })

  it('method loadLang. Language to load exists.', async () => {
    const lang = 'tr'
    const response = {
      headers: {
        'content-type': 'application/json'
      },
      data: {
        tr: {
          test: 'test tr'
        }
      }
    }
    axios.get = vi.fn()
    axios.get.mockResolvedValueOnce(response)
    await i18n.loadLang(lang)
    expect(i18n.cachedTranslations[lang]).toEqual(response.data)
  })

  it.each`
    deletedLang | cachedTranslations                                                      | languagePropertiesLeft
    ${'de'}     | ${{ de: { test: 'test' } }}                                             | ${[]}
    ${'de'}     | ${{ de: { test: 'test' }, fr: { test: 'test' } }}                       | ${['fr']}
    ${'fr'}     | ${{ de: { test: 'test' }, fr: { test: 'test' }, ja: { test: 'test' } }} | ${['de', 'ja']}
  `('method deleteLang. Deletes chosen language(s) and sets to english', async ({ deletedLang, cachedTranslations, languagePropertiesLeft }) => {
    i18n.deleteLanguages = vi.fn()
    i18n.cachedTranslations = cachedTranslations
    i18n.deleteLang(deletedLang)
    expect(i18n.cachedTranslations).not.toHaveProperty(deletedLang)
    languagePropertiesLeft.forEach(x => expect(i18n.cachedTranslations).toHaveProperty(x))
    vi.clearAllMocks()
  })
})
