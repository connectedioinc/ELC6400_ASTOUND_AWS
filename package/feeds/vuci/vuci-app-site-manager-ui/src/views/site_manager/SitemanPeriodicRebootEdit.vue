<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="periodic_reboot"
    editing
    :before-save="() => validateSync(section, deviceStatus)"
  >
    <template #default="{ uciData }">
      <devman-apply-to-section
        :section="section"
        :mapped-groups="group"
        :mapped-devices="device"
        section-name="reboot scheduler"
      />
      <vuci-named-section
        v-slot="{ s }"
        :name="section.id"
        :title="$t('Reboot Scheduler')"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'site_manager/auto_reboot/scheduler/config' }]"
        :error-handlers="{ edit: handleEditErrors }"
        :exception-options="['dm_device_id', 'dm_group_id']"
        data-key="periodic_reboot"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Enable reboot instance.')"
          name="enable"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Action')"
          :help="$t('Action that will be executed at specified time.')"
          name="action"
          :options="actions"
          :depend="actions.length > 1"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Interval type')"
          :help="$t('Allows selecting between week and month days for instance intervals.')"
          :options="period"
          name="period"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Week days')"
          :help="$t('Week days, when the reboot should happen. At least one selected day is mandatory.')"
          :placeholder="$t('-- Please choose --')"
          :options="days"
          :depend="s.period === 'week'"
          name="days"
          multiple
          :required="s.enable === '1'"
        />
        <vuci-form-item-list
          :uci-section="s"
          :label="$t('Day time')"
          :help="$t('Day time when action should be executed.')"
          :initial="['12:00']"
          :required="s.enable === '1'"
          name="time"
          rules="time"
          placeholder="12:00"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Month day')"
          :help="$t('Day of a month when reboot will happen.')"
          :placeholder="$t('-- Please choose --')"
          :options="monthOpts"
          :depend="s.period === 'month'"
          name="month_day"
          rules="uinteger"
          multiple
          :required="s.enable === '1'"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Month')"
          :help="$t('Months when reboot will happen.')"
          :placeholder="$t('-- Please choose --')"
          :options="months"
          :depend="s.period === 'month'"
          name="months"
          multiple
          :required="s.enable === '1'"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Force last day')"
          :help="$t('Forces intervals to accept last day of month as valid option if selected day doesn\'t exist in ongoing month.')"
          name="force_last"
          :depend="s.period === 'month'"
        />
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
import { ref, computed, inject, onBeforeUnmount } from 'vue'
import DevmanApplyToSection from './SitemanApplyToSection.vue'
import { useDevmanCommonFunction, useGroupDeviceContext } from './SitemanCommon'
import { useTranslate } from '@ui-core/composables/useI18n'

defineProps({
  section: {
    type: Object,
    required: true
  }
})

const $t = useTranslate()

const { groups: group, devices: device } = useGroupDeviceContext()
const deviceStatus = inject('deviceStatus')

const formData = ref({})

const { editableSectionErrors, editErrors, removeDuplicateObjects, validateSync } = useDevmanCommonFunction()

const days = [
  ['mon', $t('Monday')],
  ['tue', $t('Tuesday')],
  ['wed', $t('Wednesday')],
  ['thu', $t('Thursday')],
  ['fri', $t('Friday')],
  ['sat', $t('Saturday')],
  ['sun', $t('Sunday')]
]
const months = [
  ['1', $t('January')],
  ['2', $t('February')],
  ['3', $t('March')],
  ['4', $t('April')],
  ['5', $t('May')],
  ['6', $t('June')],
  ['7', $t('July')],
  ['8', $t('August')],
  ['9', $t('September')],
  ['10', $t('October')],
  ['11', $t('November')],
  ['12', $t('December')]
]
const period = [
  ['week', $t('Week days')],
  ['month', $t('Month days')]
]
const actions = [['1', $t('Device reboot')]]

const monthOpts = computed(() => {
  const options = []
  for (let i = 1; i <= 31; i++) {
    options.push([`${i}`, `${i}`])
  }
  return options
})

function handleEditErrors(res) {
  const errorCode = res.data.errors[0].code
  if (errorCode === 21) {
    syncErrors.value = removeDuplicateObjects(res.data.errors[0].value, 'id')
  }
  if (!editableSectionErrors.value.includes(errorCode)) {
    formData.value.periodic_reboot = form.value.initialForm.periodic_reboot
  }
  return editErrors[errorCode] || editErrors.default
}

onBeforeUnmount(() => {
  if (syncErrors?.value?.length === 0) return
  // @ts-ignore
  if (typeof $bus !== 'undefined') $bus.emit('show-edit-error', syncErrors.value)
})

const form = ref()
const syncErrors = ref([])
</script>
