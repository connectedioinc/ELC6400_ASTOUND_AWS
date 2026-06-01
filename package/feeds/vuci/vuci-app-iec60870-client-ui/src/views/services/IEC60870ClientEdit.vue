<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="iec60870_client"
    :after-load="onAfterLoad"
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$utils.getModalTitle($t('IEC 60870-5 Client'), section.name)"
      :name="section.id"
      :endpoints="[{ endpoint: 'iec60870/client/instances/config' }]"
      :uci-data="uciData"
      :exception-options="['serial_device_id', 'information_objects']"
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
          />
          <serial-inline-warning
            v-show="s.connection_type === 'iec101'"
            :serial-status="serialStatus"
            :serial-devices="serialDevices"
            :initial-device="initialDevice"
            :device="serialDeviceOptions.device"
            service="IEC 60870-5 Client"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Name')"
            :help="$t('Name of the client. Used for easier device management purposes only.')"
            name="name"
            rules="no_control_codes"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Period')"
            :help="$t('Interval in seconds for sending requests to server.')"
            name="period"
            :required="s.enabled === '1'"
            rules="irange(1,86400)"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Originator address')"
            :help="$t('Address used to identify the source of the request within the IEC 60870-5 system.')"
            name="originator_address"
            :rules="['irange(0,100)', validateDuplicateOriginatorAddress]"
            :required="s.enabled === '1'"
            initial="1"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Timeout')"
            :help="$t('Time in seconds that the client waits for a response to an interrogation request.')"
            name="timeout"
            rules="irange(1,60)"
            :required="s.enabled === '1'"
          />

          <tlt-form-model-item>
            <tlt-hint :hints="getTestHint(s)">
              <vuci-form-item-button
                :uci-section="s"
                name="test"
                type="button"
                size="sm"
                :readonly="isTestRunning || getTestHint(s).length > 0"
                :loading="isTestRunning"
                :text="$t('Test')"
                @click="onTestClick"
              />
            </tlt-hint>
          </tlt-form-model-item>

          <tlt-form-model-item
            v-if="testResponse.length > 0"
            inline
            :label="$t('Test response')"
          >
            <tlt-text-area
              :model-value="testResponse"
              custom-id="test-output"
              rows="12"
              resize
              readonly
            />
          </tlt-form-model-item>
        </template>
        <template #connection>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Connection type')"
            :help="$t('Client connection type')"
            name="connection_type"
            :options="connectionTypes"
          />

          <!-- IEC104 (TCP) Options -->
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('IP Address')"
            :help="$t('IP address of server')"
            :depend="s.connection_type === 'iec104'"
            name="ip"
            rules="ip4addr"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port')"
            :help="$t('Specify port number the server is listening on.')"
            :depend="s.connection_type === 'iec104'"
            name="port"
            rules="port"
            :required="s.enabled === '1'"
          />

          <!-- IEC101 (Serial) Options -->
          <vuci-form-item-radio-group
            :uci-section="serialDeviceOptions"
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
            :help="$t('Unique address identifying the station on the communication link.')"
            :depend="s.connection_type === 'iec101'"
            name="link_layer_address"
            rules="irange(1,65534)"
            :required="s.enabled === '1'"
            initial="1"
          />
          <vuci-form-item-select
            :uci-section="serialDeviceOptions"
            :label="$t('Device')"
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
            :device="serialDeviceOptions.device"
            service="IEC 60870-5 Client"
          />
          <vuci-form-item-select
            :uci-section="serialDeviceOptions"
            :label="$t('Baud rate')"
            :help="$t('Select serial device baud rate.')"
            name="baudrate"
            initial="9600"
            :options="serialOptions?.baudRate"
            :depend="s.connection_type === 'iec101' && !!serialDeviceOptions.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-select
            :uci-section="serialDeviceOptions"
            :label="$t('Data bits')"
            :help="$t('Select how many bits will be used for character.')"
            name="databits"
            :options="serialOptions?.dataBits"
            initial="8"
            :depend="s.connection_type === 'iec101' && !!serialDeviceOptions.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-select
            :uci-section="serialDeviceOptions"
            :label="$t('Stop bits')"
            :help="$t('Select how many stop bits will be used to detect the end of character.')"
            name="stopbits"
            :options="serialOptions?.stopBits"
            initial="1"
            :depend="s.connection_type === 'iec101' && !!serialDeviceOptions.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-select
            :uci-section="serialDeviceOptions"
            :label="$t('Parity')"
            :help="$t('Select what kind of parity bit to use for error detection.')"
            name="parity"
            initial="none"
            :options="serialOptions?.parity"
            :depend="s.connection_type === 'iec101' && !!serialDeviceOptions.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-select
            :uci-section="serialDeviceOptions"
            :label="$t('Flow control')"
            :help="$t('Select flow control mode.')"
            name="flowcontrol"
            initial="none"
            :options="serialOptions?.flowControl"
            :depend="s.connection_type === 'iec101' && !!serialDeviceOptions.device"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-switch
            :uci-section="serialDeviceOptions"
            :label="$t('Full Duplex')"
            :help="$t(`Check to enable %s Full-Duplex`).format(serialDeviceOptions.device)"
            name="full_duplex_enabled"
            :depend="serialOptions?.duplex?.includes('half') && serialOptions?.duplex?.includes('full')"
          />
        </template>
        <template #information_objects>
          <vuci-form-item-radio-group
            :uci-section="s"
            :label="$t('Information object selection')"
            :help="$t('Should all information objects that are visible be saved.')"
            initial="1"
            name="information_objects_selection"
            :options="selectionOptions"
          />

          <vuci-form-item-list
            :uci-section="s"
            :depend="s.information_objects_selection === '1'"
            :label="$t('Common address')"
            :help="$t('List of common addresses from which information objects will be read.')"
            name="common_addresses"
            :maxlines="maxCommonAddresses"
            :initial="['1']"
            rules="irange(1,65534)"
            multiple
            :required="s.enabled === '1'"
          />

          <client-information-objects
            v-show="s.information_objects_selection === '0'"
            ref="information_objects"
            v-model:information-objects="s.information_objects"
            :uci-section="s"
            :uci-data="uciData"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import {
  refFormData,
  type InstanceConfiguration,
  maxInformationObjectsPerInstance,
  useSerialDevices,
  useSerialStatus,
  useSerialDeviceConfigurations,
  maxCommonAddresses,
  showInformationObjectErrors
} from './IEC60870ClientCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { serial } from '@/plugins/serial'
import SerialInlineWarning from '@/components/shared/SerialInlineWarning'
import ClientInformationObjects from './IEC60870ClientInformationObjectsTable'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

