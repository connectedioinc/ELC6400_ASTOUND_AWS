<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="dhcp"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('HTTPS DNS proxy configuration')"
      :help="$t(`HTTPS DNS proxy is used to encrypt DNS requests that are going through the router's DNS server`)"
      type="main"
      :endpoints="[{ endpoint: 'dns/https_proxy/global' }]"
      data-key="global"
    >
      <tlt-inline-message
        v-if="s.enabled === '1' && formData.proxies.length === 0"
        type="warning"
        :message="$t('There are no resolvers set. Please add at least one.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        @change="$utils.validateForm"
      />
    </vuci-named-section>
    <vuci-typed-section
      type="https-dns-proxy"
      :title="$t('DNS over HTTPS resolvers')"
      :help="$t('If more than one resolver is specified then the first is used as the main one and others are used as failovers.')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dns/https_proxy/config' }]"
      data-key="proxies"
      :columns="cols"
      sort-by="priority"
      :exception-options="['priority']"
      sortable
      :table-actions="['column-list', 'search']"
    >
      <template #presets="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="preset"
          :options="templateOptions"
          :load="findPreset(s)"
          :rules="[(v: string) => utils.validateNoDuplicates(formData.proxies, 'preset', v, $t('Preset'))]"
          no-write
          @change="(_: any, value: string) => onPresetChange(value, s)"
        />
      </template>
      <template #bootstrap_dns="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="bootstrap_dns"
          rules="ip4addr"
          :readonly="!!presets[s.preset]"
          multiple
          :required="formData.global[0].enabled === '1'"
          allow-create
        />
      </template>
      <template #resolver_url="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="resolver_url"
          :rules="[(value: string) => rules.protourl(value, ['https']), (value: string) => utils.validateNoDuplicates(formData.proxies, 'resolver_url', value, $t('Resolver URL'))]"
          :readonly="!!presets[s.preset]"
          :warnings="getResolverWarining"
          :required="formData.global[0].enabled === '1'"
        />
      </template>
      <template #listen_port="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="listen_port"
          :rules="['port', (value: string) => utils.validateNoDuplicates(formData.proxies, 'listen_port', value, $t('Port'))]"
          :placeholder="getDefaultPort(s)"
          :placeholder-prefix="false"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script setup lang="ts">
import { useTranslate } from '@ui-core/composables/useI18n'
import type { DohProxyPresets, DohFrontProxy, DohGlobal } from '@/types/HttpDnsProxy'
import { copy } from '@ui-core/utils/vue-helpers'
import { ref } from 'vue'
import { utils } from '@/plugins/utils'
import { rules } from '@/validation-rules'

const $t = useTranslate()
const formData = ref<{ global: DohGlobal[]; proxies: DohFrontProxy[] }>({ global: [], proxies: [] })
const cols: any[] = [
  { width: 'sm', name: 'presets', label: $t('Preset'), help: $t('Presets for popular DNS over HTTPS resolvers. Use "Custom" to set your resolver.') },
  { width: 'base', name: 'bootstrap_dns', label: $t('Bootstrap DNS'), help: $t('This DNS is used for the initial "Resolver URL" resolve.') },
  { width: 'base', name: 'resolver_url', label: $t('Resolver URL'), help: $t('URL to DNS over HTTPS resolver.') },
  { width: 'xs', name: 'listen_port', label: $t('Port'), help: $t('Internal port used for this resolver. Change only if it collides with existing ports on this device.') }
]
const templateOptions: [keyof typeof presets | '', string][] = [
  ['', 'Custom'],
  ['google', 'Google'],
  ['cloudflare', 'CloudFlare']
] as const
const presets: Record<string, DohProxyPresets> = {
  google: {
    bootstrap_dns: ['8.8.8.8', '8.8.4.4'],
    resolver_url: 'https://dns.google/dns-query'
  },
  cloudflare: {
    bootstrap_dns: ['1.1.1.1', '1.0.0.1'],
    resolver_url: 'https://cloudflare-dns.com/dns-query'
  }
}
function findPreset(config: DohFrontProxy): string {
  return (
    Object.entries(presets).find(([, preset]) => {
      if (preset.resolver_url !== config.resolver_url) return false
      return JSON.stringify(preset.bootstrap_dns.sort()) === JSON.stringify(config.bootstrap_dns.sort())
    })?.[0] ?? ''
  )
}
function applyPreset(config: DohFrontProxy, preset: DohProxyPresets) {
  config.resolver_url = preset.resolver_url
  config.bootstrap_dns = copy(preset.bootstrap_dns)
}
function onPresetChange(presetName: string, config: DohFrontProxy) {
  if (!presetName) return
  applyPreset(config, presets[presetName])
}
function getDefaultPort(config: DohFrontProxy): string {
  return (5053 + formData.value.proxies.indexOf(config)).toString()
}
function getResolverWarining(resolver: string) {
  if (!rules.protourl(resolver, ['https']).isValid) return []
  if (new URL(resolver).pathname === '/') return [$t("DNS resolvers without a path in the URL are uncommon. Most times resolver path is '/dns-query'")]
  return []
}
</script>
