<template>
  <tlt-form
    ref="formRef"
    sid="interface-members-form"
    :model="form"
  >
    <tlt-card :title="$t('Status')">
      <tlt-alert
        v-if="cardStatus.length && statusLoaded && !Object.keys(ifaceStatus).length"
        id="multiwan-no-rule"
        type="warning"
        :text="$t('Active rule not found. Please create a rule and assign a policy.')"
      />
      <div
        v-if="cardStatus.length"
        class="grid grid-cols-fill-52 md:grid-cols-fill-96 gap-6"
      >
        <tlt-overview-card-type
          v-for="(mwanIface, idx) in parsedCardStatus"
          :key="idx"
          :widget="mwanIface"
          :item="mwanIface"
        >
          <template #header="{ widget }">
            <tlt-hint
              v-if="anyIpv6Iface(mwanIface.id)"
              class="flex!"
            >
              <template #hintBox>
                {{
                  $t('Interface "%s" with IPv6 address will be prioritized over the IPv4 interface. For proper failover, %s').format(
                    $network.getName(anyIpv6Iface(mwanIface.id)!),
                    anyIpv6Iface(mwanIface.id)!.network_type === 'mobile' ? $t('set the mobile PDP type to IPv4') : $t('disable the DHCPv6 client')
                  )
                }}
                <router-link
                  v-if="session.hasAccess('network/wan', 'write')"
                  :to="`/network/wan/?edit=${anyIpv6Iface(mwanIface.id)!.id}`"
                  >{{ $t('here') }}</router-link
                >.
              </template>
              {{ widget.title }}
              <tlt-icon
                icon="warning"
                class="text-theme-text-warning size-6 ml-1"
              />
            </tlt-hint>
          </template>
          <template #content="{ info }">
            <div
              v-if="info.name === 'track_ip'"
              class="flex"
            >
              <tlt-hint
                class="flex!"
                :hints="info.info?.length > 2 ? info.info?.map((track: MwanTrackIp) => ({ info: `${track.ip} (${track.status})` })) : []"
              >
                <span
                  v-for="(track, tidx) in info.info?.slice(0, 2) ?? []"
                  :key="tidx"
                >
                  {{ track.ip }}
                  <span
                    class="before:content-['('] after:content-[')\00a0']"
                    :class="trackIpStatus[track.status as MwanTrackIp['status']]"
                  >
                    {{ track.status }}
                  </span>
                </span>
                <span v-if="!info.info?.length">-</span>
                <tlt-icon
                  v-if="info.info?.length > 2"
                  icon="info"
                  class="text-theme-text-info size-5"
                />
              </tlt-hint>
            </div>
          </template>
        </tlt-overview-card-type>
      </div>
      <tlt-alert
        v-else
        id="multiwan-status-unavailable"
        type="info"
        :text="$t('No multiwan status data available.')"
      />
    </tlt-card>
    <tlt-card :title="$t('Settings')">
      <tlt-form-item-select
        v-model="form.globals.mode"
        prop="mode"
        :label="$t('Mode')"
        :options="modeOptions"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Configure how Multiwan should operate.')"
            :hints="[
              {
                option: $t('Failover'),
                hint: $t('Ensures internet connectivity by switching to a backup connection if the primary fails.')
              },
              {
                option: $t('Load Balancing'),
                hint: $t('Distributes internet traffic across multiple active connections to optimize bandwidth use.')
              },
              {
                option: $t('Custom'),
                hint: $t('Other custom configurations.')
              }
            ]"
          />
        </template>
      </tlt-form-item-select>
    </tlt-card>
    <tlt-table
      id="policy-members-table"
      :title="$t('Interfaces')"
      :columns="memberColumns"
      :data-source="tableData"
      :sortable="mode === 'mwan'"
      :table-actions="['column-list', 'search']"
      @data-change="dataChange"
    >
      <template #refresh>
        <tlt-button
          button-id="refresh-members"
          :disabled="false"
          color="tertiary"
          icon-left="refresh"
          class="px-3! max-lg:hidden"
          @click="loadData"
        >
          <span>{{ $t('Refresh') }}</span>
        </tlt-button>
      </template>
      <template #metric="{ record }">
        <tlt-form-item-input
          v-if="mode !== 'mwan'"
          v-model="record.metric"
          prop="metric"
          rules="uinteger"
          required
        />
      </template>
      <template #weight="{ record }">
        <tlt-form-item-input
          v-model="record.weight"
          prop="weight"
          placeholder="1"
          :placeholder-prefix="false"
          rules="irange(1, 99)"
        />
      </template>
      <template #enabled="{ record }">
        <tlt-switch
          prop="enabled"
          true-value="1"
          false-value="0"
          :model-value="getEnabled(record)"
          @update:model-value="(value: '0' | '1') => setEnabled(record, value)"
        />
      </template>
    </tlt-table>
    <template #applyButton>
      <div class="flex justify-end">
        <tlt-button
          button-id="saveandapply"
          @click="saveData()"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </tlt-form>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { axios } from '@ui-core/plugins/axios'
