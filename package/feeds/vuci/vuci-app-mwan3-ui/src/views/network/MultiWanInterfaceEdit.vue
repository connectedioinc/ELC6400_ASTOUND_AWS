<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="mwan3"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'failover/interfaces/config' }]"
      data-key="mwanIfaces"
      :name="props.section.id"
    >
      <tlt-card :title="$utils.getModalTitle($t('Interface group'), network.getInterfaceAndVpnName(interfaceStatus, props.section.name, 'name'))">
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Enable/Disable the configuration.')"
          name="enabled"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Interval')"
          :help="$t('Number of seconds between each test.')"
          name="interval"
          placeholder="3"
          required
          rules="irange(0, 65000)"
        />
        <vuci-form-item-select
          :uci-section="s"
          name="flush_conntrack"
          :label="$t('Flush connections on')"
          :help="$t('Flush connections on selected action to renew priority of configured interfaces.')"
          :options="flushOptions"
          multiple
        />
      </tlt-card>
      <tlt-card
        class="max-md:border-none max-md:px-0!"
        :title="$utils.getModalTitle($t('rule'))"
      >
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Method')"
          name="track_method"
          :options="methodOptions"
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Method of the interface.')"
              :hints="[
                {
                  option: 'Ping',
                  hint: $t('Uses ICMP ping to monitor connectivity.')
                },
                {
                  option: 'Wget',
                  hint: $t('Checks connectivity by making HTTP requests.')
                }
              ]"
            />
          </template>
        </vuci-form-item-select>
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Address family')"
          name="family"
          :help="$t('The specific protocol family this interface handles.')"
          :depend="s.track_method === 'ping'"
          :options="familyOptions"
          @change="$utils.validate"
        />
        <vuci-form-item-list
          :uci-section="s"
          name="track_ip"
          :label="trackIpLabel"
          :help="$t('The hosts to test if interface is still alive. If this value is missing the interface is always considered up.')"
          :rules="trackIpRules"
          :placeholder="trackIpPlaceholder"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Reliability')"
          :help="
            $t(
              'Number of hosts that must reply for the test to be considered as successful. \
                  Ensure there are at least this many hosts defined or the interface will always be considered down'
            )
          "
          name="reliability"
          placeholder="1"
          :rules="(v: any) => v.irange.bind(v, 1, s.track_ip.length)"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Count')"
          :help="$t('Number of pings to send to each host with each test.')"
          name="count"
          placeholder="1"
          rules="irange(1,65000)"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Up')"
          :help="$t('Number of successful tests to considered link as alive.')"
          name="up"
          placeholder="3"
          rules="irange(1,65000)"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Down')"
          :help="$t('Number of failed tests to considered link as dead.')"
          name="down"
          placeholder="3"
          rules="irange(1,65000)"
          required
        />
      </tlt-card>
    </vuci-named-section>
  </vuci-form>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import HintHelper from '@/components/shared/HintHelper.vue'
import type { MwanInterface } from '@/types/mwanTypes'
import { useContext } from './MultiWanInterfaceCommon'
import { network } from '@/plugins/network'

const $t = useTranslate()
const { interfaceStatus } = useContext()

const props = defineProps<{ section: MwanInterface }>()

const flushOptions = [
  ['connected', $t('Connected')],
  ['disconnected', $t('Disconnected')],
  ['ifup', $t('Interface up')],
  ['ifdown', $t('Interface down')]
]
const methodOptions = [
  ['ping', 'Ping'],
  ['wgetping', 'Wget']
]
const familyOptions = [
  ['ipv4', 'IPv4'],
  ['ipv6', 'IPv6']
]

const trackIpLabel = computed(() => (props.section.track_method === 'ping' ? $t('Track IP') : $t('URL')))
const trackIpRules = computed(() => (props.section.track_method === 'ping' ? (props.section.family === 'ipv4' ? 'ipv4host' : 'ipv6host') : 'url'))
const trackIpPlaceholder = computed(() => (props.section.track_method === 'ping' ? (props.section.family === 'ipv4' ? '8.8.8.8' : '2001:4860:4860::8844') : 'www.example.com'))
</script>
