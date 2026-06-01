import type { InterfaceStatus } from '@/types/networkTypes'
import { createContext } from '@ui-core/utils/create-context'
import type { Ref } from 'vue'

export interface FormOptions {
  interfaceStatus: Ref<InterfaceStatus[]>
}

export const [provideContext, useContext, contextId] = createContext<FormOptions>('MultiWanInterfaceFormOptions')
