<template>
  <vuci-form
    ref="form"
    v-model="formData"
    editing
    config="ping_reboot"
    :before-save="() => validateSync(section, deviceStatus)"
  >
    <template #default="{ uciData }">
      <devman-apply-to-section
        :section="section"
        :mapped-groups="unref(group)"
        :mapped-devices="unref(device)"
        section-name="ping/wget reboot"
      />
      <vuci-named-section
        v-slot="{ s }"
        :name="section.id"
        :title="$t('Ping/Wget Reboot Settings')"
        :endpoints="[{ endpoint: 'site_manager/auto_reboot/ping_wget/config' }]"
        :error-handlers="{ edit: handleEditErrors }"
        :uci-data="uciData"
        :exception-options="['dm_device_id', 'dm_group_id']"
        data-key="ping_reboot"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Turns the rule on or off.')"
          name="enable"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Type')"
          :help="$t('Ping/Wget.')"
          name="type"
          :options="types"
          :load="displayType"
          @change="setType"
        />
        <tlt-inline-message
          v-show="s.type === 'port'"
          id="port-support-warning"
          :message="$t('Not all devices support this feature for all ports.')"
          type="warning"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Action if no echo is received')"
          :help="$t('Action that will be executed if there is no response after the specified amount of retries.')"
          name="action"
          :options="actions"
        />
        <vuci-form-item-list
          :uci-section="s"
          :label="$t('Phone number')"
          :help="$t('Phone number for the SMS to be sent to.')"
          name="number"
          :depend="s.action === '6'"
          placeholder="+37000000000"
          rules="phonedigit"
          :required="s.enable === '1'"
        />
        <vuci-form-item-text-area
          :uci-section="s"
          name="message"
          :label="$t('Message text')"
          :help="$t('Message to be sent. Allowed characters: (a-zA-Z0-9!@#$%&*+-/=?^_`{|}~.).')"
          :depend="s.action === '6'"
          rows="4"
          rules="fieldvalidation('^[a-zA-Z0-9!@#$%&*+-/=?^_`{|}~. ]+$',0)"
          rawhtml
          :required="s.enable === '1'"
          maxlength="480"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Interval')"
          :help="$t('Time interval between two ping/wget requests. E.g. if 5 min is selected, action will be performed at every 5th minute.')"
          name="time"
          :options="intervals"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Interval count')"
          :help="$t('Number of failed to receive responses before selected action is executed. Range [1 - 9999].')"
          name="retry"
          placeholder="2"
          rules="irange(1,9999)"
          :required="s.enable === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Timeout (sec)')"
          :help="$t('Time interval (in seconds) to wait for a response. Range [1 - 9999].')"
          name="time_out"
          placeholder="10"
          initial="10"
          :required="s.enable === '1'"
          rules="irange(1,9999)"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Ping by')"
          :help="$t('Ping IP\'s by Port or by IP.')"
          name="ping_port_type"
          :options="pingUsing"
          :depend="s.type === 'port'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('IP type')"
          name="ip_type"
          :options="ipTypes"
          :depend="(s.type === 'ping' && s.interface === '1') || (s.type === 'port' && s.ping_port_type === 'ping_ip')"
          @change="updateValidations"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('URL')"
          :help="$t('URL to which the wget requests will be sent. E.g. http://www.host.com')"
          name="url"
          :depend="s.type === 'wget'"
          placeholder="http://www.example.com"
          rules="protourl"
          :required="s.enable === '1'"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Host to ping')"
          :help="
            $t(
              'Hostname or IP address to which the ping requests will be sent. E.g. 1.1.1.1 \
          (or www.host.com if DNS server is configured correctly.)'
            )
          "
          name="host"
          :depend="(s.type === 'ping' && s.interface === '1') || (s.type === 'port' && s.ping_port_type === 'ping_ip')"
          :placeholder="s.ip_type === 'ipv4' ? '8.8.8.8' : '0000:0000:0000:0000:0000:0000:0000:0000'"
          :rules="s.ip_type === 'ipv4' ? 'ipv4host' : 'ipv6host'"
          :required="s.enable === '1'"
        />
        <vuci-form-item-custom
          :uci-section="s"
          name="port_host"
          :label="$t('Port to ping')"
          :help="$t('Port number and number of devices addresses to be pinged. (Number of devices connected must be less or equal to the actual number of connected devices to the port.)')"
          placeholder="variable"
          :depend="s.type === 'port' && s.ping_port_type === 'ping_port'"
          :input-props="parameterInputProps"
          allow-create
          :write-parse="saveParameters"
          inputs="select,input"
          separator="="
          :maxlines="12"
          :required="s.enable === '1'"
        >
          <template #input-select="{ row, column, rowValues, values, value }">
            <tlt-form-item-select
              :ref="`form-model-item-${row}-${column}`"
              :key="column"
              v-model="rowValues[column]"
              class="custom-input md:w-full min-w-0"
              v-bind="props"
              :prop="`edit.${props.section.id}_port_host_${row}_${column}`"
              :options="portList(values, value)"
              @change="_unitChange(rowValues[column])"
            />
          </template>
        </vuci-form-item-custom>
      </vuci-named-section>
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
import { ref, computed, inject, onBeforeUnmount, unref } from 'vue'
import DevmanApplyToSection from './SitemanApplyToSection.vue'
import { useDevmanCommonFunction, useGroupDeviceContext } from './SitemanCommon'
import { useTranslate } from '@ui-core/composables/useI18n'