import { useTimer } from '@ui-core/composables/useTimer'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { mwan } from '@/plugins/mwan'
import { useMainStore } from '@/stores/main'
import HintHelper from '@/components/shared/HintHelper.vue'
import { session } from '@ui-core/plugins/session'
import type { MwanStatusInterface, MwanStatus, MwanGlobals, MwanInterface, MwanMember, MwanPolicy, MwanTrackIp } from '@/types/mwanTypes'
import type { InterfaceStatus } from '@/types/networkTypes'
import type TltForm from '@ui-core/tlt-design/form/core/TltForm.vue'

import TltAlert from '@/components/Messenger/TltAlert.vue'
import { network } from '@/plugins/network'

const $t = useTranslate()
const message = useMessages()
const store = useMainStore()

onMounted(() => loadData())

const trackIpStatus: Record<MwanTrackIp['status'], string> = {
  up: 'success',
  down: 'error',
  skipped: ''
}

const form = ref<{ globals: Partial<MwanGlobals>; interfaces: MwanInterface[]; members: MwanMember[] }>({ globals: {}, interfaces: [], members: [] })
const members = ref<MwanMember[]>([])
const policies = ref<MwanPolicy[]>([])
const mode = computed(() => form.value.globals.mode || 'mwan')
const defaultModeTranslation: Record<string, string> = {
  mwan_default: 'mwan',
  balance_default: 'balance'
}
const modeOptions = computed(() => policies.value.map(p => [defaultModeTranslation[p.id] || p.id, mwan.getPrettyMode(p.name) || p.id]))

const tableData = computed(() => {
  const policy = policies.value.find(p => [mode.value, `${mode.value}_default`].includes(p.id))
  const filteredMembers = members.value.filter(member => member.interface && policy?.use_member?.includes(member.id))
  return [...filteredMembers].sort((a, b) => Number(a.metric) - Number(b.metric))
})

const memberColumns = computed(() => {
  const cols = [
    { dataIndex: 'interface', title: $t('Name'), help: $t('Name of the interface.'), width: 'auto', displayFn: (v: string, s: MwanPolicy) => displayName(s.interface) },
    {
      dataIndex: 'weight',
      title: $t('Weight'),
      help: $t('The weight values represent a percentage of load that will go through an interface. The default value is 1, if unspecified.'),
      show: mode.value !== 'mwan',
      width: 'auto'
    },
    { dataIndex: 'enabled', title: $t('Enabled'), help: $t('Enable the interface.'), width: 'auto' }
  ]
  const metricCol: { dataIndex: string; title: string; help: string; width: string; show?: boolean } = {
    dataIndex: 'metric',
    title: $t('Metric'),
    help: $t('Members within one policy with a lower metric have precedence over higher metric members. Members with the same metric within a policy will perform load balancing.'),
    width: 'auto'
  }
  if (mode.value === 'mwan') cols.unshift(metricCol)
  else {
    metricCol.show = mode.value !== 'balance'
    cols.splice(1, 0, metricCol)
  }
  return cols
})

