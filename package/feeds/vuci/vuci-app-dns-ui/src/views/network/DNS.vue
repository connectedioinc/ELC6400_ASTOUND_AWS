<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="dhcp"
    :after-load="loadInterfaceData"
    :before-save="beforeSave"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('DNS configuration')"
      data-key="dnsmasq"
      name="general"
      :endpoints="[{ endpoint: 'dns/config' }]"
      :exception-options="isProxyEnabled ? [] : ['server']"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <tlt-form-model-item-api
            v-if="httpsProxy.enabled !== '1'"
            element-id="created"
            :label="$t('Inherited DNS servers')"
            :help="$t('DNS Servers that were inherited from WAN interfaces.')"
          >
            <div
              v-if="ifacesWithDns.length"
              class="flex flex-col mt-1 gap-2 max-w-full"
            >
              <div
                v-for="iface in ifacesWithDns"
                :key="iface.id"
                class="flex gap-2 max-w-full items-start"
              >
                <div class="text-theme-text-primary first:mt-[3px] flex-1 min-w-0 w-full max-w-min">
                  <tlt-overflow-hint
                    v-for="ip in iface['dns-server'].slice(0, iface['dns-server'].length > 3 ? 2 : 3)"
                    :key="ip"
                    type="icon"
                  >
                    {{ ip }}
                  </tlt-overflow-hint>
                  <div
                    v-if="iface['dns-server'].length > 3"
                    :id="`dnsIps-${iface.id}`"
                    class="text-theme-text-primary font-bold"
                  >
                    {{ `+${iface['dns-server'].length - 2} ${$t('more')}` }}
                    <tlt-popover
                      :target="`#dnsIps-${iface.id}`"
                      placement="left"
                    >
                      <div
                        v-for="ip in iface['dns-server'].slice(2)"
                        :key="`${iface.id}-${ip}`"
                      >
                        {{ ip }}
                      </div>
                    </tlt-popover>
                  </div>
                </div>
                <div class="mt-[3px]">
                  {{ $t('from') }}
                </div>
                <div
                  class="border px-1 py-0.5 rounded-sm flex-1 min-w-0 w-full max-w-min"
                  :style="{ borderColor: utils.getNameColor(iface.name) }"
                >
                  <tlt-overflow-hint
                    type="icon"
                    class="w-full"
                  >
                    {{ iface.name }}
                  </tlt-overflow-hint>
                </div>
              </div>
            </div>
            <div
              v-else
              class="text-theme-text-subtle flex items-center"
            >
              {{ $t('There are no inherited servers') }}
            </div>
          </tlt-form-model-item-api>

          <vuci-form-item-list
            id="input-server-basic"
            :uci-section="s"
            name="server-basic"
            rules="ipaddr"
            placeholder="1.1.1.1"
            :label="$t('DNS servers')"
            :help="$t('Specify servers to complement inherited ones.')"
            :readonly="isProxyEnabled"
            :load="loadBasicServers"
            no-write
          />
          <tlt-popover
            v-if="isProxyEnabled"
            :content="httpsProxyWarning"
            target="#input-server-basic"
            placement="bottom"
            fallback-placements="top"
          />
          <vuci-form-item-custom
            name="address"
            inputs="input,input"
            :input-props="inputPropsDns('address_hostname', 'address_ipaddr')"
            :uci-section="s"
            :label="$t('Static addresses')"
            :help="$t('Specify static IP address for a domain.')"
            :headers="[$t('Domain'), $t('IP address')]"
            :load-parse="loadParseDns"
            :write-parse="writeParseDns"
            allow-create
            @change="validateCustomFields"
          >
            <template #input-input="{ keyValue, rowValues, rowId, props, values }">
              <tlt-form-item-input
                :ref="el => updateCustomInputs(el, `${props.prop}-${rowId}`)"
                :key="keyValue"
                v-model="rowValues[keyValue]"
                :rules="(v: any) => [validateDns.bind(v, keyValue === 0, 'address', rowValues[0], rowValues[1]), () => validateDuplicateCustom(values, rowValues)]"
                :placeholder="props.placeholder"
                :prop="`${props.prop}-${rowId}`"
                :required="rowValues.some((value: string) => value !== '')"
              />
            </template>
          </vuci-form-item-custom>
          <vuci-form-item-switch
            :uci-section="s"
            name="rebind_protection"
            :label="$t('Rebind protection')"
            :help="$t('Discard upstream RFC1918 responses.')"
          />
        </template>
        <template #advanced>
          <vuci-form-item-custom
            id="input-server-advanced"
            name="server-advanced"
            inputs="input,input"
            :input-props="inputPropsDns('server_hostname', 'server_ipaddr')"
            :uci-section="s"
            :label="$t('Custom redirect')"
            :help="$t('Specify server for a domain. This is intended for private nameservers.')"
            :headers="[$t('Domain'), $t('DNS Server')]"
            :load-parse="loadParseDns"
            :write-parse="writeParseDns"
            allow-create
            no-write
            @change="
              (value: { modelValues: string[][] }) => {
                onServerAdvancedChange(value)
                validateCustomFields()
              }
            "
          >
            <template #input-input="{ keyValue, rowValues, row, props, values }">
              <tlt-form-item-input
                :ref="el => updateCustomInputs(el, `${props.prop}-${row}`)"
                :key="keyValue"
                v-model="rowValues[keyValue]"
                :rules="(v: string) => [validateDns.bind(v, keyValue === 0, 'server', rowValues[0], rowValues[1]), () => validateDuplicateCustom(values, rowValues)]"
                :placeholder="props.placeholder"
                :prop="`${props.prop}-${row}`"
                :required="!!rowValues[1]"
                :readonly="isProxyEnabled"
              />
            </template>
          </vuci-form-item-custom>
          <tlt-popover
            v-if="isProxyEnabled"
            :content="httpsProxyWarning"
            target="#input-server-advanced"
            placement="bottom"
            fallback-placements="top"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="interface"
            :label="$t('Listen interfaces')"
            :help="$t('Limit DHCP and DNS requests listening to these interfaces, and loopback. Leave empty to listen on all interfaces.')"
            :options="filteredInterfaces"
            :load="s.interface ? s.interface : []"
            multiple
          />
          <vuci-form-item-select
            :uci-section="s"
            name="notinterface"
            :label="$t('Exclude interfaces')"
            :help="$t('Prevent DHCP and DNS requests listening on these interfaces. Leave empty to listen on all interfaces.')"
            :options="filteredInterfaces"
            :load="s.notinterface ? s.notinterface : []"
            multiple
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="strictorder"
            :label="$t('DNS strict order')"
            :help="$t('Obeys the order of listed DNS servers.')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="localservice"
            :label="$t('Local service only')"
            :help="$t('Limit DNS service to subnets interfaces on which we are serving DNS.')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="logqueries"
            :label="$t('Log queries')"
            :help="$t('Write received DNS requests to syslog.')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="boguspriv"
            :label="$t('Filter private')"
            :help="$t('Do not forward reverse lookups for local networks.')"
            initial="1"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="localise_queries"
            :label="$t('Localise queries')"
            :help="$t('Localise hostname depending on the requesting subnet if multiple IPs are available.')"
          />
          <vuci-form-item-upload
            :uci-section="s"
            name="serversfile"
            :label="$t('Additional servers file')"
            :help="$t('This file may contain lines like \'server=/domain/1.2.3.4\' or \'server=1.2.3.4\' for domain-specific or full upstream DNS servers.')"
            placeholder="server=1.2.3.4"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="cachesize"
            :label="$t('Size of DNS query cache')"
            :help="$t('Number of cached DNS entries (max is 10000, 0 is no caching).')"
            rules="irange(0,10000)"
            placeholder="150"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { Interface, InterfaceStatus } from '@/types/networkTypes'
