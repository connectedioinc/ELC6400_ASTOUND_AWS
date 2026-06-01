<template>
  <NavigationTabs
    v-model:selected="selectedTab"
    :tabs="tabs"
  >
    <vuci-form
      v-slot="{ uciData }"
      v-model="formData"
      config="bfd"
      :after-load="
        () => {
          statusTimer.start()
        }
      "
      bulk-request
    >
      <tlt-card
        v-show="selectedTab === 'status'"
        :title="$t('Peer status')"
      >
        <div
          v-if="cardStatus.length"
          class="grid grid-cols-fill-52 md:grid-cols-fill-96 gap-6"
        >
          <tlt-overview-card-type
            v-for="(peer, idx) in parsedCardStatus"
            :key="idx"
            :widget="peer"
            :item="peer"
          />
        </div>
        <tlt-alert
          v-else
          id="peer-status-unavailable"
          type="info"
          :text="$t('No peer status data available.')"
        />
      </tlt-card>
      <vuci-typed-section
        :show="selectedTab === 'peer'"
        :title="$t('Peers')"
        :columns="bfdColumns"
        type="peer"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'bfd/peers/config' }]"
        :edit-form="markRaw(BFDPeerEdit)"
        data-key="bfd_peer"
      >
        <template #enabled="{ s }">
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :readonly="!s.ip"
            :hints="!s.ip ? [{ info: $t('IP address must be added before enabling this peer.') }] : []"
          />
        </template>
      </vuci-typed-section>
      <vuci-typed-section
        :show="selectedTab === 'profile'"
        :title="$t('Profiles')"
        :columns="profileColumns"
        type="profile"
        :uci-data="uciData"
        :endpoints="[{ endpoint: 'bfd/profiles/config' }]"
        :after-delete="afterProfileDelete"
        data-key="bfd_profile"
      >
        <template #name="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="name"
            :rules="['uciname', () => utils.validateNoDuplicates(formData.bfd_profile, 'name', s.name, $t('name'))]"
            required
            @change="utils.validate"
          />
        </template>
        <template #receive_interval="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="receive_interval"
            placeholder="300"
            rules="irange(10,4294967)"
          />
        </template>
        <template #transmit_interval="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="transmit_interval"
            placeholder="300"
            rules="irange(10,4294967)"
          />
        </template>
      </vuci-typed-section>
    </vuci-form>
  </NavigationTabs>
</template>

<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { axios } from '@ui-core/plugins/axios'
import { ref, markRaw, computed } from 'vue'
import { useTimer } from '@ui-core/composables/useTimer'
import type { BFDPeerConfig, BFDProfileConfig, BFDStatus } from '@/types/bfdTypes'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import BFDPeerEdit from './BFDPeerEdit.vue'

defineOptions({
  layout: 'none'
})

const $t = useTranslate()
const message = useMessages()

const formData = ref<{ bfd_peer: BFDPeerConfig[]; bfd_profile: BFDProfileConfig[] }>({ bfd_peer: [], bfd_profile: [] })

const tabs = [
  { name: 'status', title: $t('Status') },
  { name: 'peer', title: $t('Peers') },
  { name: 'profile', title: $t('Profiles') }
]
const selectedTab = ref(tabs[0]?.name)

const intervalCols = [
  {
    name: 'receive_interval',
    label: $t('Receive interval'),
    help: $t('Configures the minimum interval in milliseconds that this system is capable of receiving control packets.')
  },
  {
    name: 'transmit_interval',
    label: $t('Transmit interval'),
    help: $t('The minimum transmission interval, in milliseconds (with reduced jitter), that this system aims to use for sending BFD control packets.')
  }
] as const

const bfdColumns = [
  {
    name: 'ip',
    label: $t('IP address'),
    help: $t('Remote IP address of the device (peer) with which BFD establishes a session. IP address identifies the neighboring router or system that BFD will monitor for liveliness.'),
    displayFn: (v: string) => v || '-'
  },
  {
    name: 'multihop_ip',
    label: $t('Multihop IP address'),
    help: $t(
      'Tells the BFD daemon that we should expect packets with TTL less than 254 and to listen on the multihop port. Requires to specify which IP address should be used as the source of the BFD packets.'
    ),
    displayFn: (v: string) => v || '-'
  },
  {
    name: 'detect_multiplier',
    label: $t('Detect multiplier'),
    help: $t('Configures the detection multiplier to determine packet loss. The remote transmission interval will be multiplied by this value to determine the connection loss detection timer.'),
    displayFn: (v: string) => v || '3'
  },
  {
    name: 'profile',
    label: $t('Profile'),
    help: $t('Configure peer to use the profile configurations. Profile configurations can be overridden on a peer basis by specifying non-default parameters in peer configuration node.'),
    displayFn: (v: string) => formData.value.bfd_profile.find(p => p.id === v)?.name || '-'
  },
  ...intervalCols.map(col => ({
    ...col,
    displayFn: (v: string, row: BFDPeerConfig) => {
      const profile = formData.value.bfd_profile.find(p => p.id === row.profile)
      return row.profile && profile ? profile[col.name] || '300' : v || '300'
    }
  })),
  {
    name: 'passive_mode',
    label: $t('Passive mode'),
    help: $t('Mark session as passive: a passive session will not attempt to start the connection and will wait for control packets from peer before it begins replying.'),
    displayFn: (v: string) => (v === '1' ? $t('Enabled') : $t('Disabled'))
  },
  {
    name: 'enabled',
    label: $t('Enabled'),
    help: $t('Enables or disables the peer.')
  }
]

