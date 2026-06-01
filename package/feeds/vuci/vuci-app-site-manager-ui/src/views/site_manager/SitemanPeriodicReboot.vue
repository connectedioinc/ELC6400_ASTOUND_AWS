<template>
  <vuci-form
    v-model="formData"
    config="periodic_reboot"
    :after-load="afterLoad"
  >
    <template #default="{ uciData }">
      <vuci-typed-section
        :title="$t('Reboot Scheduler')"
        :help="$t('Reboot Scheduler Instances')"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'site_manager/auto_reboot/scheduler/config' }]"
        data-key="periodic_reboot"
        type="reboot_instance"
        :error-handlers="{
          edit: data => handleEditErrorsMixin(data, getDeviceNames),
          delete: handleDeleteErrors
        }"
        :add-validate="onAdd"
        :columns="periodicRebootColumns"
        :edit-form="periodicRebootEdit"
      >
        <template #action="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayAction"
            name="action"
          />
        </template>
        <template #group="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayDevMan"
            name="dm_group_id"
          />
        </template>
        <template #period="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayPeriod"
            name="period"
          />
        </template>
        <template #days="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayDays"
            name="days"
          />
        </template>
        <template #months="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayMonths"
            name="months"
          />
        </template>
        <template #time="{ s }">
          <vuci-form-item-dummy
            :uci-section="s"
            :display-value="displayTime"
            name="time"
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
import { ref, provide, onMounted, onUnmounted } from 'vue'
import periodicRebootEdit from './SitemanPeriodicRebootEdit.vue'
import { useDevmanCommonFunction, provideGroupDeviceContext } from './SitemanCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { $bus } from '@ui-core/plugins/event-bus'
import { axios } from '@ui-core/plugins/axios'

const t = useTranslate()
const message = useMessages()
const formData = ref({})

const { mappedGroups, mappedDevices, removeDuplicateObjects, composeAlert, handleEditErrorsMixin, groups, deviceStatus, displayDevMan } = useDevmanCommonFunction()

const dayTitles = {
  mon: t('Mon'),
  tue: t('Tue'),
  wed: t('Wed'),
  thu: t('Thu'),
  fri: t('Fri'),
  sat: t('Sat'),
  sun: t('Sun')
}
const monthTitles = [t('Jan'), t('Feb'), t('Mar'), t('Apr'), t('May'), t('Jun'), t('Jul'), t('Aug'), t('Sep'), t('Oct'), t('Nov'), t('Dec')]

const periodicRebootColumns = [
  {
    name: 'action',
    label: t('Action'),
    help: t('Action that will be executed at specified time')
  },
  { name: 'group', label: t('Groups/Devices') },
  { name: 'period', label: t('Interval type'), help: t('Week days/Month days') },
  { name: 'days', label: t('Days'), help: t('Days when action should be executed') },
  { name: 'time', label: t('Time'), help: t('Day time when action should be executed') },
  {
    name: 'months',
    label: t('Months'),
    help: t('Months when action should be executed')
  },
  { name: 'enable' }
]

provideGroupDeviceContext({
  groups: mappedGroups,
  devices: mappedDevices
})
provide('deviceStatus', deviceStatus)

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
        groups.value = group.data
      } else {
        message.error(t('Failed to load Site manager group data'))
      }
      if (devs.success) {
        deviceStatus.value = devs.data
      } else {
        message.error(t('Failed to load Site manager device status data'))
      }
    })
    .catch(() => {
      message.error(t('An unexpected error has occurred'))
    })
}

function displayAction(action) {
  if (action === '1') return t('Reboot')
  if (action === '2') return t('Modem reboot')
  return '-'
}

function displayDays(_, self) {
  const section = self.uciSection
  if (!section.period) return '-'
  if (section.period === 'week' && (!section.days || section.days.length === 0)) return '-'
  if (section.period === 'month' && (!section.month_day || section.month_day.length === 0)) return '-'
  return section.period === 'week' ? section.days.map(day => dayTitles[day]).join(', ') : section.month_day.map(day => day).join(', ')
}

function displayTime(time) {
  if (!time || time.length === 0) return '-'
  return time.join(', ')
}

function displayPeriod(period) {
  if (period === 'week') return t('Week days')
  if (period === 'month') return t('Month days')
  return '-'
}

function displayMonths(months) {
  if (!months || months.length === 0) return '-'
  return months.map(month => monthTitles[month - 1]).join(', ')
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
  if (self.model === '0' || sectionValues.enable !== '1') return
  const requiredEnableOptions = []
  if (!sectionValues.action) {
    requiredEnableOptions.push(t('Action'))
  }
  if (!sectionValues.period) {
    requiredEnableOptions.push(t('Interval type'))
  }
  if (!sectionValues.time || sectionValues.time.every(x => x === '')) {
    requiredEnableOptions.push(t('Day time'))
  }
  if (sectionValues.period === 'month') {
    if (!sectionValues.months || sectionValues.months.every(x => x === '')) {
      requiredEnableOptions.push(t('Month'))
    }
    if (!sectionValues.month_day) {
      requiredEnableOptions.push(t('Month day'))
    }
  }
  if (sectionValues.period === 'week') {
    if (!sectionValues.days || sectionValues.days.every(x => x === '')) {
      requiredEnableOptions.push(t('Week days'))
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

function getDeviceNames(data) {
  return data.map(data => deviceStatus.value?.find(device => device.mac === data.device_mac)?.custom_name) || []
}

function handleDeleteErrors(res) {
  const errorCode = res.data.errors[0].code
  if (errorCode === 21) {
    formData.value.syncErrors = removeDuplicateObjects(res.data.errors[0].value, 'id')
    formData.value.periodic_reboot = formData.value.periodic_reboot.filter(section => section.id !== res.data.errors[0].section)
  }
  return editErrors[errorCode] || editErrors.default
}
</script>
