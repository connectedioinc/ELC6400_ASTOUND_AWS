import { createContext } from '@ui-core/utils/create-context'
import type { UseStepsReturn } from './use-steps'

export const [provideStepsContext, useStepsContext] = createContext<UseStepsReturn>('steps')
