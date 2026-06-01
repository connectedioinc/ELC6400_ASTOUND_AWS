<template>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="out_mode"
    :label="$t('Control mode')"
    :options="controlModeOptions"
    :depend="isTypeSelected"
    initial="invert"
  >
    <template #help>
      <p>{{ $t('Select the control mode for the output pin. This determines how the pin will be controlled:') }}</p>
      <p>
        <span class="font-bold">{{ $t('inverted') }}</span
        >, <span class="font-bold">{{ $t('copied') }}</span
        >, {{ $t('or') }} <span class="font-bold">{{ $t('set') }}</span> {{ $t('to selected state.') }}
      </p>
    </template>
  </vuci-form-item-radio-group>
  <vuci-form-item-select
    ref="out_dest"
    :uci-section="s"
    name="out_dest"
    :label="$t('Control pin')"
    :help="$t('Select the output or relay whose state will be changed.')"
    :options="controlOptions"
    :depend="isTypeSelected"
    :rules="validateCopyPinValues"
    @change="onOutDestChange"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="out_state"
    :label="$t('Set pin state')"
    :help="$t('Set the output state.')"
    :depend="isTypeSelected && s?.out_mode === 'set'"
    :options="stateSetOptions"
    initial="0"
  >
    <template #after-content>
      <tlt-tooltip
        v-if="controlModeOptions[0].disabled"
        :target="'#event_juggler.action.%s.edit.%s_out_mode-option-invert'.format(props.s?.id)"
        placement="bottom-start"
        fallback-placements="top-start"
        :content="$t('This option is disabled due to an existing event configured with pin name - relay and trigger - both.')"
      />
    </template>
  </vuci-form-item-radio-group>
  <vuci-form-item-select
    ref="out_copy"
    :uci-section="s"
    name="out_copy"
    :label="$t('Copy pin state')"
    :help="$t('Copy the state from the selected input to the selected output.')"
    :options="copyOptions"
    :depend="isTypeSelected && s?.out_mode === 'copy'"
    :rules="validateCopyPinValues"
    @change="() => outDestRef?.validate()"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="out_revert"
    :label="$t('Revert state')"
    :help="$t('Number of seconds after which the state will revert. If set to 0 or left empty, the state will not revert.')"
    initial="0"
    placeholder="0"
    rules="irange(0, 2147483647)"
    :depend="isTypeSelected"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="out_maintain"
    :label="$t('Maintain state')"
    :help="$t('Maintain the current IO state after a reboot.')"
    :depend="isTypeSelected"
  />
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useEventsJugglerModuleData, moduleProps } from '../useEventsJugglerModuleData'
import { type Ref, inject, computed, useTemplateRef } from 'vue'
import type { Io } from '@/types/ioTypes'
import type { EventsJugglerOptions, ActionSection } from '@/types/eventsJugglerTypes'

const props = defineProps(moduleProps)

const { isTypeSelected } = useEventsJugglerModuleData(props)

const eventsJugglerOptions = inject<Ref<EventsJugglerOptions>>('eventsJugglerOptions')
const ioData = eventsJugglerOptions?.value?.ioData || []

const $t = useTranslate()

const stateIoOptions = [
  { value: '0', name: $t('Low') },
  { value: '1', name: $t('High') }
]

const stateRelayOptions = [
  { value: '0', name: $t('Open') },
  { value: '1', name: $t('Closed') }
]

const stateSetOptions = computed(() => {
  if (props.s?.out_dest?.startsWith('relay')) return stateRelayOptions
  return stateIoOptions
})
const outCopyRef = useTemplateRef('out_copy')
const outDestRef = useTemplateRef('out_dest')

const eventWithBothRelayExists = computed(() => props.parentSection?.plugin === 'io' && props.parentSection?.io_name?.match('relay') && props.parentSection?.io_trigger === 'both')
const isRelaySelected = computed(() => props.s?.out_dest?.match('relay'))

const controlModeOptions = computed(() => [
  { value: 'invert', name: $t('Invert'), disabled: eventWithBothRelayExists.value && isRelaySelected.value },
  { value: 'copy', name: $t('Copy') },
  { value: 'set', name: $t('Set') }
])

const controlOptions = computed(() => {
  return ioData.filter((io: Io) => ['relay'].includes(io.type) || (io.type === 'gpio' && (io.direction === 'out' || io.bi_dir === '1'))).map((io: Io) => [io.id, io.name_with_pins])
})
const copyOptions = computed(() => {
  return ioData.filter((io: Io) => ['relay', 'dwi', 'gpio'].includes(io.type)).map((io: Io) => [io.id, io.name_with_pins])
})
function onOutDestChange() {
  setOutMode()
  outCopyRef.value?.validate()
}
function setOutMode() {
  const section = props.s as ActionSection
  section.out_mode = controlModeOptions.value[0].disabled && section.out_mode === controlModeOptions.value[0].value ? controlModeOptions.value[1].value : section.out_mode
}
function validateCopyPinValues(value: string) {
  if (props.s?.out_mode === 'copy' && value === props.s?.out_dest && value === props.s?.out_copy) {
    return { isValid: false, message: $t('Values of Control pin and Copy pin state must differ.') }
  }
  return { isValid: true }
}
</script>
