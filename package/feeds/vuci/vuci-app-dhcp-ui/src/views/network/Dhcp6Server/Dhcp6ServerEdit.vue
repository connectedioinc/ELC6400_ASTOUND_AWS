<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="dhcp"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'dhcp/servers/ipv6/config' }]"
      data-key="dhcpv6"
      :title="$utils.getModalTitle('DHCPv6', section.id)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enable_dhcpv6"
        :label="$t('Enable')"
        @change="$network.validateDhcpV6Enable(s)"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ra"
        :label="$t('Router Advertisement-Service')"
        :options="modeOptions"
        @change="$network.validateDhcpV6Enable(s)"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Configure how IPv6 router advertisement should work.')"
            :hints="[
              {
                hint: $t('Do not advertise any devices as router.'),
                option: $t('Disabled')
              },
              {
                hint: $t('Advertise this device as a router.'),
                option: $t('Server')
              },
              {
                hint: $t('Advertise the parent interface as a router.'),
                option: $t('Relay')
              },
              {
                hint: $t(`Normally works as 'Relay' with automatic fallback to 'Server' if there is no active parent interface.`),
                option: $t('Hybrid')
              }
            ]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        name="dhcpv6"
        :label="$t('DHCPv6-Service')"
        :options="modeOptions"
        @change="$network.validateDhcpV6Enable(s)"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Configure how this device should assign IPv6 addresses.')"
            :hints="[
              {
                hint: $t('Do not automatically assign IPv6 addresses.'),
                option: $t('Disabled')
              },
              {
                hint: $t('This device assigns IPv6 addresses.'),
                option: $t('Server')
              },
              {
                hint: $t('Forward IPv6 assigning requests between network devices and parent interface.'),
                option: $t('Relay')
              },
              {
                hint: $t(`Normally works as 'Relay' with automatic fallback to 'Server' if there is no active parent interface`),
                option: $t('Hybrid')
              }
            ]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        name="ra_management"
        :label="$t('DHCPv6-Mode')"
        :options="managementOptions"
        :depend="s.dhcpv6 == 'server' || s.dhcpv6 == 'hybrid'"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Configure how clients will get IPv6 addresses.')"
            :hints="[
              {
                hint: $t(
                  'Prefer client to use SLAAC (Stateless Address Autoconfiguration) to get an IPv6 address. This can be ignored by some devices. Disable DHCPv6-Service to enforce stateless mode.'
                ),
                option: $t('Prefer stateless')
              },
              {
                hint: $t('The client will use its preferred way to get an IPv6 address.'),
                option: $t('Auto')
              },
              {
                hint: $t('Prefer client to use DHCPv6 to get an IPv6 address. This can be ignored by some devices without DHCPv6 support like android.'),
                option: $t('Prefer stateful')
              }
            ]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-select
        :uci-section="s"
        name="ndp"
        :label="$t('NDP-Proxy')"
        :options="ndpOptions"
        @change="$network.validateDhcpV6Enable(s)"
      >
        <template #help>
          <hint-helper
            :main-hint="$t('Configure how Neighbour Discovery should work.')"
            :hints="[
              {
                hint: $t('Do not proxy any NDP packets.'),
                option: $t('Disabled')
              },
              {
                hint: $t('Forward NDP packets between network devices and the parent interface.'),
                option: $t('Relay')
              },
              {
                hint: $t(`Normally works as 'Relay' with automatic fallback to 'Disabled' if there is no active parent interface.`),
                option: $t('Hybrid')
              }
            ]"
          />
        </template>
      </vuci-form-item-select>
      <vuci-form-item-switch
        :uci-section="s"
        name="ra_default"
        :label="$t('Always announce default router')"
        :help="$t('Announce as default router even if no public prefix is available.')"
        :depend="s.ra == 'server' || s.ra == 'hybrid'"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="dns"
        :label="$t('Announced DNS servers')"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="domain"
        :label="$t('Announced DNS domains')"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script lang="ts" setup>
import type { DhcpV6Config } from '@/types/dhcpTypes'
import { useTranslate } from '@ui-core/composables/useI18n'
import HintHelper from '@/components/shared/HintHelper.vue'

const $t = useTranslate()

defineProps<{ section: DhcpV6Config }>()

const modeOptions = [
  ['', $t('Disabled')],
  ['server', $t('Server mode')],
  ['relay', $t('Relay mode')],
  ['hybrid', $t('Hybrid mode')]
]
const ndpOptions = [
  ['', $t('Disabled')],
  ['relay', $t('Relay mode')],
  ['hybrid', $t('Hybrid mode')]
]
const managementOptions = [
  ['0', $t('Prefer stateless')],
  ['1', $t('Auto')],
  ['2', $t('Prefer stateful')]
]
</script>
