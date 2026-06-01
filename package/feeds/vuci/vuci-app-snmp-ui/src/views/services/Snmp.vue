<template>
  <vuci-form
    v-model="formData"
    config="snmpd"
    :after-load="loadData"
    :before-save="onBeforeSave"
    bulk-request
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        name="general"
        :title="$t('SNMP agent settings')"
        :help="$t('Configure main SNMP settings.')"
        :uci-data="uciData"
        data-key="settings"
        :endpoints="[{ endpoint: 'snmp/agent/config' }]"
        :error-handlers="{ edit: returnErrorMessage }"
      >
        <tlt-inline-message
          v-show="lldpEnabled"
          id="lldp-notice"
          type="info"
        >
          {{ $t('Configuring some options will be disabled, because') }}
          <router-link to="/services/lldp">
            {{ $t('LLDP') }}
          </router-link>
          {{ $t('is enabled') }}
        </tlt-inline-message>
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          :label="$t('Enable SNMP service')"
          :help="$t('Enable SNMP (Simple Network Management Protocol) service on system startup.')"
          :readonly="lldpEnabled"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="allow_ra"
          :label="$t('Enable remote access')"
          :help="$t('Create a firewall rule that allows access to SNMP for remote hosts.')"
          :depend="firewallInstalled"
        />
        <vuci-form-item-select
          :uci-section="s"
          :label="$t('IP type')"
          :help="$t('IP type used by SNMP.')"
          name="ip_type"
          :options="ipTypes"
          initial="ipv4"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="port"
          :label="$t('Port')"
          :help="$t('TCP/UDP port number used for the connection.')"
          placeholder="161"
          initial="161"
          rules="port"
          required
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="v1mode"
          :label="$t('SNMP v1 mode')"
          :help="$t('Enable SNMP v1 compatibility.')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="v2cmode"
          :label="$t('SNMP v2c mode')"
          :help="$t('Enable SNMP v2c compatibility.')"
        />
        <vuci-form-item-switch
          :uci-section="s"
          name="v3mode"
          :label="$t('SNMP v3 mode')"
          :help="$t('Enable SNMP v3 compatibility.')"
        />
      </vuci-named-section>
      <vuci-named-section
        v-slot="{ s }"
        :title="$t('SNMP system summary')"
        :help="$t('Configure basic SNMP attributes.')"
        :uci-data="uciData"
        data-key="system"
        :endpoints="[{ endpoint: 'snmp/system/config', sectionFilter: sections => sections.find(section => section['.type'] === 'system') }]"
      >
        <vuci-form-item-button
          :uci-section="s"
          name="downloadMib"
          :label="$t('MIB file')"
          :help="$t('Download the MIB file containing custom %s module tree for this device.').format($brand('companyShort'))"
          :text="$t('Download')"
          :loading="mibFileDownloading"
          @click="downloadMib"
        />
        <vuci-form-item-dummy
          :uci-section="s"
          :label="$t('%s OID path').format($brand('companyShort'))"
          :help="$t('The OID path containing %s IANA Private Enterprise Number (PEN). All custom private SNMP modules are referenced under this OID path.').format($brand('companyShort'))"
          name="oid"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="sysLocation"
          :label="$t('Location')"
          :help="$t('Location of the system.')"
          placeholder="location"
          rules="string"
          maxlength="255"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="sysContact"
          :label="$t('Contact')"
          :help="$t('Contact information.')"
          placeholder="email@example.com"
          maxlength="255"
        />
        <vuci-form-item-input
          :uci-section="s"
          name="sysName"
          :label="$t('Name')"
          :help="$t('Defines the SNMP system name value.')"
          placeholder="name"
          rules="system_host"
          required
        />
      </vuci-named-section>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <slot name="footerButtons" />
        <tlt-button
          button-id="saveandapply"
          @click="() => save()"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>
<script>
export default {
  data() {
    return {
      formData: {},
      ipTypes: [
        ['ipv4', this.$t('IPv4')],
        ['ipv6', this.$t('IPv6')],
        ['ipv4v6', this.$t('IPv4 and IPv6')]
      ],
      errorMessages: {
        2: this.$t('At least one community configuration must exist to enable the SNMP service.'),
        default: this.$t('Failed to edit configuration')
      },
      firewallInstalled: this.$store.hasPackages('firewall'),
      mibFileDownloading: false,
      lldpEnabled: false
    }
  },
  methods: {
    loadData() {
      return this.$axios
        .get('/api/lldp/config/general', { condition: 'vuci-app-lldp-api.control' })
        .then(({ data }) => {
          this.lldpEnabled = data?.enabled === '1'
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load LLDP data'))
        })
    },
    downloadMib() {
      this.mibFileDownloading = true
      return this.$utils
        .downloadFileApi('/api/snmp/system/actions/download_mib', 'text/plain', 'POST')
        .catch(() => {
          this.$message.error(this.$t('Failed to download MIB file'))
        })
        .finally(() => {
          this.mibFileDownloading = false
        })
    },
    onBeforeSave() {
      const settings = this.formData.settings[0]
      if (settings.enabled === '1' && settings.v1mode === '0' && settings.v2cmode === '0' && settings.v3mode === '0') {
        return Promise.reject(this.$t("Can't enable SNMP, without selected SNMP mode"))
      }
      return Promise.resolve()
    },
    returnErrorMessage(res) {
      const errorCode = res.data.errors[0].code
      return this.errorMessages[errorCode] || this.errorMessages.default
    }
  }
}
</script>
