import { createContext } from '@ui-core/utils/create-context'
import { type UseSelectReturn } from './use-select'

export const [provideSelectContext, injectSelectContext] = createContext<UseSelectReturn<any>>('select')
