<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    :after-load="afterLoad"
  >
    <port-based-vlan
      :uci-data="uciData"
      :ifaces="ifaces"
      :dot1x-config="config"
      :port-mirroring="portMirroring"
      :form-data="formData"
      :vuci-form="$refs?.vuciForm ?? {}"
      :after-load="afterLoad"
    />
  </vuci-form>
</template>
<script>
import PortBasedVlan from '@/components/network/PortBasedVlan.vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'

export default {
  components: { PortBasedVlan },
  data() {
    return {
      formData: {},
      ifaces: [],
      config: [],
      portMirroring: []
    }
  },
  computed: {
    ...mapState(useMainStore, {
      dsa: state => state.board?.hwinfo?.dsa
    })
  },
  methods: {
    afterLoad() {
      const requests = [
        { endpoint: '/api/interfaces/config', condition: this.dsa },
        { endpoint: '/api/dot1x/ports/config', condition: 'dot1x-server.control' },
        { endpoint: '/api/port_mirroring/config', condition: this.$store.hasPackages('software-port-mirroring.control') && !this.$store.board.hwinfo.dsa },
        { endpoint: '/api/network/devices/bridge/config', condition: this.$store.board.hwinfo.dsa }
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([interfacesData, configData, portConfig, bridgeConfig]) => {
          if (interfacesData.success) this.ifaces = interfacesData.data
          else this.$message.error(this.$t('Failed to load interfaces config'))
          if (configData.success) this.config = configData.data
          else this.$message.error(this.$t('Failed to load VLAN data'))
          if (portConfig.success) this.portMirroring = portConfig.data
          else this.$message.error(this.$t('Failed to load port mirroring config'))
          return { devices: bridgeConfig.data ?? [] }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    }
  }
}
</script>
