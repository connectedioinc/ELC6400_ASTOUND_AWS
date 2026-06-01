<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="nhrp;ipsec"
    editing
  >
    <vuci-named-section
      v-slot="{ s, sd }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'nhrp/interface/config' }]"
      data-key="interface"
      :name="section.id"
      :title="$utils.getModalTitle($t('NHRP interface'), section.id)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enables client.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="interface"
        :label="$t('Interface')"
        :help="$t('Interface which will be using NHRP.')"
        :options="ifaceOptions"
      />
      <vuci-form-item-input
        name="network_id"
        :uci-section="s"
        :label="$t('Network ID')"
        :help="$t('Network ID of NHRP.')"
        rules="irange(1,4294967295)"
        placeholder="22"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="auth"
        :label="$t('NHRP authentication key')"
        :help="$t('NHRP authentication key.')"
        rules="credentials_validate"
        placeholder="12346578"
        maxlength="8"
        password
        sensitive
      />
      <vuci-form-item-select
        :uci-section="s"
        name="proto_address"
        :label="$t('NHS')"
        :help="$t('IP address of Next-Hop Server.')"
        :options="[['dynamic', $t('dynamic')]]"
        :rules="validateIpaddr"
        allow-create
      />
      <vuci-form-item-input
        :uci-section="s"
        name="nbma_address"
        :label="$t('NBMA')"
        :help="$t('Non-Broadcast Multi-Access(NBMA) network IP address.')"
        rules="host"
        placeholder="0.0.0.0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="holdtime"
        :label="$t('Hold-time')"
        :help="
          $t(
            'Specifies the holding time for NHRP Registration Requests and Resolution Replies sent from this interface or shortcut-target. The holdtime is specified in seconds and defaults to two hours.'
          )
        "
        rules="irange(1,65000)"
        initial="7200"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="redirect"
        :label="$t('Redirect')"
        :help="$t('Redirect replies on the NHS, this setting allows spokes to communicate with each others directly.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="ipsec_support"
        :label="$t('IPsec support')"
        :help="$t('Use NHRP over IPsec.')"
        :depend="$store.hasPackages('strongswan.control')"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="ipsec_instance"
        :label="$t('IPsec instance')"
        :help="$t('Select IPsec instance name.')"
        :options="ipsecInstance"
        :depend="sd.ipsec_support === '1'"
        :placeholder="$t('-- Please select --')"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: `nhrp/interface/${section.id}/mapping/config/` }]"
      data-key="mapping"
      :type="`${section.id}_map`"
      :title="$utils.getModalTitle($t('NHRP mappings'))"
      :columns="mapping"
    >
      <template #ip_addr="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="ip_addr"
          rules="host"
          placeholder="0.0.0.0"
        />
      </template>
      <template #nbma="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="nbma"
          rules="host"
          placeholder="0.0.0.0"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: `nhrp/interface/${section.id}/nhs/config/` }]"
      data-key="nhs"
      :type="`${section.id}_nhs`"
      :title="$utils.getModalTitle('NHRP NHS')"
      :columns="nhs"
    >
      <template #nhs_addr="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="nhs_address"
          :rules="validateIpaddr"
          placeholder="0.0.0.0"
        />
      </template>
      <template #nbma_addr="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="nbma_address"
          rules="host"
          placeholder="0.0.0.0"
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
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      mapping: [
        { name: 'ip_addr', label: this.$t('IP address'), help: this.$t('IP address of a station.') },
        { name: 'nbma', label: this.$t('NBMA'), help: this.$t('Non-Broadcast Multi-Access(NBMA) network IP address.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      nhs: [
        { name: 'nhs_addr', label: this.$t('NHS IP address'), help: this.$t('Static Next Hop Server IP address.') },
        { name: 'nbma_addr', label: this.$t('NBMA'), help: this.$t('Non-Broadcast Multi-Access(NBMA) network IP address of this NHS.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ]
    }
  },
  computed: {
    ifaceOptions() {
      const filteredIfaces = this.$network.interfaceOptions(
        this.formOptions().ifStatus.filter(i => ['proto', 'static', 'dhcpv6', 'gre'].includes(i.proto) && ['lan', 'wan'].includes(i.area_type) && i.interface !== 'loopback')
      )
      const gre = this.formOptions()
        .ifStatus.filter(i => i.proto === 'gre')
        .map(i => [i.proto + '4-' + i.interface, i.proto + '4-' + i.interface + ' (gre)'])
      return filteredIfaces.concat(gre)
    },
    ipsecInstance() {
      return this.formOptions().ipsecInstances.map(i => i.id)
    }
  },
  methods: {
    validateIpaddr(val) {
      this.$VuciValidator.value = val
      const res = this.$VuciValidator.ipaddr()
      if (res.isValid || val === 'dynamic') {
        return { isValid: true }
      }
      return { isValid: false, message: this.$t("NHS must be an IP address or 'dynamic'") }
    }
  }
}
</script>
