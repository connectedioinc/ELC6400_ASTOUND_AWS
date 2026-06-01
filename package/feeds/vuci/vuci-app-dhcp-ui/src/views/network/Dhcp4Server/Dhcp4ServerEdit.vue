<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="dhcp"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dhcp/servers/ipv4/config' }]"
      data-key="dhcpv4"
      :exception-options="['dhcp_option']"
      :title="$utils.getModalTitle('DHCPv4', section.id)"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            name="enable_dhcpv4"
            :label="$t('Enable')"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="mode"
            :label="$t('DHCPv4 mode')"
            :options="dhcpv4Options"
            @change="s.enable_option_82 = '0'"
          >
            <template #help>
              <hint-helper v-bind="$network.commonHints.dhcpv4mode()" />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-input
            :uci-section="s"
            name="server_relay"
            :label="$t('DHCP server')"
            :help="$t('Specifies DHCP server\'s IP address, which directs any requests into server.')"
            rules="ip4addr"
            placeholder="0.0.0.0"
            :depend="s.mode === 'relay'"
            required
          />
          <tlt-form-item-switch
            prop="enable_option_82"
            true-value="1"
            false-value="0"
            :label="$t('Enable option 82')"
            :help="$t('Enables DHCP relay agent information option used to provide additional information about the location of the DHCP client.')"
            :depend="s.mode === 'relay'"
            :model-value="s.enable_option_82 === '1' || !!s.circuit_id || !!s.remote_id ? '1' : '0'"
            @update:model-value="(value: '0' | '1') => setSection?.(section => (section.enable_option_82 = value))"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="circuit_id"
            :label="$t('Circuit ID')"
            :help="$t('Relay agent circuit id sub-option.')"
            rules="max_bytes(32)"
            :depend="s.mode === 'relay' && s.enable_option_82 === '1'"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="remote_id"
            :label="$t('Remote ID')"
            :help="$t('Relay agent remote id sub-option.')"
            rules="max_bytes(32)"
            :depend="s.mode === 'relay' && s.enable_option_82 === '1'"
            required
          />
          <vuci-form-item-input
            :uci-section="s"
            name="start_ip"
            :label="$t('Start IP')"
            :help="$t('Type an IP address to serve as the start of the IP range that DHCP will use to assign IP addresses.')"
            :depend="s.mode === 'server'"
            :rules="['ipaddr', startEndValidator, validateIpAddrDepend]"
            :initial="setInitialIp('100')"
            :required="isIpv4AddrAvailable"
            @change="$utils.validate"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="end_ip"
            :label="$t('End IP')"
            :help="$t('Type an IP address to serve as the end of the IP range that DHCP will use to assign IP addresses.')"
            :depend="s.mode === 'server'"
            :rules="['ipaddr', startEndValidator, validateIpAddrDepend]"
            :initial="setInitialIp('150')"
            :required="isIpv4AddrAvailable"
            @change="$utils.validate"
          />
          <vuci-form-item-custom
            ref="leasetimeRef"
            :uci-section="s"
            name="leasetime"
            inputs="input,select"
            :label="$t('Lease time')"
            :input-props="[leasetimeInputProps, leaseUnit]"
            :help="leasetimeHint"
            :load-parse="getLeaseTime"
            :write-parse="writeLeaseTime"
            :depend="s.mode === 'server'"
            rawhtml
            @changed-unit="changedUnit"
          />
          <vuci-form-item-list
            id="dns-servers"
            :uci-section="s"
            :label="$t('DNS servers')"
            :help="$t('DNS servers to be advertised to DHCPv4 clients.')"
            name="dns"
            rules="ipaddr"
            :depend="$store.isSwitch && s.mode === 'server'"
            :no-write="true"
            :readonly="s.dhcp_option?.some(e => e === '6')"
            @change="updateDnsOption"
          >
            <template
              v-if="$store.isSwitch && s.mode === 'server' && s.dhcp_option?.some(e => e === '6')"
              #after-content="{ controlRef }"
            >
              <tlt-tooltip
                :target="() => controlRef"
                placement="bottom-start"
                fallback-placements="top-start"
              >
                {{ $t('DNS server sending is disabled in "%s"').format($t('Custom DHCP options')) }}
              </tlt-tooltip>
            </template>
          </vuci-form-item-list>
        </template>
        <template #advanced>
          <vuci-form-item-switch
            :uci-section="s"
            name="dynamicdhcp"
            :label="$t('Dynamic DHCP')"
            :help="
              $t(
                'Dynamically allocate DHCP addresses for clients. If disabled, only \
              clients having static leases will be served'
              )
            "
            initial
            :depend="s.mode === 'server'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="force"
            :label="$t('Force')"
            :help="$t('Force DHCP on this network even if another server is detected.')"
            :depend="s.mode === 'server'"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="netmask"
            :label="$t('IPv4-Netmask')"
            :help="
              $t(
                'Override the netmask sent to clients. Normally it is calculated \
              from the subnet that is served'
              )
            "
            rules="netmask"
            placeholder="255.255.255.0"
            :depend="s.mode === 'server'"
          />
          <vuci-form-item-button
            button-id="edit"
            :uci-section="s"
            name="dhcp_option-button"
            :label="$t('Custom DHCP options')"
            :help="$t('Custom DHCP options are number and value pairs used to configure advanced DHCP functionality. It does not configure DHCP ipv6!.')"
            :text="$t('Edit')"
            @click="openDhcpOptions = true"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="force_options"
            :label="$t('Force DHCP options')"
            :help="$t('Force DHCP options to be sent even if it\'s not requested.')"
            :depend="s.mode === 'server'"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
    <dhcp4-options
      v-model="openDhcpOptions"
      :section="section"
      @update:model-value="updateDnsField"
    />
  </vuci-form>
