<template>
  <tlt-table
    id="attack-prevention-table"
    :columns="cols"
    :data-source="dataList"
    :table-actions="['link', 'column-list', 'search']"
    :title="$t('Attack prevention')"
    @refresh="load"
  >
    <template #link>
      <link-to-page
        :icon="null"
        path="/system/admin/access_control/general"
      >
        <table-action
          id="access-control"
          icon="external-link"
        >
          {{ $t('Access control') }}
        </table-action>
      </link-to-page>
    </template>
    <template #enabled="{ record }">
      <tlt-form-item-switch
        prop="enabled"
        true-value="1"
        false-value="0"
        :model-value="getEnabled(record)"
        @update:model-value="(value: '0' | '1') => setEnabled(record.id, value)"
      />
    </template>
    <template #edit="{ record }">
      <tlt-button
        :disabled="false"
        button-id="edit"
        :icon-left="$store.readOnlyPage ? 'password' : 'edit'"
        size="md"
        type="text"
        @click="editType = record.id"
      >
        {{ $store.readOnlyPage ? $t('View') : $t('Edit') }}
      </tlt-button>
    </template>
  </tlt-table>
  <div class="flex justify-end list-layout--ignore">
    <tlt-button
      button-id="saveandapply"
      @click="save"
    >
      {{ $t('Save & Apply') }}
    </tlt-button>
  </div>
  <tlt-modal
    :open="!!editType"
    :nav-bar="[$t('%s configuration').format(parsedNames[editType!])]"
    @close="closeModal"
  >
    <attack-prevention-edit
      v-model:type="editType"
      v-model:model-value="formData"
      @update:model-value="setDefaults"
    />
  </tlt-modal>
</template>

<script lang="ts" setup>
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { axios } from '@ui-core/plugins/axios'
import { computed, onMounted, ref } from 'vue'
import AttackPreventionEdit from './AttackPreventionEdit.vue'
import { isGenericAttack, useCommon, type AttackSection, type FormModel, type GenericAttack } from './AttackPreventionCommon'
import { copy } from '@ui-core/utils/vue-helpers'
import { useMessages, usePrompt } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import type { TableColumn } from '@ui-core/components/table/types'
import LinkToPage from '@/components/shared/LinkToPage.vue'

const $t = useTranslate()
const store = useMainStore()
const message = useMessages()
const prompt = usePrompt()

const { parsedNames } = useCommon()

const formData = ref<FormModel>({})

const serviceOrder: AttackSection['id'][] = ['ssh', 'http', 'https', 'icmp', 'port_scan', 'syn_flood']
const dataList = computed(() => copy(Object.values(formData.value)))

const editType = ref<AttackSection['id'] | null>(null)

const cols = computed<TableColumn[]>(() => [
  { dataIndex: 'id', title: $t('Attack type'), displayFn: value => parsedNames[value] },
  {
    dataIndex: 'enabled',
    title: $t('Enabled'),
    help: $t('Enable attack from WAN zone prevention (except SYN flood which applies to all zones).')
  },
  { dataIndex: 'edit', title: $t('Advanced settings') }
])

function closeModal() {
  prompt.show({
    title: $t('Go back?'),
    content: $t('Unsaved changes will be discarded'),
    okText: $t('Discard'),
    cancelText: $t('Cancel'),
    onOk: () => {
      editType.value = null
    }
  })
}

onMounted(async () => {
  return load()
})

