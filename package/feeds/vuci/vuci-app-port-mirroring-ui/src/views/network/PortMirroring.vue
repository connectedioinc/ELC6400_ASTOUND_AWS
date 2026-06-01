<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Port mirroring')"
      :help="
        $t(
          'Port Mirroring (may also be referred to as SPAN (Switched Port Analyzer)) is a service that relays a copy of all \
        network packets (incoming and outgoing) on one Ethernet port (Source Port) to another (Monitoring Port)'
        )
      "
      :endpoints="[{ endpoint: 'port_mirroring/config' }]"
      name="general"
      :form-methods="['edit', 'get']"
      data-key="switch"
    >
      <vuci-form-item-select
        :uci-section="s"
        name="mirror_monitor_port"
        :label="$t('Monitoring port')"
        :help="$t('The port which will mirror the packets.')"
        :options="monitoringPorts"
        force-write
      />
      <vuci-form-item-select
        :uci-section="s"
        name="mirror_source_port"
        :label="$t('Source port')"
        :help="$t('Port whose packets will be mirrored.')"
        :options="sourcePorts"
        :depend="s.mirror_monitor_port !== 'disabled'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enable_mirror_rx"
        :label="$t('Enable mirroring of incoming packets')"
        :depend="s.mirror_monitor_port !== 'disabled'"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="enable_mirror_tx"
        :label="$t('Enable mirroring of outgoing packets')"
        :depend="s.mirror_monitor_port !== 'disabled'"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  data() {
    return {
      formData: {
        switch: []
      }
    }
  },
  computed: {
    lanPorts() {
      const ports = this.$store.board.network?.lan?.ports
      if (ports) return ports.map(p => [p.replace('lan', ''), p.toUpperCase()])
      const sw = this.$store.board.switch.switch0
      if (!sw.ports) return []
      return sw.ports
        .filter(p => p.role === 'lan' && p.device !== 'eth0')
        .sort((a, b) => (a.index ? a.index - b.index : a.num - b.num))
        .map(p => [`${p.index ? p.index : p.num}`, `LAN${p.index ? p.index : p.num}`])
    },
    monitoringPorts() {
      return [['disabled', this.$t('Disabled')], ...this.lanPorts]
    },
    sourcePorts() {
      const section = this.formData.switch.find(s => s.id === 'general') || {}
      return this.lanPorts.filter(([val]) => val !== section.mirror_monitor_port)
    }
  }
}
</script>
