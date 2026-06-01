<template>
  <vuci-form
    v-slot="{ uciData }"
    config="udprelay"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      type="general"
      :title="$t('UDP broadcast relay')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'udprelay/config' }]"
      data-key="udpRelay"
      :columns="cols"
      :table-actions="['column-list', 'search']"
    >
      <template #interfaceMark="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="interface_mark"
          :options="interfaceOptions"
        />
      </template>
      <template #port="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="port"
          rules="port"
          required
        />
      </template>
      <template #interfaces="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="interfaces"
          :options="interfaceOptions"
          multiple
          required
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
export default {
  name: 'UdpRelay',
  data() {
    return {
      cols: [
        { name: 'interfaceMark', label: this.$t('Source interface') },
        {
          name: 'port',
          label: this.$t('Port'),
          help: this.$t('Specify a port which the UDP broadcast relay will listen on for incoming packets to relay. This port will also be used as the destination port for relayed packets.')
        },
        {
          name: 'interfaces',
          label: this.$t('Destination interface')
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      ifaces: []
    }
  },

  computed: {
    interfaceOptions() {
      return this.ifaces?.filter(s => s.proto === 'static' || s.proto === 'dhcp').map(this.$network.getName)
    }
  },

  methods: {
    afterLoad() {
      return this.$axios
        .get('/api/interfaces/config')
        .then(ifaces => {
          this.ifaces = ifaces.data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load interfaces data'))
        })
    }
  }
}
</script>
