import { createContext } from '@ui-core/utils/create-context'
import type { ComputedRef } from 'vue'
import type { Io } from '@/types/ioTypes'

type IoStatusContext = {
  handleIoStatusLoad: () => Promise<void>
  handleDataLoad: () => void
  aclSection: ComputedRef<Io | undefined>
  adcSection: ComputedRef<Io | undefined>
}

export const [provideIoStatusContext, useIoStatusContext] = createContext<IoStatusContext>('IoStatus')
