<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    config="ospf"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ospf/neighbor/config' }]"
      data-key="neighbor"
      :name="section.id"
      :title="$t('OSPF neighbor configuration')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Turns Proto OSPF neighbour instance on and off.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="neighbor"
        :label="$t('Neighbor')"
        :help="$t('OSPF Neighbor IPv4 Address.')"
        rules="ip4addr"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="priority"
        :label="$t('Neighbor Priority')"
        :help="$t('Priority for this neighbor.')"
        rules="irange(0,255)"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="polling_interval"
        :label="$t('Polling interval')"
        :help="$t('Dead Neighbor Polling interval in seconds.')"
        rules="irange(1,65535)"
        inital="120"
        placeholder="120"
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
