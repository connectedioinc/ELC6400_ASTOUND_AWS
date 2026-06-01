import type { App, Component } from 'vue'

export default {
  install(app: App) {
    const globalComponents = import.meta.glob<Component>(
      [
        '@ui-core/components/**/*.vue',
        '@ui-core/tlt-design/**/*vue',
        '@ui-core/vuci-form/src/*.vue',
        '@ui-core/tlt-design/icons/Icon*.vue',
        '!@ui-core/**/*Mixin.vue',
        // ignoring the newly added components, don't want to include them in the bundle if not imported anywhere
        '!@components/{base,button,checkbox,config,field,form,input,radio,select,switch,textarea,upload}'
      ],
      {
        eager: true,
        import: 'default'
      }
    )
    Object.keys(globalComponents).forEach(path => {
      const name = path.match(/.*\/(.*).vue/)?.[1]
      if (!name) return
      app.component(name, globalComponents[path])
    })
  }
}
