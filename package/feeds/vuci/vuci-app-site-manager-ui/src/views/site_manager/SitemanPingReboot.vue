<template>
  <vuci-form
    v-model="formData"
    config="ping_reboot"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <vuci-typed-section
        :title="$t('Ping/Wget Reboot Settings')"
        :help="
          $t(
            'This section displays Ping/Wget Reboot rules. \\n          This service periodically sends ICMP or Wget requests to a specified IP address or host \\n          and waits for a response. If no response is received, the device will execute a specified action (reboot, by default). \\n          Click the \'Add\' button to create more rules.'
          )
        "
        type="ping_reboot"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'site_manager/auto_reboot/ping_wget/config' }]"
        :error-handlers="{
          edit: data => handleEditErrorsMixin(data, getDeviceNames),
          delete: handleDeleteErrors
        }"
        :add-validate="onAdd"
        data-key="ping_reboot"
        :columns="pingRebootColumns"
        :edit-form="pingRebootEdit"
      >
        <template #type="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayValue"
            name="type"
          />
        </template>
        <template #group="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayDevMan"
            name="dm_group_id"
          />
        </template>
        <template #action="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="val => actionList[val]"
            name="action"
          />
        </template>
        <template #time="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayValue"
            name="time"
          />
        </template>
        <template #time_out="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayValue"
            name="time_out"
          />
        </template>
        <template #retry="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayValue"
            name="retry"
          />
        </template>
        <template #host="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayHost"
            name="host"
          />
        </template>
        <template #enable="{ s }">
          <vuci-form-item-switch
            :uci-section="s"
            name="enable"
            @change="validateEnable"
          />
        </template>
      </vuci-typed-section>
    </template>
    <template #form-buttons="{ save }">
      <tlt-button
        class="ml-auto"
        button-id="saveandapply"
        @click="save"
      >
        {{ $t('Save & Sync') }}
      </tlt-button>
    </template>
  </vuci-form>
</template>
<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue'
import pingRebootEdit from './SitemanPingRebootEdit.vue'
import { useDevmanCommonFunction, provideGroupDeviceContext } from './SitemanCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { $bus } from '@ui-core/plugins/event-bus'
import { axios } from '@ui-core/plugins/axios'

const t = useTranslate()
const message = useMessages()
const formData = ref({})
const multipleHost = ref(false)
const simCount = ref(1)

const { mappedGroups, mappedDevices, removeDuplicateObjects, composeAlert, handleEditErrorsMixin, groups, deviceStatus, displayDevMan } = useDevmanCommonFunction()

const actionList = {
  1: t('Reboot'),
  2: t('Modem reboot'),
  3: t('None'),
  4: t('(Re)register')
}

const pingRebootColumns = [
  { name: 'type', label: t('Type'), help: t('Ping/Wget') },
  { name: 'group', label: t('Groups/Devices') },
  {
    name: 'action',
    label: t('Action'),
    help: t('Action that will be executed if there is no response after the specified amount of retries')
  },
  {
    name: 'time',
    label: t('Interval (min)'),
    help: t('Time interval between two ping/wget requests')
  },
  {
    name: 'time_out',
    label: t('Timeout (sec)'),
    help: t('Time interval (in seconds) to wait for a response')
  },
  {
    name: 'retry',
    label: t('Interval count'),
    help: t('Number of failed to receive responses before selected action is executed')
  },
  {
    name: 'host',
    label: t('Host'),
    help: t('Hostname, IP address or URL (if wget selected) to which the ping/wget requests will be sent. E.g. 1.1.1.1 (or www.host.com if DNS server is configured correctly)')
  },
  { name: 'enable' }
]

const onError = data => composeAlert(data, getDeviceNames)

onMounted(() => {
  $bus.on('show-edit-error', onError)
})

onUnmounted(() => {
  $bus.off('show-edit-error', onError)
})

function afterLoad() {
  return axios
    .bulkGet(['/api/site_manager/devices/status?exclude_firmware_status=1', '/api/site_manager/groups/config'])
    .then(([devs, group]) => {
      if (group.success) {
        formData.value.groups = group.data
        groups.value = group.data
      } else {
        message.error(t('Failed to load Site manager group data'))
      }
      if (devs.success) {
        formData.value.deviceStatus = devs.data
        deviceStatus.value = devs.data
      } else {
        message.error(t('Failed to load Site manager device status data'))
      }
    })
    .catch(() => {
      message.error(t('An unexpected error has occurred'))
    })
}

