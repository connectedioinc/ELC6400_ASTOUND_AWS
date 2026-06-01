import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useAzureConnectionUtils } from '@/composables/useAzureConnectionUtils'
import type { AzureConfig } from '@/types/azureTypes'
import type { DataSenderOutput, DataSenderCollection } from '@/types/dataSenderTypes'

export function useAzureUtils() {
  const $t = useTranslate()
  const $message = useMessages()

  const { findDataToServerOutput, findDataToServerCollection } = useAzureConnectionUtils()

  const connectionTypeOptions = [
    ['iothub', $t('Shared Access Signature (SAS) key')],
    ['provisioning', $t('Device Provisioning Service (DPS)')]
  ]

  function validateDisable(self: { model: '0' | '1'; uciSection: AzureConfig }, dsOutputsData: DataSenderOutput[], dsCollectionsData: DataSenderCollection[]) {
    const dSCollectionName = canDisableAzureSection(self.uciSection, dsOutputsData, dsCollectionsData)
    if (!dSCollectionName) return

    self.model = '1'
    $message.error($t('Cannot disable the section because it is currently active using the Data to Server collection named %s.').format(dSCollectionName))
  }

  function canDisableAzureSection(section: AzureConfig, dsOutputsData: DataSenderOutput[], dsCollectionsData: DataSenderCollection[]) {
    const dSOutput = findDataToServerOutput(section.name, dsOutputsData)
    if (!dSOutput) return

    const dsCollection = findDataToServerCollection(dSOutput, dsCollectionsData)
    if (!dsCollection || dsCollection.enabled !== '1') return

    return dsCollection.name
  }

  return {
    connectionTypeOptions,
    validateDisable
  }
}