import { rules as ValidationRules, type ValidationResult } from '@/validation-rules'
import type { DnsConfig } from '@/types/dnsTypes'
import { ref, computed, nextTick } from 'vue'
import { useTranslate } from '@ui-core/composables/useI18n'
import { network } from '@/plugins/network'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'
import { utils } from '@/plugins/utils'
import { useTimer } from '@ui-core/composables/useTimer'
const $t = useTranslate()
const message = useMessages()

const httpsProxyWarning = $t('DNS is currently controlled by "HTTPS DNS Proxy". Some options are disabled.')

interface FakeDnsConfig extends DnsConfig {
  'server-basic': string[]
  'server-advanced': string[]
}

interface FormData {
  dnsmasq: FakeDnsConfig[]
}

const formData = ref<FormData>({ dnsmasq: [] })

const tabs = [
  { name: 'general', title: $t('General Settings') },
  { name: 'advanced', title: $t('Advanced Settings') }
]

const interfaces = ref<Interface[]>([])
const statuses = ref<InterfaceStatus[]>([])
const httpsProxy = ref<{ enabled: string }>({ enabled: '0' })
const isProxyEnabled = computed(() => httpsProxy.value.enabled === '1')
const ifacesWithDns = computed(() => statuses.value.filter((iface): iface is InterfaceStatus & { 'dns-server': string[] } => !!iface?.['dns-server']?.length))

