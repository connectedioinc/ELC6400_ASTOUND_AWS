<template>
  <vuci-form
    v-slot="{ uciData }"
    config="snmpd"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('%s community').format(section['.type'] === 'com2sec' ? 'SNMP' : 'SNMPv6'))"
      :help="$t('This section is used to configure the settings of the community. Scroll your mouse pointer over field names in order to see helpful hints.')"
      :uci-data="uciData"
      :data-key="sectionKey"
      :endpoints="[{ endpoint: `snmp/${sectionKey}/config` }]"
    >
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Community name')"
        :help="$t('%s community name is an ID that allows access to a routers %s data.').format(sectionTitle)"
        name="community"
        :rules="v => validateName.bind(v, isSec6, s)"
        maxlength="31"
        required
        sensitive
        password
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('IP address')"
        :help="$t('IP address for the community.')"
        name="ipaddr"
        placeholder="0.0.0.0"
        rules="ip4addr"
        :depend="!isSec6"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('IP mask')"
        :help="$t('Netmask for the IP address.')"
        name="netmask"
        placeholder="0"
        rules="irange(0,32)"
        :depend="!isSec6"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Source')"
        name="source"
        rules="ipmask6host"
        :depend="isSec6"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Access mode')"
        :help="$t('Access mode specifies if you can only read or read and write information from and to the device.')"
        name="secname"
        :options="accessModes"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  inject: ['validateName'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      accessModes: [
        ['ro', this.$t('Read-Only')],
        ['rw', this.$t('Read-Write')]
      ]
    }
  },
  computed: {
    isSec6() {
      return this.section['.type'] === 'com2sec6'
    },
    sectionTitle() {
      return this.isSec6 ? 'SNMPv6' : 'SNMP'
    },
    sectionKey() {
      return this.isSec6 ? 'communities_v6' : 'communities'
    }
  }
}
</script>
