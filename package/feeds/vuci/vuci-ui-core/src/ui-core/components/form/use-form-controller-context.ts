import { createContext } from '@ui-core/utils/create-context'
import type { UseFormControllerReturn } from './use-form-controller'

export const [provideFormControllerContext, injectFormControllerContext] = createContext<UseFormControllerReturn>('form-controller')
