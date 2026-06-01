import type { Ref } from 'vue'
import { createContext } from '@ui-core/utils/create-context'

export type TableRowActionsContext = {
  actions: Ref<Map<string, () => void>>
  registerAction: (id: string, action: () => void) => void
  unregisterAction: (id: string) => void
}

export const [provideTableRowActionsContext, useTableRowActionsContext] = createContext<TableRowActionsContext>('TableRowActionsContext')