async function load() {
  store.spin($t('Loading...'))
  const endpoints = serviceOrder.map(key => `/api/attack_prevention/${key}/config/general`)
  return axios
    .bulkGet(endpoints)
    .then(data => {
      if (!utils.noErrors(data)) {
        const failedToLoad = data.map((e, i) => (e.success ? undefined : parsedNames[serviceOrder[i]])).filter((e): e is string => !!e)
        const formatedFailedLoad = utils.formatList(failedToLoad)
        if (data.every(e => e.success === true || e.errors?.[0]?.code === 122)) {
          // This might be not needed after https://git.teltonika.lt/teltonika/rutx_open/-/issues/5328
          message.warning($t('Related %s traffic rules were not found. These prevention(s) were hidden.').format(formatedFailedLoad))
        } else message.error($t('Failed to load %s attack prevention rules').format(formatedFailedLoad))
      }
      serviceOrder.forEach((key, index) => {
        if (!data[index].success) return
        formData.value[key as keyof FormModel] = { ...data[index].data, id: key }
      })
      setDefaults()
    })
    .catch(() => message.error($t('An unexpected error occurred')))
    .finally(() => store.spin(false))
}

const defaults = {
  ssh: { period: 'day', limit: '100', limit_burst: '100' },
  http: { period: 'minute', limit: '120', limit_burst: '120' },
  https: { period: 'minute', limit: '120', limit_burst: '120' },
  icmp: { period: 'minute', limit: '60', limit_burst: '60' },
  port_scan: { hitcount: '120', seconds: '60' },
  syn_flood: { limit: '25', limit_burst: '50' }
} as const satisfies Record<string, { period?: GenericAttack['period']; limit: string; limit_burst: string } | { hitcount: string; seconds: string }>

async function setDefaults() {
  serviceOrder.forEach(key => {
    const section = formData.value[key]
    if (!section) return
    if (isGenericAttack(section)) {
      section.limit ??= defaults[section.id].limit
      section.limit_burst ??= defaults[section.id].limit_burst
      section.period ??= defaults[section.id].period
    } else if (section.id === 'port_scan') {
      section.hitcount ??= defaults.port_scan.hitcount
      section.seconds ??= defaults.port_scan.seconds
    } else if (section.id === 'syn_flood') {
      section.synflood_rate ??= defaults.syn_flood.limit
      section.synflood_burst ??= defaults.syn_flood.limit_burst
    }
  })
}

async function save() {
  store.spin($t('Waiting for configuration to be applied...'))
  const keys = Object.keys(formData.value)
  const requests = keys.map(key => ({ endpoint: `/api/attack_prevention/${key}/config/general`, method: 'PUT', data: { ...formData.value[key as keyof FormModel], id: undefined } }))
  return axios
    .bulk(requests)
    .then(data => {
      if (!utils.noErrors(data)) return message.error($t('Failed to edit configuration'))
      Object.keys(formData.value).forEach((key, index) => {
        formData.value[key as keyof FormModel] = { ...data[index].data, id: key }
      })
      setDefaults()
      message.success($t('Configuration has been applied'))
    })
    .catch(() => {
      message.error($t('An unexpected error occurred'))
    })
    .finally(() => {
      store.spin(false)
    })
}

function getEnabled(section: AttackSection) {
  if (isGenericAttack(section)) {
    return section[`${section.id}_limit`]
  }
  if (section.id === 'port_scan') {
    return section.port_scan
  }
  return section.syn_flood
}

function setEnabled(id: AttackSection['id'], enabled?: '1' | '0'): void {
  if (!enabled) return
  if (!id) return
  const section = formData.value[id]
  if (!section) return
  const oldSection = copy(section)
  if (isGenericAttack(section)) {
    if (section[`${id}_limit`] === enabled) return
    section[`${id}_limit`] = enabled
  } else if (section.id === 'port_scan') {
    if (section.port_scan === enabled) return
    section.port_scan = enabled
    section.x_max = enabled
    section.nmap_fin = enabled
    section.null_flags = enabled
    section.syn_fin = enabled
    section.syn_rst = enabled
    if (JSON.stringify({ ...oldSection, port_scan: undefined }) !== JSON.stringify({ ...section, port_scan: undefined })) {
      message.info($t('Some advanced settings for port scan protection were changed.'))
    }
  } else {
    const changed = section.syn_flood !== enabled
    section.syn_flood = enabled
    section.tcp_syncookies = changed ? enabled : section.tcp_syncookies
  }
}
</script>
