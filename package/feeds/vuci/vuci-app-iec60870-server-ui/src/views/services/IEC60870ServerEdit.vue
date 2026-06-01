<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="iec60870_server"
    :after-load="onAfterLoad"
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle($t('IEC 60870-5 Server'), section.name)"
      :name="section.id"
      :endpoints="[{ endpoint: 'iec60870/server/instances/config' }]"
      :uci-data="uciData"
      data-key="instances"
    >
      <tlt-tabs
        v-model:selected="selectedTab"
        :tabs="tabs"
      >
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enabled')"
            :help="$t('Check to enable this configuration.')"
            name="enabled"
            initial="1"
            :readonly="!canSerialDeviceBeUsed && s.enabled !== '1' && s.connection_type === 'iec101'"
          />
          <serial-inline-warning
            v-show="s.connection_type === 'iec101'"
            :serial-status="serialStatus"
            :serial-devices="serialDevices"
            :initial-device="initialDevice"
            :device="s.device"
            service="IEC 60870-5 Server"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Name')"
            :help="$t('Name of the server. Used for easier device management purposes only.')"
            name="name"
            rules="no_control_codes"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Common address')"
            :help="$t('Common address of the ASDU. It is also sometimes referred to as the application layer address.')"
            name="common_address"
            rules="irange(1,65534)"
            :required="s.enabled === '1'"
          />

          <tlt-form-accordion name="advanced_settings">
            <tlt-form-model-item>
              <t-box
                variant="info"
                class="space-y-1"
              >
                <p
                  v-for="[key, label, size] in [
                    ['size_of_cot', $t('Size of COT'), 2],
                    ['size_of_ca', $t('Size of CA'), 2],
                    ['size_of_ioa', $t('Size of IOA'), 3]
                  ]"
                  :key="key"
                >
                  <strong>{{ label }}:</strong>
                  {{ $t('%s bytes').format(size) }}
                </p>
              </t-box>
            </tlt-form-model-item>

            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable spontaneous transmission')"
              :help="$t('Enable the transmission of spontaneous events. Will notify clients when an object changes.')"
              name="spontaneous_enabled"
              initial="0"
            />
            <vuci-form-item-select
              :uci-section="s"
              :depend="s.spontaneous_enabled === '1'"
              :label="$t('Spontaneous information objects')"
              :help="$t('List of information object for which spontaneous messages will be sent.')"
              :placeholder="$t('-- All --')"
              name="spontaneous_information_objects"
              :options="informationObjectOptions"
              multiple
              has-select-all
            />

            <vuci-form-item-switch
              :uci-section="s"
              :label="$t('Enable cyclic transmission')"
              :help="$t('Enable the transmission of cyclic messages. Will send the current values of changes on configured period.')"
              name="cyclic_enabled"
              initial="0"
            />
            <vuci-form-item-input
              :uci-section="s"
              :depend="s.cyclic_enabled === '1'"
              :label="$t('Cyclic transmission period')"
              :help="$t('Duration in milliseconds for how often cyclic messages should be sent.')"
              name="cyclic_period"
              rules="irange(1000,86400000)"
              :required="s.enabled === '1'"
              initial="20000"
            />
            <vuci-form-item-select
              :uci-section="s"
              :depend="s.cyclic_enabled === '1'"
              :label="$t('Cyclic information objects')"
              :help="$t('List of information object for which cyclic messages will be sent.')"
              :placeholder="$t('-- All --')"
              name="cyclic_information_objects"
              :options="informationObjectOptions"
              multiple
              has-select-all
            />

            <vuci-form-item-switch
              :uci-section="s"
              :depend="pinOptions.length > 0"
              :label="$t('Configure I/O pins')"
              :help="$t('Manually specify which I/O will be available as information objects.')"
              name="configure_pins"
              initial="0"
            />
            <vuci-form-item-list
              :uci-section="s"
              name="pins"
              :depend="s.configure_pins === '1' && pinOptions.length > 0"
              :label="$t('I/O pins')"
              type="tlt-select"
              :options="pinOptions"
              :maxlines="maxPinCount"
            />
          </tlt-form-accordion>
        </template>

        <template #connection>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Connection type')"
            :help="$t('Server connection type.')"
            name="connection_type"
            :options="connectionTypes"
          />

          <!-- IEC104 (TCP) Options -->
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port')"
            :help="$t('Specify port number for server to listen.')"
            :depend="s.connection_type === 'iec104'"
            name="port"
            rules="port"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Allow remote access')"
            :help="$t('Allow access through WAN.')"
            :depend="s.connection_type === 'iec104' && hasWanZone"
            name="allow_remote_access"
          />

          <!-- IEC101 (Serial) Options -->
          <vuci-form-item-radio-group
            :uci-section="s"
            :label="$t('Link layer mode')"
            :help="$t('Whether communication is balanced (both can initiate) or unbalanced (only one initiates).')"
            initial="0"
            name="balanced"
            :options="linkLayerModeOptions"
            :depend="s.connection_type === 'iec101'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Link layer address')"
            :help="$t('Unique address identifying a station on the communication link.')"
            :depend="s.connection_type === 'iec101'"
            name="link_layer_address"
            rules="irange(1,65534)"
            :required="s.enabled === '1'"
            initial="1"
          />
          <tlt-form-model-item
            v-if="s.connection_type === 'iec101'"
            element-id="size_of_link_layer_address"
            :label="$t('Size of link layer address')"
            :help="$t('Size of link layer address field in bytes.')"
          >
            <tlt-dummy-value :value="$t('%s bytes').format(2)" />
          </tlt-form-model-item>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Serial device')"
            :help="$t('Which serial port will be used for serial communication.')"
            name="device"
            :options="$serial.listDeviceNameTuples(serialDevices)"
            :depend="s.connection_type === 'iec101'"
            :required="s.enabled === '1'"
          />
          <serial-inline-warning
            v-show="s.connection_type === 'iec101'"
            :serial-status="serialStatus"
            :serial-devices="serialDevices"
            :initial-device="initialDevice"
            :device="s.device"
            service="IEC 60870-5 Server"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Baud rate')"
            :help="$t('Select serial device baud rate.')"
            name="baudrate"
            :options="serialOptions.baudRate"
            initial="9600"
            :depend="s.connection_type === 'iec101' && !!s.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Data bits')"
            :help="$t('Select how many bits will be used for character.')"
            name="databits"
            :options="serialOptions.dataBits"
            initial="8"
            :depend="s.connection_type === 'iec101' && !!s.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Stop bits')"
            :help="$t('Select how many stop bits will be used to detect the end of character.')"
            name="stopbits"
            :options="serialOptions.stopBits"
            initial="1"
            :depend="s.connection_type === 'iec101' && !!s.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Parity')"
            :help="$t('Select what kind of parity bit to use for error detection.')"
            name="parity"
            initial="none"
            :options="serialOptions.parity"
            :depend="s.connection_type === 'iec101' && !!s.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Full Duplex')"
            :help="$t(`Check to enable %s Full-Duplex.`).format(s.device)"
            name="full_duplex_enabled"
            :depend="serialOptions.duplex?.includes('half') && serialOptions.duplex?.includes('full')"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Flow control')"
            :help="$t('Select flow control mode.')"
            name="flowcontrol"
            initial="none"
            :options="serialOptions.flowControl"
            :depend="s.connection_type === 'iec101' && !!s.device"
            :required="s.enabled === '1'"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { computed, ref, inject, watch } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { getPinName, listDefaultPins, listAvailablePins, maxPinCount, listAvailableInformationObjects, refFormData, type InstanceConfiguration } from './IEC60870ServerCommon'
