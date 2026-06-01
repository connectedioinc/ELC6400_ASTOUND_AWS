<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="iec60870_client"
    :after-load="onAfterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :uci-data="uciData"
      data-key="global"
      :title="$t('IEC 60870-5 Client general')"
      :endpoints="[{ endpoint: 'iec60870/client/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Enable/disable IEC 60870-5 client service.')"
      />

      <tlt-form-model-item
        element-id="status"
        :help="$t('Status of service, whether it is currently running. If it is active, it will also show how long it has been running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="isOnline ? $t('Active') : $t('Inactive')"
          :class="isOnline ? 'success' : 'error'"
        />
        <tlt-dummy-value
          v-if="isOnline"
          :value="'(%t)'.format(serviceStatus?.uptime || '')"
        />
      </tlt-form-model-item>
    </vuci-named-section>

    <vuci-typed-section
      :uci-data="uciData"
      :edit-form="markRaw(EditForm)"
      :form-methods="['get', 'create', 'edit', 'delete']"
      :endpoints="[{ endpoint: 'iec60870/client/instances/config' }]"
      :title="$t('IEC 60870-5 Clients')"
      :before-add="beforeAdd"
      :add-validate="validateBeforeAdd"
      :after-delete="afterDelete"
      type="client"
      data-key="instances"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
        >
          <name-cell
            :index="index + 1"
            :value="$utils.valueOrBlank(s.name)"
          />
          <card-cell>
            <cell-row
              :label="$t('Connection')"
              :value="showConnectionType(s)"
            />
            <cell-row
              v-if="s.connection_type === 'iec101'"
              :label="$t('Serial device')"
              :value="$serial.deviceDisplayValue(getSerialDevice(s))"
            />
            <cell-row
              v-if="s.connection_type === 'iec104'"
              :label="$t('Port')"
              :value="s.port"
            />
          </card-cell>
          <client-instance-status :status="getInstanceStatus(s.id)" />
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  :actions="actions"
                />
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <serial-hint
              v-slot="{ disabled }"
              :serial-status="serialStatus"
              :serial-devices="serialDevices"
              :device="s.device"
              :hidden="s.enabled === '1' || s.connection_type !== 'iec101' || !canToggleEnable(s)"
              service="IEC 60870-5 Client"
            >
              <vuci-form-item-switch
                :uci-section="s"
                name="enabled"
                initial="1"
                :hints="getEnableHint(s)"
                :readonly="disabled || !canToggleEnable(s)"
              />
            </serial-hint>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { markRaw, ref, computed } from 'vue'
import { refFormData, getInitialName, type InstanceStatus, maxInstances, provideSerialDevices, provideSerialStatus, provideSerialDeviceConfigurations } from './IEC60870ClientCommon'
import EditForm from './IEC60870ClientEdit.vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { useMainStore } from '@/stores/main'
import SerialHint from '@/components/shared/SerialHint'
import { useMessages } from '@/stores/messages'
import { useTimer } from '@ui-core/composables/useTimer'
import ClientInstanceStatus from './IEC60870ClientStatus'

const $t = useTranslate()
const mainStore = useMainStore()
const formData = refFormData()
const message = useMessages()
const serialDeviceConfigurations = ref([])
const serialDevices = ref([])
const serialStatus = ref([])
provideSerialDevices(serialDevices)
provideSerialStatus(serialStatus)
provideSerialDeviceConfigurations(serialDeviceConfigurations)

function beforeAdd(section) {
  section.name = getInitialName(formData.value.instances, $t('Client'))
  section.period = '60'
  section.timeout = '5'
  section.port = '2404'
}

async function afterDelete(instance: InstanceConfiguration) {
  if (instance.serial_device_id) {
    try {
      await axios.delete(`/api/iec60870/client/serial_devices/config/${section.serial_device_id}`)
    } catch {
      throw $t('Failed to update serial device settings')
    }
  }

  delete formData[`read_request_${instance.id}`]
}

function showConnectionType(instance: InstanceConfiguration) {
  if (instance.connection_type === 'iec101') {
    return $t('IEC 101 (Serial)')
  } else if (instance.connection_type === 'iec104') {
    return $t('IEC 104 (TCP)')
  }

  return '-'
}

function getSerialDevice(instance: InstanceConfiguration) {
  const serialDeviceId = instance.serial_device_id
  if (!serialDeviceId) return

  return serialDeviceConfigurations.value.find(serialDevice => serialDevice.id === serialDeviceId)?.device
}

function onAfterLoad() {
  return axios
    .bulkGet([
      '/api/system/device/status',
      // TODO: Uncomment this when application supports serial
      // { endpoint: '/api/iec60870/client/serial_devices/config', condition: mainStore.hasSerial }
      { endpoint: '/api/serial/status', condition: mainStore.hasSerial }
    ])
    .then(responses => {
      const additionalFormData = {}

      const deviceStatusResponse = responses.shift()
      if (deviceStatusResponse.success) {
        serialDevices.value = deviceStatusResponse.data.board.serial || []
      } else {
        message.error($t('Failed to load device status'))
      }

      // TODO: Uncomment this when application supports serial
      // const serialDevicesResponse = responses.shift()
      // if (serialDevicesResponse.success) {
      //   serialDeviceConfigurations.value = serialDevicesResponse.data
      // } else {
      //   message.error($t('Failed to load serial devices'))
      // }

      const serialStatusResponse = responses.shift()
      if (serialStatusResponse.success) {
        serialStatus.value = serialStatusResponse.data
      } else {
        message.error($t('Failed to load serial status'))
      }

      return additionalFormData
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function validateBeforeAdd(_, sections) {
  if (sections.length >= maxInstances) {
    return { valid: false, message: $t('Maximum number of instances has been reached') }
  }

  return { valid: true }
}

function canToggleEnable(section) {
  if (!section.period || !section.originator_address || !section.timeout) {
    return false
  }

  const connection_type = section.connection_type || 'iec104'
  if (connection_type === 'iec104') {
    if (!section.ip || !section.port) {
      return false
    }
  } else if (connection_type === 'iec101') {
    // TODO:
  }

  return true
}

function getEnableHint(section) {
  return !canToggleEnable(section) ? [{ info: $t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values.') }] : []
}

// -------------------- Service status ------------------ //

const serviceStatus = ref<ServiceStatus | undefined>()
const isOnline = computed(() => serviceStatus.value?.uptime !== undefined)

useTimer({
  method: () => {
    return axios
      .get('/api/iec60870/client/status')
      .then(response => {
        serviceStatus.value = response.data
      })
      .catch(e => {
        const errors = e.response.data?.errors || []
        const serviceNotRunningError = errors.some(err => err.code === 4)
        if (serviceNotRunningError) {
          serviceStatus.value = undefined
        } else {
          message.error($t('Failed to load service status'))
        }

        return
      })
  },
  time: 3 * 1000,
  autostart: true,
  immediate: true
})

function getInstanceStatus(id: string): InstanceStatus | undefined {
  const instances = serviceStatus.value?.instances || []
  return instances.find(instance => instance.id === id)
}
</script>
