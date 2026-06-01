<template>
  <io-status-section
    v-if="ioSectionDataFiltered.length"
    :title="$t('Input/Output status')"
    :io-data="ioSectionDataFiltered"
    :pinout-block="getIoPinoutBlock(ioPinoutBlockType as PinoutBlockType, ioSectionDataFiltered)"
  />
  <io-status-section
    v-if="powerSectionData.length"
    :title="$t('Power socket status')"
    :io-data="powerSectionData"
    :pinout-block="getPowerPinoutBlock(powerPinoutBlockType as PinoutBlockType, powerSectionData)"
  />
</template>

<script setup lang="ts">
import IoStatusSection from '../../components/services/IoStatusSection.vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { useMainStore } from '@/stores/main'
import { useTimer } from '@ui-core/composables/useTimer'
import { useIoPinoutBlocks, type PinoutBlockType } from '@/components/services/io/useIoPinoutBlocks'
import { ref, computed } from 'vue'
import type { Io } from '@/types/ioTypes'
import { provideIoStatusContext } from '../../components/services/useIoStatusContext'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

const ioStatusData = ref<Io[]>([])

const { ioPinoutBlocks, getIoPinoutBlock, powerPinoutBlocks, getPowerPinoutBlock } = useIoPinoutBlocks()

const ioPinoutBlockType = computed(() => ioStatusData.value.find((section: Io) => ioPinoutBlocks[section.block_type as keyof typeof ioPinoutBlocks])?.block_type || '')
const powerPinoutBlockType = computed(() => ioStatusData.value.find(section => powerPinoutBlocks[section.block_type as keyof typeof powerPinoutBlocks])?.block_type || '')

const ioSectionDataFiltered = computed(() => ioStatusData.value.filter((section: Io) => section.io_name && section.block_type === ioPinoutBlockType.value && getMultiStateIoFilters(section)) || [])
const powerSectionData = computed(() => ioStatusData.value.filter((section: Io) => section.block_type === powerPinoutBlockType.value) || [])

const aclSection = computed(() => ioStatusData.value.find((io: Io) => io.type === 'acl'))
const adcSection = computed(() => ioStatusData.value.find((io: Io) => io.type === 'adc'))

const ioMultiStateTypes = computed(() => {
  if (!aclSection.value || !adcSection.value) return {}

  return {
    acl: aclSection.value.state === 'active',
    adc: adcSection.value.state === 'active'
  }
})

provideIoStatusContext({
  handleIoStatusLoad,
  handleDataLoad,
  aclSection,
  adcSection
})

useTimer({
  method: handleIoStatusLoad,
  time: 3000,
  group: ['edit', 'spinner']
})

handleDataLoad()

function getMultiStateIoFilters(io: Io) {
  return io.type in ioMultiStateTypes.value ? ioMultiStateTypes.value[io.type as keyof typeof ioMultiStateTypes.value] : true
}

function handleDataLoad() {
  store.spin()
  return handleIoStatusLoad().then(() => {
    store.spin(false)
  })
}

function handleIoStatusLoad() {
  return axios
    .get('/api/io/status')
    .then(({ data }) => {
      ioStatusData.value = data
    })
    .catch(() => {
      message.error($t('Failed to load I/O status'))
    })
}
</script>
