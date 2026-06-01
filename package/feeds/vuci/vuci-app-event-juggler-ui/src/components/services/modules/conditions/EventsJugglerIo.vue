<template>
  <vuci-form-item-select
    :uci-section="s"
    name="io_cond_name"
    :label="$t('I/O pin name')"
    :help="$t('Specify the I/O to which the condition is listening.')"
    :options="ioOptions"
    :depend="isTypeSelected"
  />
  <tlt-inline-message
    v-if="isTypeSelected && isBidirectionalSelected(ioData)"
    type="warning"
  >
    {{ $t('Configurable Input/Output conditions only work when the pin is set to input mode. You can change the pin mode') }}
    <router-link to="/services/io/general">{{ $t('here') }}</router-link
    >.
  </tlt-inline-message>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="io_cond_state"
    :label="$t('Pin state')"
    :help="$t('Specify the state the pin must be in.')"
    :options="pinStateOptions"
    :depend="isTypeSelected && isIoSelected"
    initial="0"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="io_cond_not"
    :label="$t('Range')"
    :options="rangeOptions"
    :depend="isTypeSelected && (isAclSelected || isAdcSelected)"
    initial="0"
  >
    <template #help>
      <p>{{ $t('Range for I/O condition:') }}</p>
      <p>
        <span class="font-bold">{{ $t('Inside') }}</span> {{ $t('the range;') }}
      </p>
      <p>
        <span class="font-bold">{{ $t('Outside') }}</span> {{ $t('the range.') }}
      </p>
    </template>
  </vuci-form-item-radio-group>
  <vuci-form-item-select
    :uci-section="s"
    name="io_cond_acl"
    :label="$t('ACL Property')"
    :help="$t('Select the property - ampere or percentage - the condition listens to.')"
    :options="aclOptions"
    :depend="isTypeSelected && isAclSelected"
  />
  <vuci-form-item-input
    v-bind="getIoProps('min', s?.io_cond_min, s?.io_cond_max, isAclSelected && s?.io_cond_acl)"
    :uci-section="s"
    name="io_cond_min"
    :depend="isTypeSelected && (isAclSelected || isAdcSelected)"
    maxlength="16"
    required
  />
  <vuci-form-item-input
    v-bind="getIoProps('max', s?.io_cond_min, s?.io_cond_max, isAclSelected && s?.io_cond_acl)"
    :uci-section="s"
    name="io_cond_max"
    :depend="isTypeSelected && (isAclSelected || isAdcSelected)"
    maxlength="16"
    required
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, computed, inject } from 'vue'
import type { Io } from '@/types/ioTypes'
import type { EventsJugglerOptions } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const $t = useTranslate()

const { isTypeSelected, isBidirectionalSelected, getIoProps } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const ioData: Io[] = eventsJugglerOptions?.value?.ioData || []

const aclOptions = [
  ['current', $t('Current')],
  ['percent', $t('Percent')]
]
const stateOptions = [
  { value: '0', name: $t('Low') },
  { value: '1', name: $t('High') }
]
const stateRelayOptions = [
  { value: '0', name: $t('Open') },
  { value: '1', name: $t('Closed') }
]

const rangeOptions = [
  { value: '0', name: $t('Inside') },
  { value: '1', name: $t('Outside') }
]

const pinStateOptions = computed(() => {
  if (props.s?.io_cond_name?.startsWith('relay')) return stateRelayOptions
  return stateOptions
})

const ioOptions = computed<string[][]>(() => ioData.filter((io: Io) => ['dwi', 'acl', 'adc', 'relay', 'gpio'].includes(io.type)).map((io: Io) => [io.id, io.name_with_pins]))
const isAclSelected = computed(() => !!props.s?.io_cond_name?.match('acl'))
const isAdcSelected = computed(() => !!props.s?.io_cond_name?.match('adc') || !!props.s?.io_cond_name?.match('pwr'))
const isIoSelected = computed(() => ['dwi', 'relay', 'gpio'].includes(ioData.find((io: Io) => io.id === props.s?.io_cond_name)?.type || ''))
</script>
