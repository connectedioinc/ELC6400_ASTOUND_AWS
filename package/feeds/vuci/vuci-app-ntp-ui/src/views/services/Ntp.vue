<template>
  <vuci-form
    v-slot="{ uciData }"
    config="ntpclient;ntpserver"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'date_time/ntp/client/config', sectionFilter: section => findNamedSection(section) }]"
      data-key="ntpclient"
      :title="$t('Time synchronization')"
      :help="$t('This section is used to configure the device\'s time settings.')"
      :error-handlers="{ edit: returnEditErrorMessage }"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable NTP client')"
        :help="$t('Turns NTP client on or off.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="save"
        :label="$t('Save time to flash')"
        :help="$t('Saves last synchronized time to flash memory.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="force"
        :label="$t('Force servers')"
        :help="$t('Trust network and NTP servers, no recommended RFC-4330 cross-checks will be made.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="interval"
        :label="$t('Update interval (in seconds)')"
        :help="$t('How often the device will update the time.')"
        rules="irange(60,2147483647)"
        placeholder="600"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="freq"
        :label="$t('Offset frequency')"
        :help="$t('Adjusts the minor drift of the local clock so that it will run more accurately.')"
        rules="uinteger"
        placeholder="0"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="count"
        :label="$t('Count of time synchronizations')"
        :help="$t('The amount of times that device will perform time synchronizations. Leave empty in order to set to infinite.')"
        rules="irange(0,2147483647)"
        placeholder="0"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="sync_enabled"
        :label="$t('Operator station synchronization')"
        :help="$t('Enable time synchronization with connected mobile operator.')"
        :depend="modemList.length > 0"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="tmz_sync_enabled"
        :label="$t('Timezone synchronization')"
        :help="$t('Set device\'s timezone according to information received from mobile operator.')"
        :depend="modemList.length > 0 && s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="failover"
        :label="$t('Count of failed NTP requests')"
        :help="$t('How many times should NTP client fail before permanently switching to operator station synchronization (empty value - 5).')"
        rules="uinteger"
        :depend="modemList.length > 0 && s.enabled === '1' && s.sync_enabled === '1'"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      type="ntpserver"
      data-key="ntpclientserver"
      :endpoints="[{ endpoint: 'date_time/ntp/time_servers/config' }]"
      :title="$t('Time servers')"
      :help="$t('This section is used to specify which time servers the device will use for time synchronization. To add more time servers to the list, click the \'Add\' button.')"
      :add-validate="onAdd"
      :columns="columns"
      :error-handlers="{ delete: returnDeleteErrorMessage }"
      :table-actions="['column-list', 'search']"
      expanded
    >
      <template #hostname="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="hostname"
          rules="host"
          placeholder="myhost.example.com"
          required
        />
      </template>
    </vuci-typed-section>
    <vuci-named-section
      v-if="ntpServerInstalled"
      v-slot="{ s }"
      :uci-data="uciData"
      name="general"
      data-key="ntpserver"
      :endpoints="[{ endpoint: 'date_time/ntp/server/config' }]"
      :title="$t('NTP server')"
      :help="$t('This section is used to make the router act as an NTP server so that it can provide time synchronization services for other network devices.')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable NTP server')"
        :help="$t('Turns NTP server on or off.')"
        :readonly="ntpdEnabled"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  data() {
    return {
      modemList: [],
      ntpdEnabled: false,
      columns: [{ name: 'hostname', label: this.$t('Hostname'), help: this.$t("NTP (Network Time Protocol) server's hostname.") }],
      errorMessages: {
        103: this.$t('NTP client requires at least one "Time servers" instance added or "Operator station synchronization" enabled'),
        defaultEdit: this.$t('Failed to edit configuration'),
        defaultDelete: this.$t('Failed to edit configuration')
      },
      ntpServerInstalled: true
    }
  },
  methods: {
    loadData(uciData) {
      if (!uciData.ntpserver || uciData.ntpserver.length === 0) {
        // ntpserver comes from busybox so it doesn't have a separate .control file
        // that's why it's being checked here
        this.ntpServerInstalled = false
      }
      const endpoints = [
        {
          endpoint: '/api/modems/status',
          condition: 'mobifd.control'
        },
        {
          endpoint: '/api/date_time/ntpd/config/ntp',
          condition: 'vuci-app-ntpd-api.control'
        }
      ]
      return this.$axios
        .bulkGet(endpoints)
        .then(([modemRes, ntpdRes]) => {
          if (!modemRes.success) this.$message.error(this.$t('Failed to load modem data'))
          else this.modemList = this.$mobile.parseModems(modemRes.data)
          if (!ntpdRes.success) this.$message.error(this.$t('Failed to load NTPD data'))
          if (ntpdRes.success && ntpdRes.data.enabled === '1') {
            this.ntpdEnabled = true
            this.$notification.info(this.$t("Can't enable NTPD and NTP server both at the same time"))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    findNamedSection(sections) {
      return sections.find(section => section['.type'] === 'ntpclient')
    },
    returnEditErrorMessage(res) {
      const errorCode = res.data.errors[0].code
      return this.errorMessages[errorCode] || this.errorMessages.defaultEdit
    },
    returnDeleteErrorMessage(res) {
      const errorCode = res.data.errors[0].code
      return this.errorMessages[errorCode] || this.errorMessages.defaultDelete
    },
    onAdd(_, dataSource) {
      return { valid: dataSource.length < 4, message: this.$t('Cannot create more instances. Only 4 instances are allowed') }
    }
  }
}
</script>