</template>
<script lang="ts" setup>
import type { DhcpV4Config as RawDhcpV4Config } from '@/types/dhcpTypes'
import Dhcp4Options from './Dhcp4Options.vue'
import { ipv4Utils } from '@/utils/ipUtils'
import { rules, type ValidationResult } from '@/validation-rules'
import { copy } from '@ui-core/utils/vue-helpers'
import { computed, inject, ref, useTemplateRef } from 'vue'
import { FormOptionKey, type FormModel, type FormOptions } from './Dhcp4ServerCommon'
import { useTranslate } from '@ui-core/composables/useI18n'
import HintHelper from '@/components/shared/HintHelper.vue'

type DhcpV4Config = RawDhcpV4Config & { dns: string[] | string }

const props = defineProps<{ section: DhcpV4Config }>()

const $t = useTranslate()

const { interfaceData } = inject(FormOptionKey) as FormOptions
const setSection = inject('setSection') as (func: (s: DhcpV4Config) => void) => void

const formData = ref<FormModel>({ dhcpv4: [] })
const openDhcpOptions = ref(false)

const tabs = computed(() => {
  return [
    { name: 'general', title: $t('General Setup') },
    { name: 'advanced', title: $t('Advanced Settings'), show: props.section.mode === 'server' }
  ]
})

const dhcpv4Options = [
  ['server', $t('Server')],
  ['relay', $t('Relay')]
]
const leaseUnit = {
  prop: 'leaseUnit',
  options: [
    ['h', $t('Hours')],
    ['m', $t('Minutes')],
    ['s', $t('Seconds')],
    ['infinite', $t('Infinite')]
  ]
}

const leaseHints = {
  h: $t('Expiry time of leased addresses. Minimum value is 1 hour'),
  m: $t('Expiry time of leased addresses. Minimum value is 2 minutes'),
  s: $t('Expiry time of leased addresses. Minimum value is 120 seconds'),
  infinite: $t('Expiry time of leased addresses is infinite')
}
const leasetimeHint = computed(() => {
  return leaseHints[unit.value] || leaseHints.h
})

const leaseProps = {
  h: { placeholder: '12', rules: 'range(1,999999)' },
  m: { placeholder: '720', rules: 'range(2,999999)' },
  s: { placeholder: '43200', rules: 'range(120,999999)' }
}
const leasetimeInputProps = computed(() => {
  return {
    prop: 'leaseTime',
    required: unit.value !== 'infinite',
    readonly: unit.value === 'infinite',
    initial: '12',
    ...(unit.value !== 'infinite' ? leaseProps[unit.value] : {})
  }
})

