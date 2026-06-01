import brandJSON from './brand.json'

export const brand = {
  text: text => brandJSON[text],
  load: async () => {}
}

export default {
  install(app) {
    app.config.globalProperties.$brand = brand.text
  }
}
