import { createContext } from '@ui-core/utils/create-context'
import type { DataSenderCollection, DataSenderOutput } from '@/types/dataSenderTypes'
import type { Ref } from 'vue'

type AzureContext = {
  dsCollections: Ref<DataSenderCollection[]>
  dsOutputs: Ref<DataSenderOutput[]>
}

export const [provideAzureContext, useAzureContext] = createContext<AzureContext>('Azure')
