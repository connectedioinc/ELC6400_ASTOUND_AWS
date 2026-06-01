<template>
  <vuci-form
    v-slot="{ uciData }"
    config="network"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'vrf/global' }]"
      :title="$t('Global settings')"
      data-key="global"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="tcp_l3mdev"
        :label="$t('Enable TCP VRF forwarding')"
        :help="$t('Allow services not bound to VRF to accept TCP traffic.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="udp_l3mdev"
        :label="$t('Enable UDP VRF forwarding')"
        :help="$t('Allow services not bound to VRF to accept UDP traffic.')"
      />
    </vuci-named-section>
  </vuci-form>
</template>