const profileColumns = [
  {
    name: 'name',
    label: $t('Name'),
    help: $t('Name of the profile.')
  },
  ...intervalCols
]

const bfdStatus = ref<BFDStatus[]>([])
function getStatus() {
  return axios
    .get('/api/bfd/peers/status')
    .then(({ data }) => {
      bfdStatus.value = data
    })
    .catch(() => {
      message.error($t('Failed to load BFD status'))
    })
}
const statusTimer = useTimer({ method: getStatus, autostart: false, immediate: true, time: 3000 })

const statusInfo = {
  up: { info: $t('Up'), style: 'success' },
  down: { info: $t('Down'), style: 'error' },
  init: { info: $t('Establishing') },
  disabled: { info: $t('Disabled') },
  default: { info: '-' }
}
const statusDiagnostic = {
  ok: $t('Ok'),
  'control detection time expired': $t('Control detection time expired'),
  'echo function failed': $t('Echo function failed'),
  'neighbor signaled session down': $t('Neighbor signaled session down'),
  'forwarding plane reset': $t('Forwarding plane reset'),
  'path down': $t('Path down'),
  'concatenated path down': $t('Concatenated path down'),
  'administratively down': $t('Administratively down'),
  'reverse concatenated path down': $t('Reverse concatenated path down')
}
function parseCardInfo(col: { dataIndex: keyof BFDStatus; title: string }, peerStatus: BFDStatus) {
  const getInterval = () => ({ info: peerStatus[col.dataIndex] ? `${peerStatus[col.dataIndex]}ms` : '-' })
  const getUptime = () => ({ info: '%t (%s)'.format(peerStatus[col.dataIndex] ?? '-', `${$t('up / down')}: ${peerStatus.session_up ?? 0} / ${peerStatus.session_down ?? 0}`) })
  return {
    status: () => {
      const peerConfig = formData.value.bfd_peer.find(p => p.ip === peerStatus.peer) || ({} as Partial<BFDPeerConfig>)
      if (peerConfig.enabled !== '1') return statusInfo.disabled
      const status = { ...(statusInfo[peerStatus[col.dataIndex] as keyof typeof statusInfo] ?? statusInfo.default) }
      const msg = statusDiagnostic[peerStatus.diagnostic as keyof typeof statusDiagnostic]
      if (msg && !(status.info === 'Down' && msg === 'Ok')) status.info = `${status.info} (${msg})`
      return status
    },
    remote_receive_interval: getInterval,
    remote_transmit_interval: getInterval,
    uptime: getUptime,
    downtime: getUptime,
    default: () => ({ info: peerStatus[col.dataIndex] ?? '-' })
  }
}

function getCardColumns(peerStatus: BFDStatus): { dataIndex: keyof BFDStatus; title: string }[] {
  return [
    { dataIndex: 'status', title: $t('Status') },
    { dataIndex: 'remote_receive_interval', title: $t('Remote receive interval') },
    { dataIndex: 'remote_transmit_interval', title: $t('Remote transmit interval') },
    ['up', 'init'].includes(peerStatus.status ?? '') ? { dataIndex: 'uptime', title: $t('Uptime') } : { dataIndex: 'downtime', title: $t('Downtime') }
  ]
}

const cardStatus = computed(() => formData.value.bfd_peer.filter(peer => peer.ip).map(peer => ({ peer: peer.ip, ...bfdStatus.value.find(s => s.peer === peer.ip) })))
const parsedCardStatus = computed(() =>
  cardStatus.value.map(peerStatus => ({
    type: 'basic',
    title: peerStatus.peer,
    content: getCardColumns(peerStatus).map(col => {
      const info = parseCardInfo(col, peerStatus)
      return { title: col.title, ...(info[col.dataIndex as keyof typeof info]?.() ?? info.default()) }
    })
  }))
)

function afterProfileDelete(profile: BFDProfileConfig) {
  const peer = formData.value.bfd_peer.find(p => p.profile === profile.id)
  if (!peer) return
  peer.profile = ''
  peer.receive_interval = ''
  peer.transmit_interval = ''
}
</script>