const interfaceSection = computed(() => {
  return interfaceData.value.find(iface => iface.id === props.section.id)
})
function setInitialIp(suffix: string) {
  const ip = interfaceSection.value?.ipaddr
  return ip ? ip.slice(0, ip.lastIndexOf('.')) + '.' + suffix : ''
}
function validateIpAddrDepend(ip: string): ValidationResult {
  return {
    isValid: isIpv4AddrAvailable.value || ip === '',
    message: $t('Network required to have "IPv4 address".')
  }
}
const isIpv4AddrAvailable = computed(() => {
  return !!interfaceSection.value?.ipaddr
})

function updateDnsOption() {
  // workaround as depend false activates this
  if (typeof props.section.dns === 'string') return
  const mutatedOptions = copy(props.section.dhcp_option) ?? []
  const dnsOptionIndex = mutatedOptions.findIndex(option => option.startsWith('6,'))
  const newDnsOption = ['6', ...props.section.dns.filter(e => e)].join(',')
  const isEmptyArray = props.section.dns.every(dns => dns === '')

  if (dnsOptionIndex === -1 && !isEmptyArray) mutatedOptions.push(newDnsOption)
  else if (isEmptyArray && dnsOptionIndex !== -1) mutatedOptions.splice(dnsOptionIndex, 1)
  else if (dnsOptionIndex !== -1 && !isEmptyArray) mutatedOptions[dnsOptionIndex] = newDnsOption

  setSection?.(section => (section.dhcp_option = mutatedOptions))
}

function updateDnsField() {
  const dnsOption = props.section.dhcp_option?.find(option => option.startsWith('6,'))
  const dnsServers = dnsOption?.split(',').slice(1) ?? ['']
  setSection?.(section => (section.dns = dnsServers))
}

function getLeaseTime(val: string | string[]): [string, Unit] {
  const leasetime = Array.isArray(val) ? val[0] : val
  const [, lease, unit] = leasetime?.match(/(\d*)(\D*)/) ?? []
  return [lease ?? '12', (unit as Unit) ?? 'h']
}

type Unit = 'h' | 'm' | 's' | 'infinite'
const unit = ref<Unit>('h')
unit.value = getLeaseTime(props.section.leasetime)[1]
updateDnsField()

const leasetimeRef = useTemplateRef('leasetimeRef')
function changedUnit(newVal: Unit) {
  if (!leasetimeRef.value) return
  const oldVal = unit.value
  unit.value = newVal
  if ([newVal, oldVal].includes('infinite')) {
    leasetimeRef.value.modelValues[0][0] = newVal === 'infinite' ? '' : '12'
  }
}

function writeLeaseTime(values: string[]) {
  return values.join('')
}

function startEndValidator(ip: string): ValidationResult {
  if (!interfaceSection.value?.ipaddr || !interfaceSection.value?.netmask) return { isValid: true }
  if (!ip) return { isValid: true }
  if (!rules.ip4addr(ip).isValid) return { isValid: true }
  let usedNetmask
  if (props.section.netmask) {
    if (!rules.netmask(props.section.netmask).isValid) return { isValid: true }
    usedNetmask = props.section.netmask
  } else {
    usedNetmask = interfaceSection.value.netmask
  }
  const interfaceRange = ipv4Utils.getIPRange(interfaceSection.value.ipaddr, usedNetmask)
  const first = ipv4Utils.int2ip(ipv4Utils.ip2int(interfaceRange[0]) + 1)
  const last = ipv4Utils.int2ip(ipv4Utils.ip2int(interfaceRange[1]) - 1)
  if (!ipv4Utils.checkIfInRange(ip, ...interfaceRange)) {
    return {
      isValid: false,
      message: $t("IP address must be in the interface's network range (%s).").format(`${first} - ${last}`)
    }
  }
  if (!rules.ip4addr(props.section.start_ip).isValid || !rules.ip4addr(props.section.end_ip).isValid) return { isValid: true }
  return {
    isValid: ipv4Utils.compare(props.section.start_ip, props.section.end_ip) <= 0,
    message: $t('Start IP must be smaller than End IP.')
  }
}
</script>
