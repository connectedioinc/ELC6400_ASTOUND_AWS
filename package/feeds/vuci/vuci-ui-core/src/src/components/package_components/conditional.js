import { defineAsyncComponent } from 'vue'
import ErrorComponent from './components/EmptyComponent.vue'

export const loadComponent = (app, file) =>
  defineAsyncComponent({
    loader: () => import(`./components/${app}/${file}.vue`),
    errorComponent: ErrorComponent
  })