const $t = useTranslate()
const message = useMessages()
const props = defineProps<{ section: InstanceConfiguration }>()
const formData = refFormData()
const serialDevices = useSerialDevices([])
const serialStatus = useSerialStatus([])
const serialDeviceConfigurations = useSerialDeviceConfigurations([])

const informationObjectsInput = useTemplateRef('information_objects')

const initialDevice = ref('')
const serialDeviceOptions = ref({})

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

const selectionOptions = [
  {
    name: $t('All'),
    value: '1'
  },
  {
    name: $t('Custom'),
    value: '0'
  }
]

const tabs = [
  { name: 'general', title: $t('General') },
  { name: 'connection', title: $t('Connection') },
  { name: 'information_objects', title: $t('Information objects') }
]
const selectedTab = ref(tabs[0].name)

const connectionTypes = [['iec104', $t('IEC 104 (TCP)')]]
// TODO: Uncomment this when application supports serial
// if (mainStore.hasSerial) {
//   connectionTypes.push(['iec101', $t('IEC 101 (Serial)')])
// }

const serialOptions = computed(() => {
  return serial.filterOptions(serialDevices.value || [], serialDeviceOptions.value.device, serialDeviceOptions.value)
})

async function onBeforeSave() {
  const response = serial.validateBeforeSave(serialDevices.value, formData.value.instances, 'IEC 60870-5 Client', false)
  if (!response.isValid) {
    throw response.message
  }

  const section = props.section
  if (section.information_objects_selection === '1') {
    section.information_objects = []
  } else if (section.information_objects_selection === '0') {
    const response = await informationObjectsInput.value.validate()
    if (!response.isValid) {
      throw response.message
    }

    const informationObjects = section.information_objects || []
    if (informationObjects.length == 0) {
      throw $t('At least a single information object must be selected.')
    }
  }

  if (section?.information_objects?.length > maxInformationObjectsPerInstance) {
    throw $t('Maximum number of information objects has been reached.')
  }

  if (section.connection_type === 'iec101') {
    serialDeviceOptions.value.name = section.name
    serialDeviceOptions.value.enabled = section.enabled

    if (!section.serial_device_id) {
      let addResult
      try {
        addResult = await axios.post('/api/iec60870/client/serial_devices/config', { data: serialDeviceOptions.value })
      } catch {
        throw $t('Failed to update serial device settings.')
      }

      const serialDeviceConfiguration = addResult.data
      section.serial_device_id = serialDeviceConfiguration.id
      serialDeviceConfigurations.value.push(serialDeviceConfiguration)
    } else {
      try {
        await axios.put('/api/iec60870/client/serial_devices/config', { data: [serialDeviceOptions.value] })
      } catch {
        throw $t('Failed to update serial device settings.')
      }
    }
  } else if (section.connection_type === 'iec104') {
    if (section.serial_device_id) {
      try {
        await axios.delete(`/api/iec60870/client/serial_devices/config/${section.serial_device_id}`)
      } catch {
        throw $t('Failed to update serial device settings.')
      }
      section.serial_device_id = ''
    }
  }
}

