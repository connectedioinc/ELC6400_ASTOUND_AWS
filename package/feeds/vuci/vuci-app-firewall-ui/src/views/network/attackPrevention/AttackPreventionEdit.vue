<template>
  <vuci-form
    v-if="type"
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="afterLoad"
    config="firewall"
  >
    <vuci-named-section
      v-slot="{ s }"
      :after-save="afterSave"
      :uci-data="uciData"
      :title="$utils.getModalTitle($t('attack prevention'), parsedNames[type])"
      :endpoints="loaded ? [{ endpoint: `attack_prevention/${type}/config` }] : []"
      name="general"
      :data-key="type"
    >
      <template v-if="type === 'syn_flood'">
        <vuci-form-item-switch
          :uci-section="s"
          name="syn_flood"
          :label="$t('Enable attack prevention')"
          :help="enableHelp.format($t('all zones'))"
        />
      </template>
      <template v-if="type === 'icmp'">
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable remote ping requests')"
          :help="$t('Allows remote (WAN zone) ICMP echo-request type.')"
          name="enabled"
        />
      </template>
      <template v-if="isGenericAttackId(type) || type === 'syn_flood'">
        <template v-if="type !== 'syn_flood'">
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable attack prevention')"
            :help="enableHelp.format($t('WAN zone'))"
            :name="`${type}_limit`"
          />
        </template>
        <tlt-form-item-inline
          v-show="s[`${type}_limit`] === '1' || type === 'syn_flood'"
          :label="$t('Limit')"
          :help="$t('The maximum theoretical rate. It represents how quickly the burst refills.')"
          has-headers
          required
        >
          <div class="md:basis-1/2">
            <span class="truncate">{{ $t('New connections') }}</span>
            <vuci-form-item-input
              :uci-section="s"
              :name="type === 'syn_flood' ? 'synflood_rate' : 'limit'"
              rules="irange(1,10000)"
              :depend="s[`${type}_limit`] === '1' || type === 'syn_flood'"
              required
            />
          </div>
          <div class="md:basis-1/2">
            <span class="truncate">{{ $t('Period') }}</span>
            <vuci-form-item-select
              :uci-section="s"
              name="period"
              :options="periodOptions"
              :depend="s[`${type}_limit`] === '1' || type === 'syn_flood'"
              :no-write="type === 'syn_flood'"
              :readonly="type === 'syn_flood'"
            />
          </div>
        </tlt-form-item-inline>
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Burst')"
          :help="
            $t(
              `The maximum number of new connections that can occur in a short time. This is the token bucket, which is depleted with each new connection. It refills at the rate defined by the limit, and if empty, new connections are blocked.`
            )
          "
          :name="type === 'syn_flood' ? 'synflood_burst' : 'limit_burst'"
          rules="irange(1,10000)"
          :depend="s[`${type}_limit`] === '1' || type === 'syn_flood'"
          required
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable logging')"
          name="limit_log_overlimit"
          :depend="s[`${type}_limit`] === '1' && type !== 'syn_flood'"
        >
          <template #help>
            <string-with-links :text="$t('Flood detection events will be logged to %s.').format(formatLink('/system/maintenance/troubleshoot/general#log=system', $t('System log')))" />
          </template>
        </vuci-form-item-switch>
      </template>
      <template v-if="type === 'syn_flood'">
        <tlt-inline-message
          type="info"
          :message="$t('TCP SYN cookies option is independent from options above.')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('TCP SYN cookies')"
          :help="$t('Enable the use of SYN cookies.')"
          name="tcp_syncookies"
        />
      </template>
      <template v-if="type === 'port_scan'">
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable port scan prevention')"
          :help="$t('Enable brute force port scan prevention from WAN zone. If there are too many new TCP connections from the same host, they start being rejected.')"
          name="port_scan"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Scan count')"
          :help="$t('Port scan (new TCP connection) count before packets are rejected.')"
          name="hitcount"
          rules="irange(5,255)"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Interval')"
          :help="$t('Time span (in seconds) in which \'scan count\' has to be reached before packets are rejected.')"
          name="seconds"
          rules="irange(10,1000)"
          required
        />
        <tlt-inline-message
          type="info"
          :message="$t('Attack preventions below are independent from options above.')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('SYN-FIN attack')"
          :help="$t('Protect from SYN-FIN attack.')"
          name="syn_fin"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('SYN-RST attack')"
          :help="$t('Protect from SYN-RST attack.')"
          name="syn_rst"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('X-Mas attack')"
          :help="$t('Protect from X-Mas attack.')"
          name="x_max"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('FIN scan')"
          :help="$t('Protect from nmap FIN scan.')"
          name="nmap_fin"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('NULLflags attack')"
          :help="$t('Protect from NULLflags attack.')"
          name="null_flags"
        />
      </template>
    </vuci-named-section>
  </vuci-form>
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import { useCommon, isGenericAttackId, type AttackSection, type FormModel } from './AttackPreventionCommon'
import { computed, ref } from 'vue'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'

type RealFormModel = { [key in keyof FormModel]: FixFormType<FormModel[key]> }
// In real from id is removed and changed with constant id: 'general' witch is usless
type FixFormType<T> = T extends undefined ? undefined : [Omit<T, 'id'>]

const formData = ref<RealFormModel>({})
const modelValue = defineModel<FormModel>({ required: true })
const type = defineModel<AttackSection['id'] | null>('type', { required: true })
const $t = useTranslate()
const { parsedNames } = useCommon()
const enableHelp = computed(() => $t('Enable new connection throttle for the "%s" to prevent flood attacks from %s. It uses token bucket algorithm.').format(parsedNames[type.value!], '%s'))

function afterLoad() {
  loaded.value = true
  return { [type.value!]: [{ ...modelValue.value[type.value!], id: 'general', '.type': 'defaults' }] }
}

function afterSave(_: any, res: any) {
  modelValue.value = {
    ...modelValue.value,
    [type.value!]: { ...res.data, id: type.value }
  }
  type.value = null
}

const loaded = ref<boolean>(false)

const periodOptions = [
  ['second', $t('Second')],
  ['minute', $t('Minute')],
  ['hour', $t('Hour')],
  ['day', $t('Day')]
]
</script>
