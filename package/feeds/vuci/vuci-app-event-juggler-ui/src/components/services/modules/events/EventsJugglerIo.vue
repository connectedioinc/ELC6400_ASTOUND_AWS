<template>
  <vuci-form-item-select
    :uci-section="s"
    name="io_name"
    :label="$t('I/O pin name')"
    :help="$t('Specify the I/O to which the event is listening.')"
    :options="ioOptions"
    :warnings="getIoNameWarning"
    :depend="isTypeSelected"
    @change="setIoTrigger"
  />
  <tlt-inline-message
    v-if="isTypeSelected && isBidirectionalSelected(ioData)"
    type="warning"
  >
    {{ $t('Configurable Input/Output events only work when the pin is set to input mode. You can change the pin mode') }}
    <router-link to="/services/io/general">{{ $t('here') }}</router-link
    >.
  </tlt-inline-message>
  <vuci-form-item-radio-group
    :uci-section="s"
    name="io_trigger"
    :label="$t('Trigger')"
    :help="$t('Specify the condition that will trigger the event.')"
    :options="triggerOptions"
    :depend="isTypeSelected && hasIoTrigger"
    :initial="triggerOptions[0].value"
  >
    <template #after-content>
      <tlt-tooltip
        v-if="triggerOptions[2].disabled"
        :target="'#event_juggler.event.%s.edit.%s_io_trigger-option-both'.format(props.s?.id)"
        placement="bottom-start"
        fallback-placements="top-start"
        :content="$t('This option is disabled due to an existing action configured with control pin - relay and control mode - invert.')"
      />
    </template>
  </vuci-form-item-radio-group>
  <vuci-form-item-switch
    :uci-section="s"
    name="io_reset"
    :label="$t('Prevent action execution')"
    :help="$t('Prevents execution of actions if the I/O returns to its normal state before the action delay time has elapsed.')"
    :depend="isTypeSelected"
  />
  <vuci-form-item-radio-group
    :uci-section="s"
    name="io_inside"
    :label="$t('Range')"
    :options="rangeOptions"
    :depend="isTypeSelected && (isAclSelected || isAdcSelected)"
    initial="0"
  >
    <template #help>
      <p>{{ $t('Range for I/O event:') }}</p>
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
    name="io_acl"
    :label="$t('ACL Property')"
    :help="$t('Select the property - ampere or percentage - the event listens to.')"
    :options="aclOptions"
    :depend="isTypeSelected && isAclSelected"
  />
  <vuci-form-item-input
    v-bind="getIoProps('min', s?.io_min, s?.io_max, isAclSelected && s?.io_acl)"
    :uci-section="s"
    name="io_min"
    :depend="isTypeSelected && (isAclSelected || isAdcSelected)"
    maxlength="16"
    required
  />
  <vuci-form-item-input
    v-bind="getIoProps('max', s?.io_min, s?.io_max, isAclSelected && s?.io_acl)"
    :uci-section="s"
    name="io_max"
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

const ioOptions = computed<string[][]>(() => ioData.filter((io: Io) => ['dwi', 'acl', 'adc', 'relay'].includes(io.type) || isGpio(io)).map((io: Io) => [io.id, io.name_with_pins]))
const isAclSelected = computed(() => !!props.s?.io_name?.match('acl'))
const isAdcSelected = computed(() => !!props.s?.io_name?.match('adc') || !!props.s?.io_name?.match('pwr'))
const isDwiSelected = computed(() => !!props.s?.io_name?.match('dwi'))
const isRelaySelected = computed(() => !!props.s?.io_name?.match('relay'))

const isGpioSelected = computed(() => {
  const selectedIo = ioData?.find((io: Io) => io.id === props.s?.io_name) || undefined
  return isGpio(selectedIo)
})

const hasIoTrigger = computed(() => isDwiSelected.value || isGpioSelected.value || isRelaySelected.value)

const triggerOptions = computed(() => [
  { value: isRelaySelected.value ? 'opening' : 'rising', name: isRelaySelected.value ? $t('Opening') : $t('Rising') },
  { value: isRelaySelected.value ? 'closing' : 'falling', name: isRelaySelected.value ? $t('Closing') : $t('Falling') },
  { value: 'both', name: $t('Both'), disabled: isRelaySelected.value && actionWithInvertRelayExists.value }
])

const actionWithInvertRelayExists = computed(() => {
  return props.uciData?.actions?.find(a => props.s?.actions?.includes(a.id) && a.plugin === 'out' && a.out_mode === 'invert' && a.out_dest?.match('relay'))
})

function isGpio(io: Io | undefined) {
  return io?.type === 'gpio' && (io.direction !== 'out' || (io.direction === 'out' && io.bi_dir === '1'))
}

const rangeOptions = [
  { value: '0', name: $t('Outside') },
  { value: '1', name: $t('Inside') }
]

function getIoNameWarning() {
  if (!(isAclSelected.value || isAdcSelected.value) && props.uciData?.conditions?.find(c => props.s?.available_conditions?.includes(c.id) && c.plugin === 'filter' && c.filter_name === 'io.fvalue')) {
    return $t('This I/O pin cannot have ADC/ACL filter conditions. Please remove the current ADC/ACL filter conditions to enable changing the I/O pin name.')
  }
}

function setIoTrigger() {
  const section = props.s
  if (!section) return
  section.io_trigger = hasIoTrigger.value ? triggerOptions.value[0].value : ''
}

async function handleBeforeSave() {
  const res = getIoNameWarning()
  return res ? Promise.reject(res) : Promise.resolve(true)
}

defineExpose({
  moduleBeforeSave: handleBeforeSave
})
</script>
