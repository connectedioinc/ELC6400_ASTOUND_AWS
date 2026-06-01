<template>
  <vuci-form
    v-slot="{ uciData }"
    config="bgp"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'bgp/maps/config' }]"
      :name="section.id"
      :uci-data="uciData"
      :data-key="`route_maps`"
      :title="$utils.getModalTitle($t('route map'), section.id)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable/Disable BGP route map.')"
        name="enabled"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Action')"
        name="action"
        :help="$t('Denies or permits matched entry.')"
        :options="[
          ['permit', $t('Permit')],
          ['deny', $t('Deny')]
        ]"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Local preference')"
        :help="$t('Used to determine best route towards a certain destination.')"
        name="local_preference"
        rules="irange(0,4294967295)"
        placeholder="1"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Metric')"
        name="metric"
        :help="$t('Sets a metric value for determining the preferred path into an AS.')"
        rules="irange(0,4294967295)"
        placeholder="1"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  }
}
</script>
