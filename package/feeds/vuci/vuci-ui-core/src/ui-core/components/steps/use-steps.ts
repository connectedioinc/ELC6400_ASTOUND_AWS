import { useStepper } from '@vueuse/core'

export type UseStepsReturn = ReturnType<typeof useSteps>

export type UseStepsProps = {}

export const useSteps = (...params: Parameters<typeof useStepper>) => useStepper(...params)
