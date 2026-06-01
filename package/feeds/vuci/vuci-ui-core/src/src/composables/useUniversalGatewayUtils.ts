import type { FixedSizeTagType, DynamicTagConfigOption, Tag, TagConfig, TagConfigType, TagConsumer } from '@/types/tagTypes'
import { useTranslate } from '@ui-core/composables/useI18n'

const FIXED_TAG_TYPE_BYTES: Record<FixedSizeTagType, number> = {
  bool: 0.125,
  int8: 1,
  uint8: 1,
  int16: 2,
  uint16: 2,
  int32: 4,
  uint32: 4,
  int64: 8,
  uint64: 8,
  float32: 4,
  float64: 8
}

export function useUniversalGatewayUtils(removeTagSize: boolean = false) {
  const $t = useTranslate()

  const sourceNameTranslations: Record<string, string> = {
    opcua_server: $t('OPC UA Server'),
    mbus_client: 'M-Bus',
    dnp3_client: $t('DNP3 Client'),
    modbus_client: $t('Modbus Client')
  }

  const serverServiceInfo: Record<TagConsumer, { translation: string; route: string }> = {
    dnp3_outstation: { translation: $t('DNP3 Outstation'), route: '/services/dnp3/dnp_outstation/data_source' },
    dnp3_serial_outstation: { translation: $t('DNP3 Serial Outstation'), route: '/services/dnp3/dnp_serial_outstation/data_source' },
    modbus_server: { translation: $t('Modbus Server'), route: '/services/modbus/modbus_server/data_source' },
    modbus_serial_server: { translation: $t('Modbus Serial Server'), route: '/services/modbus/modbus_serial_server/data_source' },
    snmp: { translation: 'SNMP', route: '/services/snmp/data_source' },
    opcua_server: { translation: $t('OPC UA Server'), route: '/services/opcua/opcua_server/data_sources' }
  }

  const tagTypeOptions: [TagConfigType, string][] = [
    ['binary', $t('Binary')],
    ['string', $t('String')],
    ['bool', $t('Bool')],
    ['int8', 'INT8'],
    ['uint8', 'UINT8'],
    ['int16', 'INT16'],
    ['uint16', 'UINT16'],
    ['int32', 'INT32'],
    ['uint32', 'UINT32'],
    ['int64', 'INT64'],
    ['uint64', 'UINT64'],
    ['float32', 'FLOAT32'],
    ['float64', 'FLOAT64']
  ]

  function isTagSizeFixed(tagConfig: TagConfig): tagConfig is TagConfig & { tag_type: FixedSizeTagType } {
    return tagConfig.tag_type !== 'string' && tagConfig.tag_type !== 'binary'
  }

  function getTagSize(tagConfig: TagConfig): number | undefined {
    const tagCount = Number(tagConfig.tag_count || 1)
    if (isNaN(tagCount)) return

    let singleTagSize
    if (tagConfig.tag_type && isTagSizeFixed(tagConfig)) {
      singleTagSize = FIXED_TAG_TYPE_BYTES[tagConfig.tag_type]
    } else {
      singleTagSize = Number(tagConfig.tag_size)
      if (removeTagSize) singleTagSize = 1
      if (isNaN(singleTagSize)) return
    }

    return singleTagSize * tagCount
  }

  function isSourceMatchingConfig(t1: Tag | undefined, t2: TagConfig) {
    return !!t1 && t1.source === t2.tag_source && t1.id === t2.tag_id
  }

  function findOutdatedConfigOptions(t1: Tag | undefined, t2: TagConfig) {
    if (!t1) return []

    const outdatedOptions: DynamicTagConfigOption[] = []
    if (t2.tag_start && t2.tag_count && t1.value_count < Number(t2.tag_start) + Number(t2.tag_count)) {
      outdatedOptions.push('tag_range')
    }
    if (t2.tag_type && t1.type !== 'unknown' && t1.type !== t2.tag_type) {
      outdatedOptions.push('tag_type')
    }
    if (t2.tag_permissions && t1.permissions !== t2.tag_permissions) {
      outdatedOptions.push('tag_permissions')
    }
    return outdatedOptions
  }

  function listSourceNamesFromTags(tags: Tag[]) {
    return [...new Set(tags.map(tag => tag.source))]
  }

  function listTagsBySource(tags: Tag[], source: string) {
    return tags.filter(tag => tag.source === source)
  }

  function findTag(tags: Tag[], source: string, id: string) {
    return tags.find(tag => tag.source === source && tag.id === id)
  }

  return {
    sourceNameTranslations,
    serverServiceInfo,
    isTagSizeFixed,
    getTagSize,
    isSourceMatchingConfig,
    findOutdatedConfigOptions,
    tagTypeOptions,
    listSourceNamesFromTags,
    listTagsBySource,
    findTag
  }
}
