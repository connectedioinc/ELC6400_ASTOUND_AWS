import { createContext } from '@ui-core/utils/create-context'
import type { UseFormReturn } from './use-form'

export const [provideFormContext, injectFormContext] = createContext<UseFormReturn<any>>('form')
