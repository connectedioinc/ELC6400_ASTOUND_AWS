<template>
  <vuci-form
    v-slot="{ uciData }"
    config="firewall"
    async-load
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'firewall/global' }]"
      data-key="general"
      type="defaults"
      :title="$t('General settings')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Drop invalid packets')"
        :help="$t('If enabled, a \'Drop\' action will be performed on packets that are determined to be invalid.')"
        name="drop_invalid"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Automatic helper assignment')"
        :help="$t('Automatically assign conntrack helpers based on traffic protocol and port. If turned off, conntrack helpers can be selected for each zone.')"
        name="auto_helper"
        initial="1"
        :rmempty="false"
      />
      <tlt-form-accordion
        name="default_actions"
        :title="$t('default policies')"
      >
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Input')"
          name="input"
          :options="actions"
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Default action of the %s chain if a packet does not match any existing rule on that chain.').format('INPUT')"
              :hints="() => getActionHint(false)"
            />
          </template>
        </vuci-form-item-select>
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Output')"
          name="output"
          :options="actions"
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Default action of the %s chain if a packet does not match any existing rule on that chain.').format('OUTPUT')"
              :hints="() => getActionHint(false)"
            />
          </template>
        </vuci-form-item-select>
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('Forward')"
          name="forward"
          :options="actions"
        >
          <template #help>
            <hint-helper
              :main-hint="$t('Default action of the %s chain if a packet does not match any existing rule on that chain.').format('FORWARD')"
              :hints="() => getActionHint(false)"
            />
          </template>
        </vuci-form-item-select>
      </tlt-form-accordion>
    </vuci-named-section>
    <vuci-named-section
      v-if="$store.board!.hwinfo.nat_offloading"
      v-slot="{ s }"
      :title="$t('Routing/NAT offloading')"
      :uci-data="uciData"
      data-key="nat"
      :endpoints="[{ endpoint: 'nat_offloading/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Software flow offloading')"
        :help="$t('Software based offloading for routing/NAT.')"
        name="flow_offloading"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Hardware flow offloading')"
        :help="$t('Hardware based offloading for routing/NAT.')"
        name="flow_offloading_hw"
        :depend="!!$store.board!.hwinfo.hw_nat && s.flow_offloading === '1'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('IPsec software flow offload')"
        :help="$t('Software based offloading for IPsec.')"
        name="flow_offloading_xfrm"
        :depend="!!$store.board!.hwinfo['xfrm-offload'] && s.flow_offloading === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script lang="ts" setup>
import { useTranslate } from '@ui-core/composables/useI18n'
import { useFirewallCommon } from '@/components/network/firewall/firewallCommon'
import HintHelper from '@/components/shared/HintHelper.vue'

const $t = useTranslate()
const { actions, getActionHint } = useFirewallCommon()
</script>