import { useMainStore } from '@/stores/main'
import { serial, SerialDevice, SerialStatus } from '@/plugins/serial'
import type { Io } from '@/types/ioTypes'
import SerialInlineWarning from '@/components/shared/SerialInlineWarning'
import { isArray } from '@ui-core/utils/inspect'

const $t = useTranslate()
const mainStore = useMainStore()

const props = defineProps<{ section: InstanceConfiguration }>()
const formData = refFormData()
const serialDevices = inject<SerialDevice[]>('serialDevices', [])
const serialStatus = inject<SerialStatus[]>('serialStatus', [])
const ioStatus = inject<Io[]>('ioStatus', [])
const hasWanZone = inject<bool>('hasWanZone', false)
const initialDevice = ref('')

function onAfterLoad() {
  initialDevice.value = props.section.device
}

const linkLayerModeOptions = [
  {
    name: $t('Unbalanced'),
    value: '0'
  },
  {
    name: $t('Balanced'),
    value: '1'
  }
]

const tabs = [
  { name: 'general', title: $t('General') },
  { name: 'connection', title: $t('Connection') }
]
const selectedTab = ref(tabs[0].name)

const connectionTypes = [['iec104', $t('IEC 104 (TCP)')]]
if (mainStore.hasSerial) {
  connectionTypes.push(['iec101', $t('IEC 101 (Serial)')])
}

const serialOptions = computed(() => {
  return serial.filterOptions(serialDevices.value, props.section.device, props.section)
})

const canSerialDeviceBeUsed = computed(() =>
  serial.canDeviceBeUsed({
    serialDevices: serialDevices.value,
    serialStatus: serialStatus.value,
    initialDevice: initialDevice.value,
    device: props.section.device,
    service: 'IEC 60870-5 Server'
  })
)

function onBeforeSave() {
  const section = props.section
  if (section.connection_type === 'iec104') {
    return Promise.resolve()
  }

  return serial.validateBeforeSave(serialStatus.value, formData.value.instances, 'IEC 60870-5 Server')
}

const availablePins = computed(() => listAvailablePins(ioStatus.value))

const configuredPins = computed(() => {
  if (props.section.configure_pins === '1' && props.section.pins) {
    const pins = props.section.pins.filter(pinId => pinId !== '')
    if (pins.length > 0) {
      return pins
    }
  }

  return listDefaultPins(ioStatus.value)
})

const availableInformationObjects = computed(() => listAvailableInformationObjects(ioStatus.value, configuredPins.value))

const informationObjectOptions = computed(() => {
  return availableInformationObjects.value.map(io => [io.name, io.title])
})

const pinOptions = computed(() => {
  return availablePins.value.map(pin => [pin.id, getPinName(pin)])
})

function doesInformationObjectExist(name: string) {
  return availableInformationObjects.value.some(io => io.name === name)
}

watch(availableInformationObjects, () => {
  const section = props.section
  if (isArray(section.spontaneous_information_objects)) {
    section.spontaneous_information_objects = section.spontaneous_information_objects.filter(doesInformationObjectExist)
  }
  if (isArray(section.cyclic_information_objects)) {
    section.cyclic_information_objects = section.cyclic_information_objects.filter(doesInformationObjectExist)
  }
})
</script>
