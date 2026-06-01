<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="iec60870_server"
    :after-load="onAfterLoad"
    :before-save="onBeforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :uci-data="uciData"
      data-key="global"
      :title="$t('IEC 60870-5 Server general')"
      :endpoints="[{ endpoint: 'iec60870/server/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable/disable IEC 60870-5 server service.')"
      />
      <tlt-form-model-item
        element-id="status"
        :help="$t('Status of service, whether it is currently running. If it is active, it will also show how long it has been running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="isOnline ? $t('Up') : $t('Down')"
          :class="isOnline ? 'success' : 'error'"
        />
        <tlt-dummy-value
          v-if="isOnline"
          :value="'(%t)'.format(appStatus?.uptime || '')"
        />
      </tlt-form-model-item>
    </vuci-named-section>

    <vuci-typed-section
      :uci-data="uciData"
      :edit-form="markRaw(EditForm)"
      :form-methods="['get', 'create', 'edit', 'delete']"
      :endpoints="[{ endpoint: 'iec60870/server/instances/config' }]"
      :title="$t('IEC 60870-5 Servers')"
      :add="beforeAdd"
      :add-validate="validateBeforeAdd"
      type="instance"
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
              :value="$serial.deviceDisplayValue(s.device)"
            />
            <cell-row
              v-if="s.connection_type === 'iec104'"
              :label="$t('Port')"
              :value="s.port"
            />
          </card-cell>
          <instance-status :status="getInstanceStatus(s.id, s.connection_type)" />
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
              service="IEC 60870-5 Server"
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
import { markRaw, ref, provide, onMounted, onUnmounted, computed } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import EditForm from './IEC60870ServerEdit.vue'
import InstanceStatus from './IEC60870ServerStatus.vue'
import { refFormData, getInitialName, type InstanceConfiguration, maxInstances } from './IEC60870ServerCommon'
import { serial, SerialDevice, SerialStatus } from '@/plugins/serial'
import { useTimer } from '@ui-core/composables/useTimer'
import SerialHint from '@/components/shared/SerialHint'
import { useMainStore } from '@/stores/main'
import { io } from '@/plugins/io'
import type { Io } from '@/types/ioTypes'
import type { Zone } from '@/types/firewallTypes'

type FirewallZone = Pick<Zone, 'name'>

const $t = useTranslate()
const mainStore = useMainStore()
const formData = refFormData()
const message = useMessages()
const serialDevices = ref<SerialDevice[]>([])
const serialStatus = ref<SerialStatus[]>([])
const ioStatus = ref<Io[]>([])
provide('serialDevices', serialDevices)
provide('serialStatus', serialStatus)
provide('ioStatus', ioStatus)

const firewallZones = ref<FirewallZone[]>([])
const hasWanZone = computed(() => firewallZones.value.find(zone => zone.name === 'wan') !== undefined)
provide('hasWanZone', hasWanZone)

const appStatus = ref({})
const isOnline = computed(() => appStatus.value.uptime !== undefined)

const timer = useTimer({
  method: async () => {
    let response
    try {
      response = await axios.get('/api/iec60870/server/status')
    } catch (e) {
      const errors = e.response.data?.errors || []
      const serviceNotRunningError = errors.some(err => err.code === 4)
      if (serviceNotRunningError) {
        appStatus.value = {}
      } else {
        message.error($t('Failed to load service status'))
      }

      return
    }

    appStatus.value = response.data
  },
  time: 3 * 1000,
  autostart: false,
  immediate: true
})

function showConnectionType(instance: InstanceConfiguration) {
  const connectionTypeTranslations = {
    iec101: $t('IEC 101 (Serial)'),
    iec104: $t('IEC 104 (TCP)')
  }

  return connectionTypeTranslations[instance.connection_type] || '-'
}

function onAfterLoad() {
  return axios
    .bulkGet([
      '/api/system/device/status',
      '/api/firewall/zones/config',
      {
        endpoint: '/api/serial/status',
        condition: mainStore.hasSerial
      },
      {
        endpoint: '/api/io/status',
        condition: mainStore.board?.hwinfo?.ios
      }
    ])
    .then(responses => {
      const deviceStatusResponse = responses.shift()
      if (deviceStatusResponse.success) {
        serialDevices.value = deviceStatusResponse.data.board.serial || []
      } else {
        message.error($t('Failed to load device status'))
      }

      const firewallZonesResponse = responses.shift()
      if (firewallZonesResponse.success) {
        firewallZones.value = firewallZonesResponse.data
      } else {
        message.error($t('Failed to load firewall zones'))
      }

      const serialStatusResponse = responses.shift()
      if (serialStatusResponse.success) {
        serialStatus.value = serialStatusResponse.data
      } else {
        message.error($t('Failed to load serial status'))
      }

      const ioStatusResponse = responses.shift()
      if (ioStatusResponse.success) {
        ioStatus.value = io.getFilteredPinsInfo(ioStatusResponse.data || [])
      } else {
        message.error($t('Failed to load I/O status'))
      }
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
}

function beforeAdd(section) {
  section.name = getInitialName(formData.value.instances, $t('Server'))
  section.port = '2404'
  section.common_address = '1'
  section.connection_type = 'iec104'
  section.spontaneous_enabled = '0'
  section.cyclic_enabled = '0'
}

function getInstanceStatus(id, connection_type) {
  const instances = appStatus.value?.instances || []
  return instances.find(instance => instance.id === id && instance.connection_type === connection_type)
}

function onBeforeSave() {
  return new Promise((resolve, reject) => {
    const response = serial.validateBeforeSave(serialDevices.value, formData.value.instances, 'IEC 60870-5 Server', false)
    if (!response.isValid) reject(response.message)
    resolve()
  })
}

function validateBeforeAdd(_, sections) {
  if (sections.length >= maxInstances) {
    return { valid: false, message: $t('Maximum number of instances has been reached') }
  }

  return { valid: true }
}

function canToggleEnable(section) {
  if (!section.common_address) {
    return false
  }

  if (section.cyclic_enabled === '1' && !section.cyclic_period) {
    return false
  }

  const connection_type = section.connection_type || 'iec104'
  if (connection_type === 'iec104') {
    if (!section.port) {
      return false
    }
  } else if (connection_type === 'iec101') {
    if (!section.link_layer_address || !section.device) {
      return false
    }
  }

  return true
}

function getEnableHint(section) {
  return !canToggleEnable(section) ? [{ info: $t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values.') }] : []
}

onMounted(() => {
  timer.start()
})

onUnmounted(() => {
  timer.stop()
})
</script>