const $t = useTranslate()

const props = defineProps({
  section: {
    type: Object,
    required: true
  }
})
const emit = defineEmits(['changedUnit'])

const renamePortList = inject('renamePortList')
const groupDeviceContext = useGroupDeviceContext()
const { groups: group, devices: device } = groupDeviceContext || { groups: ref([]), devices: ref([]) }
const deviceStatus = inject('deviceStatus')

const formData = ref({})
const pingType = ref('')

const { editableSectionErrors, editErrors, removeDuplicateObjects, validateSync } = useDevmanCommonFunction()

const types = [
  ['ping', $t('Ping')],
  ['wget', 'Wget'],
  ['port', $t('Port')]
]
const ipTypes = [
  ['ipv4', 'IPv4'],
  ['ipv6', 'IPv6']
]
const pingUsing = [
  ['ping_port', $t('Port')],
  ['ping_ip', 'IP']
]

const actions = computed(() => {
  const arr = [['3', $t('None')]]
  if (props.section.type !== 'port') {
    arr.push(['1', $t('Device reboot')])
  }
  if (props.section.type === 'port') {
    arr.push(['7', $t('Restart port')])
  }
  return arr
})

const intervals = computed(() => {
  const arr = []
  if (props.section.action !== '1') {
    arr.push(['1', $t('%s min').format(1)], ['2', $t('%s mins').format(2)], ['3', $t('%s mins').format(3)], ['4', $t('%s mins').format(4)])
  }
  arr.push(['5', $t('%s mins').format(5)], ['15', $t('%s mins').format(15)], ['30', $t('%s mins').format(30)], ['60', $t('%s hour').format(1)], ['120', $t('%s hour').format(2)])
  return arr
})

const parameterInputProps = computed(() => {
  const selectProps = {
    prop: 'ParamSelect',
    options: []
  }
  const inputProps = {
    prop: 'ParamInput',
    rules: ['min(1)', 'uinteger'],
    required: true,
    initial: '1'
  }
  return [selectProps, inputProps]
})

function _unitChange(unit) {
  emit('changedUnit', unit)
}

function generatePortList(count) {
  return Array.from({ length: count }, (_, i) => `port${i + 1}`)
}

function portList(usedPorts, value) {
  const defaultPorts = generatePortList(12)
  const ports = usedPorts.map(port => port[0])
  return renamePortList(
    defaultPorts.filter(port => port === value || !ports.includes(port)),
    true
  )
}

function handleEditErrors(res) {
  const errorCode = res.data.errors[0].code
  if (errorCode === 21) {
    syncErrors.value = removeDuplicateObjects(res.data.errors[0].value, 'id')
  }
  if (!editableSectionErrors.value.includes(errorCode)) {
    formData.value.ping_reboot = form.value.initialForm.ping_reboot
  }
  return editErrors[errorCode] || editErrors.default
}

function saveParameters(params) {
  return params ? params.join('=') : ''
}

function displayType(self) {
  pingType.value = self.uciSection.type
  return pingType.value
}

function setType(self, val) {
  pingType.value = val
}

function updateValidations(self) {
  self.vuciSection.validate()
}

onBeforeUnmount(() => {
  if (syncErrors?.value?.length === 0) return
  // @ts-ignore
  if (typeof $bus !== 'undefined') $bus.emit('show-edit-error', syncErrors.value)
})

const form = ref()
const syncErrors = ref([])
</script>