function loadInterfaceData(uciData: FormData) {
  return axios
    .bulkGet(['/api/interfaces/config', '/api/interfaces/basic/status', { endpoint: '/api/dns/https_proxy/global', condition: 'vuci-app-https-dns-proxy-api' }])
    .then(([ifaceConfig, ifaceStatus, httpsProxyConfig]) => {
      if (ifaceConfig.success) interfaces.value = ifaceConfig.data
      else message.error($t('Failed to load interfaces'))
      if (ifaceStatus.success) statuses.value = ifaceStatus.data
      else message.error($t('Failed to load interface statuses'))
      if (httpsProxyConfig.success) httpsProxy.value = httpsProxyConfig.data
      else message.error($t('Failed to load HTTPS DNS proxy config'))
      statusTimer.start()
      return loadAdvancedServers(uciData)
    })
    .catch(() => {
      message.error($t('Unexpected error occurred'))
    })
}

const statusTimer = useTimer({ method: loadInterfaceStatus, autostart: false, immediate: true, time: 3000 })
function loadInterfaceStatus() {
  return axios
    .get('/api/interfaces/basic/status')
    .then(({ data }) => {
      statuses.value = data
    })
    .catch(() => {
      message.error($t('Failed to load interface statuses'))
    })
}

const interfaceNames = computed(() => interfaces.value.map(network.getName))
const activeInterfaces = computed(() => statuses.value.filter(iface => iface.is_up).map(network.getName))
const filteredInterfaces = computed(() => activeInterfaces.value.filter(o => interfaceNames.value.includes(o)))

function inputPropsDns(prop1: string, prop2: string) {
  return [
    { prop: prop1, placeholder: 'example.org' },
    { prop: prop2, placeholder: '10.1.2.3' }
  ]
}
function loadParseDns(values: string[]) {
  return values.map(val => {
    const [, hostname, address] = val.split('/')
    return `${hostname},${address}`
  })
}
function writeParseDns([hostname, address]: string[]) {
  return `/${hostname}/${address}`
}
// workaround to bypass the custom component's filtering
// of empty field values
const customRedirectDomains = ref<string[]>([])
function onServerAdvancedChange({ modelValues }: { modelValues: string[][] }) {
  customRedirectDomains.value = modelValues.filter(value => value.some(val => val?.length > 0)).map(writeParseDns)
}
function validateDns(host: boolean, name: 'server' | 'address', hostname: string, address: string) {
  const isValid: ValidationResult = { isValid: true }
  // bypass default hostname validation to allow wildcard symbol
  if (hostname.length !== 1 && /^(\*?[^*]*)$/.test(hostname) && name === 'server') hostname = hostname.replace(/\*/g, 'wildcard')
  const hostnameValidation = hostname === '#' && name === 'address' ? isValid : ValidationRules.hostname(hostname)
  const ipaddrValidation = address === '#' ? isValid : ValidationRules.ipaddr(address)
  if (name === 'server' && !hostnameValidation.isValid) {
    const msg = $t('Wildcard symbol (*) at the start can also be used (e.g., *.example.com).')
    hostnameValidation.message = `${hostnameValidation.message} ${msg}`
  }
  return host ? hostnameValidation : ipaddrValidation
}

const customInputs = ref<{ [key: string]: { validate: () => Promise<boolean> } }>({})
function updateCustomInputs(el: any, key: string) {
  customInputs.value[key] = el
}
async function validateCustomFields() {
  await nextTick()
  const validations = Object.values(customInputs.value)
    .filter(e => e)
    .map(input => input.validate())
  return Promise.all(validations)
}

function validateDuplicateCustom(allValues: string[][], rowValues: string[]): ValidationResult {
  if (allValues.filter(row => row.every((value, index) => rowValues[index] === value)).length > 1) return { isValid: false, message: $t('No duplicate rows allowed.') }
  return { isValid: true }
}

async function beforeSave() {
  saveSplitServers()
}

// 'server' loading and saving is unconventional
// This value can accept different shape strings and we want to display them in different fields
function loadAdvancedServers(uciData: FormData) {
  if (!uciData.dnsmasq[0]) return uciData
  uciData.dnsmasq[0]['server-advanced'] = uciData.dnsmasq[0]?.server.filter(value => value.includes('/'))
  return uciData
}
function loadBasicServers() {
  const basicServers = formData.value.dnsmasq[0]?.server.filter(value => !value.includes('/'))
  // List field is added only after the 2nd click because of empty array - []
  return basicServers.length > 0 ? basicServers : ['']
}
function saveSplitServers() {
  if (isProxyEnabled.value) return
  formData.value.dnsmasq[0]['server-advanced'] = customRedirectDomains.value
  formData.value.dnsmasq[0].server = formData.value.dnsmasq[0]['server-basic'].concat(formData.value.dnsmasq[0]['server-advanced']).filter(s => s)
}
</script>