function displayName(ifaceID: string | undefined) {
  return network.getInterfaceAndVpnName(ifStatus.value, ifaceID ?? '', 'name')
}

useTimer({ method: getStatus, autostart: true, immediate: true, time: 3000 })
const statusLoaded = ref<boolean>(false)
const ifaceStatus = ref<MwanStatus>({})
const ifStatus = ref<InterfaceStatus[]>([])
function getStatus() {
  return axios
    .bulkGet(['/api/failover/basic/status', '/api/interfaces/basic/status?include=vpn'])
    .then(([mwanStatus, ifaces]) => {
      if (mwanStatus.success) ifaceStatus.value = mwanStatus.data
      else message.error($t('Failed to retrieve failover status'))
      if (ifaces.success) ifStatus.value = ifaces.data
      else message.error($t('Failed to retrieve interface status'))
    })
    .catch(() => {
      message.error($t('Failed to retrieve status'))
    })
    .finally(() => {
      statusLoaded.value = true
    })
}

const interfaces = ref<Partial<MwanInterface>[]>([])
function loadData() {
  store.spin()
  return axios
    .bulkGet(['/api/failover/interfaces/config', '/api/failover/members/config', '/api/failover/policies/config', '/api/failover/mode/config'])
    .then(([ifacesConfig, membersConfig, policiesConfig, modeConfig]) => {
      if (ifacesConfig.success) interfaces.value = ifacesConfig.data.map((iface: MwanInterface) => ({ id: iface.id, name: iface.name, enabled: iface.enabled }))
      else message.error($t('Failed to retrieve interfaces'))
      if (membersConfig.success) members.value = membersConfig.data
      else message.error($t('Failed to retrieve members'))
      if (policiesConfig.success) policies.value = policiesConfig.data
      else message.error($t('Failed to retrieve policies'))
      if (modeConfig.success) form.value.globals.mode = modeConfig.data.find((o: MwanGlobals) => o.id === 'globals')?.mode || 'mwan'
      else message.error($t('Failed to retrieve mode'))
    })
    .catch(() => message.error($t('An unexpected error occurred')))
    .finally(() => store.spin(false))
}

const typeTranslations: Record<string, string> = {
  wired: $t('Wired'),
  mobile: $t('Mobile'),
  wireless: $t('Wireless')
}
function parseCardInfo(col: { dataIndex: keyof MwanStatusInterface; title: string }, mwanStatus: MwanStatusInterface) {
  return {
    status: () => mwan.parseStatus(mwanStatus[col.dataIndex as 'status']),
    type: () => ({ info: typeTranslations[mwanStatus[col.dataIndex as 'type']] ?? mwanStatus[col.dataIndex] ?? '-' }),
    uptime: () => ({ info: ['notracking', 'disabled'].includes(mwanStatus.status) ? '-' : '%t'.format(mwanStatus[col.dataIndex] ?? '-') }),
    track_ip: () => ({
      name: 'track_ip',
      info: ['notracking', 'disabled'].includes(mwanStatus.status)
        ? []
        : mwanStatus[col.dataIndex as 'track_ip']?.sort((a, b) => {
            const order = { up: 1, down: 2, skipped: 3 }
            return order[a.status] - order[b.status]
          })
    }),
    load_balance: () => ({ info: ['notracking', 'disabled'].includes(mwanStatus.status) || mwanStatus[col.dataIndex] == null ? '-' : `${mwanStatus[col.dataIndex]} %` }),
    default: () => ({ info: mwanStatus[col.dataIndex] ?? '-' })
  }
}

const cardColumns: { dataIndex: keyof MwanStatusInterface; title: string }[] = [
  { dataIndex: 'status', title: $t('Status') },
  { dataIndex: 'type', title: $t('Type') },
  { dataIndex: 'interval', title: $t('Interval') },
  { dataIndex: 'uptime', title: $t('Uptime') },
  { dataIndex: 'track_ip', title: $t('Track IP') },
  { dataIndex: 'load_balance', title: $t('Network traffic distribution') }
]

