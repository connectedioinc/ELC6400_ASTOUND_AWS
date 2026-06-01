import axios from 'axios'

export const brand = {
  cache: {},
  text: text => brand.cache[text],
  load: async () => {
    if (Object.keys(brand.cache).length !== 0) return
    try {
      const res = await axios.get('/brand/brand.json', {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
      brand.cache = res.data
    } catch {
      brand.cache = await import('./brand.json')
    }
  }
}

export default {
  install(app) {
    app.config.globalProperties.$brand = brand.text
  }
}
