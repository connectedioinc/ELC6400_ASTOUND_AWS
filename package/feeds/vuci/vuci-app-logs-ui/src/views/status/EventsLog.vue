<template>
  <tlt-table
    :id="eventType + '_events'"
    ref="tableRef"
    :columns="columns"
    :per-page-text="$t('Events per page')"
    :data-source="defaultDataLoader('/api/events_log/config')"
    sid="events_log"
    :title="$t('Events log')"
    :help="$t('The Events Log section contains a chronological list of various events related to the device.')"
    :table-actions="tableActions"
    @data-loaded="$notification.remove(sideMessageTxt)"
    @data-loaded-error="onError"
  >
    <template #group="{ record }">
      {{ $capitalize(record.group) }}
    </template>
    <template #type="{ record }">
      {{ $capitalize(record.type) }}
    </template>
  </tlt-table>
</template>

<script setup lang="ts">
import { ref, computed, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { axios } from '@ui-core/plugins/axios'
import { utils } from '@/plugins/utils'
import { useNotifications } from '@/stores/messages'
import { capitalize } from '@ui-core/plugins/helper'
import { defaultDataLoader, type TablePagination } from '@ui-core/components/table'

interface EventLogEntry {
  id: number
  date: string
  event_type: string
  group: string
  type: string
  event: string
}

const $t = useTranslate()
const message = useMessages()
const notification = useNotifications()

const route = useRoute()
const tableRef = useTemplateRef<typeof TablePagination>('tableRef')
const eventLogData = ref<EventLogEntry[]>([])
const disableExport = ref(false)
const sideMessageTxt = ref($t('Events Log could not be accessed because the database is being optimized. This process can take up to five minutes.'))

const eventTypes = {
  all: '',
  general: '/events',
  system: '/system',
  network: '/network',
  connections: '/connections'
}

const eventType = computed(() => {
  const type = route.path.substring(route.path.lastIndexOf('/') + 1)
  return eventTypes[type as keyof typeof eventTypes] || ''
})

const columns = computed(() => [
  { dataIndex: 'id', title: $t('ID'), actions: { sort: true } },
  { dataIndex: 'date', title: $t('Date'), width: 'sm', actions: { sort: true } },
  { dataIndex: 'event_type', title: $t('Source'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
  {
    dataIndex: 'group',
    title: $t('Event group'),
    actions: { sort: true, filter: { type: 'uniqueValues' } },
    displayFn: (v: string) => capitalize(v)
  },
  {
    dataIndex: 'type',
    title: $t('Event type'),
    actions: { sort: true, filter: { type: 'uniqueValues' } },
    displayFn: (v: string) => capitalize(v)
  },
  { dataIndex: 'event', width: 'xl', title: $t('Event'), actions: { sort: true } }
])

const tableActions = computed(() => [
  {
    id: 'download-logs',
    callback: () => exportEventLog(),
    buttonProps: { iconLeft: 'download-import', disabled: disableExport.value },
    label: $t('Export logs')
  },
  {
    id: 'refresh',
    callback: () => tableRef.value?.loadLazyData(),
    buttonProps: { iconLeft: 'refresh' },
    label: $t('Refresh')
  },
  'column-list',
  'search'
])

const onError = (error: any) => {
  if (error?.response?.data.errors.some((i: any) => i.code === 1)) {
    notification.error(sideMessageTxt.value)
  }
  message.error($t('Failed to load events'))
}

const loadAllEvents = () => {
  disableExport.value = true
  return axios
    .get('/api/events_log/config')
    .then(({ data }: { data: EventLogEntry[] }) => {
      eventLogData.value = data
      message.success($t('Events log download was successful'))
    })
    .catch(() => {
      message.error($t('Failed to download events log'))
    })
    .finally(() => {
      disableExport.value = false
    })
}

const exportEventLog = async () => {
  await loadAllEvents()
  const headers = ['ID', $t('Date'), $t('Source'), $t('Event group'), $t('Event type'), $t('Event')]
  const rows = eventLogData.value.map(entry => [entry.id, entry.date, entry.event_type, entry.group, entry.type, entry.event]).reverse()
  utils.generateCsv('eventlog-data', [headers, ...rows])
}
</script>
