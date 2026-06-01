<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="zerotier"
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: `zerotier/${parent}/networks/config` }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('ZeroTier network'), section.name)"
      :uci-data="uciData"
      data-key="zerotier_networks"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turn this network interface on/off.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Network ID')"
        :help="$t('A key peers need connecting to this interface.')"
        name="network_id"
        :rules="['hexstring', validateNetwork]"
        maxlength="16"
        minlength="16"
        required
      />
      <tlt-form-accordion name="zerotier_networks_advanced_options">
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Port')"
          name="port"
          :help="$t('Network port for UDP and TCP/HTTP connections (default: 9993, set to 0 for random port assignment).')"
          :rules="['port', validatePort]"
          placeholder="9993"
          initial="9993"
          required
        />
        <vuci-form-item-select
          :uci-section="s"
          name="bridge_to"
          :label="$t('Bridge to')"
          :help="$t('Specify to which interface this ZeroTier instance should be bridged.')"
          :options="mapBridgedNetworkOptions"
          initial="none"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Allow default route')"
          :help="$t('Allows ZeroTier to override system default route.')"
          name="allow_default"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Allow global IP')"
          :help="$t('Allows ZeroTier managed IPs and routes to overlap public IP space.')"
          name="allow_global"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Allow managed IP')"
          :help="$t('Assigns ZeroTier managed IPs and routes.')"
          name="allow_managed"
          initial="1"
        />
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Allow DNS')"
          :help="$t('Applies DNS servers that are set at the network controller.')"
          name="allow_dns"
        />
        <vuci-form-item-upload
          :uci-section="s"
          name="custom_planet_file"
          :label="$t('Custom planet file')"
          :help="$t('Custom planet file contains user-defined roots, enabling the use of private root servers.')"
          max-size="16MB"
        />
      </tlt-form-accordion>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      parent: this.section['.type'].substring(8),
      formData: {}
    }
  },
  computed: {
    mapBridgedNetworkOptions() {
      const bridgeOptions = [['none', this.$t('None')]]
      const filteredIfaces = this.formOptions().interfaces.filter(iface => iface['.type'] === 'interface' && iface.bridge === '1')
      return bridgeOptions.concat(filteredIfaces.map(iface => [this.$network.getName(iface), this.$network.getName(iface).toUpperCase()]))
    }
  },
  methods: {
    validateNetwork(value) {
      const res = {
        isValid: true,
        message: this.$t('Network ID cannot be the same between instance networks')
      }
      const sections = this.formData.zerotier_networks.filter(section => section['.type'] === this.section['.type'] && section.id !== this.section.id)
      res.isValid = !sections.some(section => {
        return section.network_id === value
      })
      return res
    },
    validatePort(value) {
      const res = {
        isValid: true,
        message: this.$t('Port key cannot be the same between networks')
      }
      const sections = this.formData.zerotier_networks.filter(section => section.id !== this.section.id)
      res.isValid = !sections.some(section => {
        return section.port === value
      })
      return res
    }
  }
}
</script>
