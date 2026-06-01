import { useTranslate } from '@ui-core/composables/useI18n'

export function useOpcuaServerUtils() {
  const $t = useTranslate()

  const nodeIdTypes = ['numeric', 'string', 'guid', 'bytestring']

  const nodeIdTypeDisplayNames = {
    numeric: $t('Numeric'),
    string: $t('String'),
    guid: 'GUID',
    bytestring: $t('Byte string')
  }

  const ioFieldDisplayNames = {
    high: $t('High'),
    input: $t('Direction'),
    closed: $t('Closed'),
    value: $t('Value')
  }

  const ioTypeDisplayNames = {
    din: $t('Digital input'),
    dout: $t('Digital output'),
    dio: $t('Digital input/output'),
    relay: $t('Relay'),
    adc: $t('Analog input')
  }

  const ioFieldsByType = {
    din: ['high'],
    dout: ['high'],
    dio: ['high', 'input'],
    relay: ['closed'],
    adc: ['value']
  }

  return {
    nodeIdTypes,
    nodeIdTypeDisplayNames,
    ioFieldDisplayNames,
    ioTypeDisplayNames,
    ioFieldsByType
  }
}

export default useOpcuaServerUtils
