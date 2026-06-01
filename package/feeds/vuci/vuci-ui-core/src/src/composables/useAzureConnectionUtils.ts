import { useTranslate } from '@ui-core/composables/useI18n'
import type { AzureConfig } from '@/types/azureTypes'
import type { DataSenderOutput, DataSenderCollection } from '@/types/dataSenderTypes'

type UtilSection = AzureConfig | DataSenderOutput

interface NormalizedUtilSection {
  id: string
  name: string
  connection_type: string
  connection_string?: string
  registration_id?: string
  id_scope?: string
  global_prov_uri?: string
}

type SectionErrorSource = Partial<{
  section: UtilSection
  fromDataSender: boolean
}>

type IotHubOptions = Partial<{
  hostname: string
  deviceid: string
}>

type ProvisioningOptions = Partial<{
  registration_id: string
  global_prov_uri: string
  id_scope: string
}>

export function useAzureConnectionUtils() {
  const $t = useTranslate()

  function normalizeSection(section: UtilSection): NormalizedUtilSection {
    if (isDsOutput(section)) {
      return {
        id: section.id,
        name: section.azure_section_name ?? section.name,
        connection_type: section.azure_connection_type ?? '',
        connection_string: section.azure_connection_string,
        registration_id: section.azure_registration_id,
        id_scope: section.azure_id_scope,
        global_prov_uri: section.azure_global_prov_uri
      }
    } else {
      return {
        id: section.id,
        name: section.name,
        connection_type: section.connection_type ?? '',
        connection_string: section.connection_string,
        registration_id: section.registration_id,
        id_scope: section.id_scope,
        global_prov_uri: section.global_prov_uri
      }
    }
  }

  function parseConnectionString(connectionString: string) {
    return (
      connectionString.match(/(\w+)=([^;]+)/g)?.reduce<IotHubOptions>(
        (acc, pair) => {
          const [key, value] = pair.split('=')
          if (['hostname', 'deviceid'].includes(key.toLowerCase())) {
            acc[key.toLowerCase() as keyof IotHubOptions] = value
          }
          return acc
        },
        { hostname: undefined, deviceid: undefined }
      ) || { hostname: undefined, deviceid: undefined }
    )
  }

  function isDsOutput(section: UtilSection): section is DataSenderOutput {
    return 'plugin' in section && section.plugin === 'azure'
  }

  function isSameIotHubConnection(s1: IotHubOptions, s2: IotHubOptions) {
    return s1.hostname === s2.hostname && s1.deviceid === s2.deviceid
  }

  function isSameProvisioningConnection(s: NormalizedUtilSection, parsedData: ProvisioningOptions) {
    return s.registration_id === parsedData.registration_id && s.id_scope === parsedData.id_scope && s.global_prov_uri === parsedData.global_prov_uri
  }

  function getIothubValues(section: NormalizedUtilSection) {
    const connectionString = section.connection_string || ''
    return connectionString && parseConnectionString(connectionString)
  }

  function getProvisioningValues(section: NormalizedUtilSection) {
    const { registration_id = undefined, global_prov_uri = undefined, id_scope = undefined } = section
    return { registration_id, global_prov_uri, id_scope }
  }

  function findSection(data: UtilSection[], validate: (section: NormalizedUtilSection) => boolean, match: (section: NormalizedUtilSection) => boolean) {
    return data.map(normalizeSection).find(section => validate(section) && section.name && match(section))
  }

  function findIothubSection(data: UtilSection[], parsedData: IotHubOptions) {
    return findSection(data, validateIothubSection, section => isSameIotHubConnection(parsedData, parseConnectionString(section.connection_string || '')))
  }

  function findProvisioningSection(data: UtilSection[], parsedData: ProvisioningOptions) {
    return findSection(data, validateProvisioningSection, section => isSameProvisioningConnection(section, parsedData))
  }

  function validateIothubSection(section: NormalizedUtilSection) {
    return section.connection_type === 'iothub' && Boolean(section.connection_string)
  }

  function validateProvisioningSection(section: NormalizedUtilSection) {
    return section.connection_type === 'provisioning' && Boolean(section.registration_id && section.id_scope && section.global_prov_uri)
  }

  const connectionTypeHandlers = {
    iothub: {
      getValues: getIothubValues,
      findConnectedSection: findIothubSection
    },
    provisioning: {
      getValues: getProvisioningValues,
      findConnectedSection: findProvisioningSection
    }
  }

  function validateConnection(section: UtilSection, azureData: AzureConfig[], dsOutputData: DataSenderOutput[], dsCollectionsData: DataSenderCollection[]) {
    const normalizedSection = normalizeSection(section)
    const connectionType = normalizedSection.connection_type

    if (!connectionType) return {}

    const connectionTypeHandler = connectionTypeHandlers[connectionType as keyof typeof connectionTypeHandlers]
    if (!connectionTypeHandler) return {}

    const values = connectionTypeHandler.getValues(normalizedSection)
    if (!values || Object.values(values).some(value => !value)) return {}

    const azureSection = connectionTypeHandler.findConnectedSection(azureData, values) as AzureConfig | undefined
    if (azureSection) {
      return { section: azureSection, fromDataSender: false }
    }

    const dsOutputSection = connectionTypeHandler.findConnectedSection(dsOutputData, values) as DataSenderOutput | undefined
    if (dsOutputSection) {
      const dsCollectionSection = findDataToServerCollection(dsOutputSection, dsCollectionsData)
      if (dsCollectionSection) {
        return { section: dsCollectionSection, fromDataSender: true }
      }
    }

    return {}
  }

  const generateErrorMessage = (obj: SectionErrorSource) => {
    if (!obj.section) return
    return obj.fromDataSender
      ? $t("Can't use same connection to Azure. The same connection is used by Data to Server collection which name is '%s'").format(obj.section.name)
      : $t("Can't use same connection to Azure. The same connection is used by Azure Iot Hub instance which name is '%s'").format(obj.section.name)
  }

  function findDataToServerCollection(dsOutputSection: DataSenderOutput, dsCollectionsData: DataSenderCollection[]) {
    if (!dsOutputSection) return
    return dsCollectionsData?.find(collection => collection.output === dsOutputSection?.id)
  }

  function findDataToServerOutput(sectionName: string, dsOutputs: DataSenderOutput[]) {
    if (!sectionName) return
    return dsOutputs.find(output => output?.plugin === 'azure' && output?.azure_section_name === sectionName)
  }

  return {
    validateConnection,
    generateErrorMessage,
    findDataToServerCollection,
    findDataToServerOutput
  }
}