function getMemberIfaceId(section: MwanMember) {
  if (!section) return
  const iface = interfaces.value.find(iface => iface.name === section.interface)
  return iface?.id
}
const cardStatus = computed(() => {
  return tableData.value
    .map(member => {
      const ifaceId = getMemberIfaceId(member)
      return { id: ifaceId, name: displayName(member.interface), metric: member.metric, ...(ifaceId ? (ifaceStatus.value[ifaceId] ?? []) : ([] as Partial<MwanStatusInterface>)) }
    })
    .sort(mwan.statusComparator)
})

const parsedCardStatus = computed(() =>
  cardStatus.value.map(ifaceStatus => ({
    id: ifaceStatus.id,
    sectionName: ifaceStatus.id,
    type: 'basic' as const,
    title: ifaceStatus.name,
    content: cardColumns.map(col => {
      const info = parseCardInfo(col, ifaceStatus)
      return { title: col.title, name: col.dataIndex, ...(info[col.dataIndex as keyof typeof info]?.() ?? info.default()) }
    })
  }))
)

function getEnabled(section: MwanMember) {
  const memberIfaceId = getMemberIfaceId(section)
  return interfaces.value.find(iface => iface.id === memberIfaceId)?.enabled ?? '0'
}

function setEnabled(section: MwanMember, value: '0' | '1') {
  const memberIfaceId = getMemberIfaceId(section)
  const iface = interfaces.value.find(iface => iface.id === memberIfaceId)
  if (!iface) return
  iface.enabled = value
}

const formRef = ref<InstanceType<typeof TltForm> | null>(null)
async function saveData() {
  if (!interfaces.value.length) return Promise.resolve()
  const validationRes = await formRef.value?.validate()
  if (!validationRes?.valid) {
    message.error($t('Some fields are invalid'))
    return Promise.resolve()
  }
  store.spin()
  const requests = [
    { method: 'PUT', endpoint: '/failover/mode/config/globals', data: { mode: mode.value } },
    { method: 'PUT', endpoint: '/failover/members/config', data: tableData.value },
    { method: 'PUT', endpoint: '/failover/interfaces/config', data: interfaces.value.map(iface => ({ id: iface.id, enabled: iface.enabled })) }
  ]
  return axios
    .bulk(requests)
    .then(([modeRes, membersRes, ifacesRes]) => {
      if (!modeRes.success) message.error($t('Failed to save mode'))
      if (!membersRes.success) message.error($t('Failed to save members'))
      if (!ifacesRes.success) message.error($t('Failed to enable interfaces'))
      if (modeRes.success && membersRes.success && ifacesRes.success) message.success($t('Configuration has been applied'))
    })
    .catch(() => message.error($t('An unexpected error occurred')))
    .finally(() => store.spin(false))
}

function dataChange(values: MwanMember[] & MwanInterface[]) {
  values.forEach((value, index) => {
    value.metric = `${index + 1}`
  })
}

function anyIpv6Iface(iface?: string) {
  if (!iface) return null
  const mwanIface = interfaces.value.find(i => i.id === iface)
  const mwanMember = tableData.value.find(m => m.interface === mwanIface?.name)
  const mwanIfaceStatus = ifaceStatus.value[iface]
  if (!mwanIface || !mwanMember || mwanIfaceStatus?.status !== 'online' || ifStatus.value.some(i => i.id === iface && i.ip6addrs?.length)) return null
  const ipv6Iface = ifStatus.value
    .filter(i => i.id !== iface && i.ip6addrs?.length)
    .find(i => {
      const member = tableData.value.find(m => m.interface === i.name)
      if (!member) return false
      return parseInt(member.metric) > parseInt(mwanMember.metric)
    })
  return ipv6Iface ?? null
}
</script>
