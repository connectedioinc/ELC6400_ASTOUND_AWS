import type { Ref } from 'vue'
import { createContext } from '@ui-core/utils/create-context'
import type { Tab, TabIndicator } from './TltTabs.vue'

type TabsContext = {
  registeredTabs: Ref<Tab[]>
  selected: Ref<string>
  indicators: Ref<Record<string, TabIndicator>>
  highlight: Ref<boolean | 'error' | 'change'>
  inner: Ref<boolean>
}

export const [provideTabsContext, useTabsContext] = createContext<TabsContext>('TabsContext')