function displayValue(value) {
  if (typeof value === 'string') {
    return value.charAt(0).toUpperCase() + value.slice(1)
  }
  return '-'
}

function getPortValue(portHost) {
  const renamedPortList = renamePortList(portHost)
  return portHost.map(item => {
    const digital = item.split('=')
    const renamedPort = renamedPortList.find(val => val[0] === item)
    return renamedPort ? `${renamedPort[1]} = ${digital[1]}` : '-'
  })
}

function renamePortList(arr, fromCustom = false) {
  return arr
    .filter(item => item.startsWith('port'))
    .map(item => {
      const matches = fromCustom ? item.match(/\d+/) : item.match(/(\d+)=/)
      const num = (matches && fromCustom ? matches[0] : matches[1]) || ''
      return [item, t('Port %s').format(num)]
    })
}

provide('renamePortList', renamePortList)

// Provide mappedGroups and mappedDevices for child injection
provideGroupDeviceContext({
  groups: mappedGroups,
  devices: mappedDevices
})
provide('deviceStatus', deviceStatus)

function displayHost(val, self) {
  const section = self.uciSection
  const host = section.host
  const host1 = section.host1
  const host2 = section.host2
  const url = section.url
  const type = section.type

  if (type === 'wget') {
    multipleHost.value = false
    return url || '-'
  } else if (type === 'ping') {
    if (!host1 && !host2) {
      multipleHost.value = false
      return host || '-'
    }
    multipleHost.value = true
    return simCount.value === 1 ? (host1 ?? '-') : (host1 ?? '-') + ', ' + (host2 ?? '-')
  } else if (type === 'port') {
    const pingPortType = section.ping_port_type
    const portHost = section.port_host
    if (portHost && pingPortType === 'ping_port') {
      return '%s'.format(getPortValue(portHost).join(', '))
    }
    return host || '-'
  }
  multipleHost.value = false
  return '-'
}

function onAdd(_, dataSource) {
  if (dataSource.length >= 30) {
    return {
      valid: false,
      message: t("Can't create more instances. Only 30 instances are allowed")
    }
  }
  return { valid: true }
}

function validateEnable(self) {
  const sectionValues = self.uciSection
  if (sectionValues.enable === '1') {
    const requiredEnableOptions = []
    if (!sectionValues.action) {
      requiredEnableOptions.push(t('Action'))
    }
    if (!sectionValues.type) {
      requiredEnableOptions.push(t('Type'))
    }
    if (!sectionValues.time) {
      requiredEnableOptions.push(t('Interval'))
    }
    if (!sectionValues.retry) {
      requiredEnableOptions.push(t('Interval count'))
    }
    if (!sectionValues.time_out) {
      requiredEnableOptions.push(t('Timeout'))
    }
    if (sectionValues.type === 'wget' && !sectionValues.url) {
      requiredEnableOptions.push('URL')
    }
    if (sectionValues.type === 'ping') {
      if (!sectionValues.packet_size) {
        requiredEnableOptions.push(t('Packet size'))
      }
      if (!sectionValues.host && sectionValues.interface === '1') {
        requiredEnableOptions.push(t('Host to ping'))
      }
      if (!sectionValues.host1 && sectionValues.interface === '2') {
        requiredEnableOptions.push(t('Host to ping from SIM1'))
      }
      if (!sectionValues.host2 && sectionValues.interface === '2') {
        requiredEnableOptions.push(t('Host to ping from SIM2'))
      }
    }
    if (sectionValues.action === '6') {
      if (!sectionValues.number || sectionValues.number.every(x => x === '')) {
        requiredEnableOptions.push(t('Phone number'))
      }
      if (!sectionValues.message) {
        requiredEnableOptions.push(t('Message text'))
      }
    }
    if (requiredEnableOptions.length === 1) {
      message.error(t('Missing required option: %s').format(requiredEnableOptions))
      self.model = '0'
    }
    if (requiredEnableOptions.length > 1) {
      message.error(t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
      self.model = '0'
    }
  }
}

function handleDeleteErrors(res) {
  const errorCode = res.data.errors[0].code
  if (errorCode === 21) {
    formData.value.syncErrors = removeDuplicateObjects(res.data.errors[0].value, 'id')
    formData.value.ping_reboot = formData.value.ping_reboot.filter(section => section.id !== res.data.errors[0].section)
  }
  return handleEditErrorsMixin.editErrors[errorCode] || handleEditErrorsMixin.editErrors.default
}

function getDeviceNames(data) {
  return data.map(data => formData.value.deviceStatus?.find(device => device.mac === data.device_mac)?.custom_name) || []
}
</script>