function onAfterLoad() {
  if (props.section.serial_device_id) {
    serialDeviceOptions.value = serialDeviceConfigurations.value.find(serialDevice => serialDevice.id === props.section.serial_device_id) || {}
    initialDevice.value = serialDeviceOptions.value.device
  }

  // TODO: Remove this workaround when RUTOS1-31388 is resolved.
  const section = formData.value.instances.find(section => section.id === props.section.id)
  if (!section.information_objects_selection) {
    section.information_objects_selection = '1'
  }
  if (section.information_objects_selection === '1' && !section.information_objects_selection) {
    section.common_addresses = ['1']
  }
}

function validateDuplicateOriginatorAddress(value) {
  if (isNaN(Number(value))) {
    return { isValid: true }
  }

  const usedOriginatorAddressList = []

  const instance = props.section
  for (const otherInstance of formData.value.instances) {
    if (otherInstance.id === instance.id) {
      continue
    }

    if (instance.connection_type === 'iec104' && otherInstance.connection_type === 'iec104') {
      if (otherInstance.ip === instance.ip && otherInstance.port === instance.port) {
        usedOriginatorAddressList.push(otherInstance.originator_address)
      }
    } else {
      // TODO: Add IEC 101 (Serial) support
    }
  }

  if (usedOriginatorAddressList.includes(value)) {
    return {
      isValid: false,
      message: $t('Already in use by another instance.')
    }
  }

  return { isValid: true }
}

// ---------------------- Test button --------------------- //

const testResponse = ref('')
const isTestRunning = ref(false)

async function onTestClick(self) {
  if (!(await self.vuciSection.validate())) {
    return
  }

  const section = props.section
  const payload = {
    connection_type: section.connection_type,
    information_objects_selection: section.information_objects_selection,
    ip: section.ip,
    port: section.port
  }

  if (section.information_objects_selection === '0') {
    payload.information_objects = section.information_objects
  } else if (section.information_objects_selection === '1') {
    payload.common_addresses = section.common_addresses
  }

  // TODO: Add support for serial

  isTestRunning.value = true
  testResponse.value = ''

  try {
    const response = await axios.post(`/api/iec60870/client/actions/test_information_objects`, { data: payload })

    showInformationObjectErrors(response.data.errors)

    const customInformationObjectsListUsed = section.information_objects_selection === '0'
    const noErrorsOccured = response.data.errors.length == 0

    let notEnoughObjectsReceived = false
    if (customInformationObjectsListUsed && noErrorsOccured) {
      notEnoughObjectsReceived = props.section.information_objects.length > response.data.length

      if (notEnoughObjectsReceived) {
        message.error($t('Some information objects were not found'))
      }
    }

    let errorMessageShown = notEnoughObjectsReceived || !noErrorsOccured

    if (!errorMessageShown || response.data.information_objects.length > 0) {
      testResponse.value = JSON.stringify(response.data.information_objects, null, 4)
    }

    if (errorMessageShown) {
      if (testResponse.value !== '') {
        message.warning($t('Test partially successful'))
      }
    } else {
      message.success($t('Test successful'))
    }
  } catch (e) {
    message.error($t('Failed to test information objects'))
    return
  } finally {
    isTestRunning.value = false
  }
}

function getTestHint(section) {
  if (section.information_objects_selection === '0') {
    const informationObjects = section.information_objects || []
    if (informationObjects.length == 0) {
      return [{ info: $t('At least a single information object must be selected.') }]
    }
  }

  return []
}
</script>
