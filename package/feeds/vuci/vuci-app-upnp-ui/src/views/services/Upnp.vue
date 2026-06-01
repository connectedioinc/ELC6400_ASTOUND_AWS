<template>
  <vuci-form
    v-slot="{ uciData }"
    config="upnpd"
    :after-load="loadRedirectData"
  >
    <tlt-table
      id="upnp_redirects"
      :data-source="redirectsData"
      :columns="redirectColumns"
      :title="$t('Active UPnP redirects')"
      :help="$t('UPnP allows clients in the local network to automatically configure the router.')"
      :table-actions="['column-list', 'search']"
    >
      <template #remove="{ record }">
        <tlt-button
          button-id="remove"
          size="sm"
          @click="removeRedirect(record.num)"
        >
          {{ $t('Remove') }}
        </tlt-button>
      </template>
    </tlt-table>
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('MiniUPnP settings')"
      :help="$t('Here you can configure UPnP settings.')"
      :endpoints="[{ endpoint: 'upnp/global' }]"
      :uci-data="uciData"
      data-key="upnpd"
      :error-handlers="{ edit: returnErrorMessage }"
      name="general"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable')"
            name="enabled"
            :help="$t('Toggles UPnP ON or OFF.')"
            :rmempty="false"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable secure mode')"
            name="secure_mode"
            :help="$t('Allow adding forwards only to requesting ip addresses.')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable additional logging')"
            name="log_output"
            :help="$t('Puts extra debugging information into the system log.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Downlink')"
            name="download"
            placeholder="1024"
            rules="uinteger"
            :help="$t('Value in KByte/s, informational only.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Uplink')"
            name="upload"
            placeholder="512"
            rules="uinteger"
            :help="$t('Value in KByte/s, informational only.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port')"
            name="port"
            rules="port"
            placeholder="5000"
            :help="$t('Specifies UPnP port.')"
          />
        </template>
        <template #advanced>
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Report system instead of daemon uptime')"
            name="system_uptime"
            :help="$t('Choose if system or MINIUPNP service uptime is reported.')"
            initial="1"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Device UUID')"
            name="uuid"
            placeholder="2c1b66d8-a205-11e9-a2a3-2a2ae2dbcce4"
            rules="fieldvalidation('^[a-zA-Z0-9_-]+$')"
            :help="$t('Specify Universal unique ID of the device.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Announced serial number')"
            name="serial_number"
            placeholder="12345678"
            :help="$t('Specifies serial number for XML Root Desc.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Announced model number')"
            name="model_number"
            placeholder="12345"
            :help="$t('Specifies model number for XML Root Desc.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Notify interval')"
            name="notify_interval"
            rules="uinteger"
            placeholder="30"
            :help="$t('Interval in which UPnP capable devices send a message to announce their services.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Clean rules threshold')"
            name="clean_ruleset_threshold"
            rules="uinteger"
            placeholder="20"
            :help="$t('Minimum number of redirections before clearing rules table of old (active) redirections.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Clean rules interval')"
            rules="uinteger"
            name="clean_ruleset_interval"
            placeholder="600"
            :help="$t('Number of seconds before cleaning redirections.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Presentation URL')"
            name="presentation_url"
            placeholder="http://192.168.1.1/"
            rules="host"
            :help="$t('Presentation url used for the Root Desc.')"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('UPnP lease file')"
            name="upnp_lease_file"
            placeholder="/var/log/upnp.leases"
            rules="string"
            :help="$t('Stores active UPnP redirects in a lease file (specified), like DHCP leases.')"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
    <vuci-typed-section
      type="perm_rule"
      data-key="perm_rule"
      :title="$t('MiniUPnP ACLs')"
      :help="$t('ACLs specify which external ports may be redirected to which internal addresses and ports.')"
      :endpoints="[{ endpoint: 'upnp/acls/config' }]"
      :uci-data="uciData"
      :columns="aclColumns"
    >
      <template #comment="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="comment"
          rules="fieldvalidation('^[a-zA-Z0-9_ ]+$')"
          :placeholder="$t('Comment')"
        />
      </template>
      <template #ext_ports="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="ext_ports"
          rules="portrange"
          placeholder="1-65535"
        />
      </template>
      <template #int_addr="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="int_addr"
          rules="ipmask4"
          placeholder="0.0.0.0/0"
        />
      </template>
      <template #int_ports="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="int_ports"
          rules="portrange"
          placeholder="1-65535"
        />
      </template>
      <template #action="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="action"
          :options="actions"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      actions: [
        ['allow', this.$t('Allow')],
        ['deny', this.$t('Deny')]
      ],
      redirectColumns: [
        { dataIndex: 'proto', title: this.$t('Protocol') },
        { dataIndex: 'extport', title: this.$t('External port') },
        { dataIndex: 'intaddr', title: this.$t('Client address') },
        { dataIndex: 'intport', title: this.$t('Client port') },
        { dataIndex: 'remove', title: '' }
      ],
      aclColumns: [
        { name: 'comment', label: this.$t('Comment'), help: this.$t('Adds a comment to this rule.') },
        {
          name: 'ext_ports',
          label: this.$t('External ports'),
          help: this.$t('External port(s) which may be redirected. May be specified as a single port or a range of ports.')
        },
        { name: 'int_addr', label: this.$t('Internal addresses'), help: this.$t('Internal address to be redirect to.') },
        {
          name: 'int_ports',
          label: this.$t('Internal ports'),
          help: this.$t('Internal port(s) to be redirect to. May be specified as a single port or a range of ports.')
        },
        {
          name: 'action',
          label: this.$t('Action'),
          help: this.$t('Allows or forbids the UPnP service to open the specified port.')
        }
      ],
      tabs: [
        { name: 'general', title: this.$t('General settings') },
        { name: 'advanced', title: this.$t('Advanced settings') }
      ],
      redirectsData: []
    }
  },
  timers: {
    loadRedirectData: { time: 4000, autostart: true, repeat: true }
  },
  methods: {
    returnErrorMessage(errors) {
      const isADirectory = errors.data.errors.some(error => error.code === 1)
      const fileReadError = errors.data.errors.some(error => error.code === 2)
      const fileInUse = errors.data.errors.some(error => error.code === 3)
      const invalidPath = errors.data.errors.some(error => error.code === 4)
      const spaceInPath = errors.data.errors.some(error => error.code === 5)
      if (isADirectory) return this.$t('Provided UPNP lease file path is a directory.')
      if (fileReadError) return this.$t('Unable to read UPNP lease file.')
      if (fileInUse) return this.$t('File selected as UPNP lease file is already in use.')
      if (invalidPath) return this.$t('Provided UPNP lease file path is invalid, must start with "/" and must exist.')
      if (spaceInPath) return this.$t('UPNP lease file path must not contain a space.')
      else return this.$t('An unexpected error occurred')
    },
    loadRedirectData() {
      return this.$axios
        .get('/api/upnp/redirects/config')
        .then(({ data }) => {
          this.redirectsData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load UPnP redirects'))
        })
    },
    removeRedirect(num) {
      this.$spin()
      const requests = [
        { endpoint: `/api/upnp/redirects/config/${num}`, method: 'DELETE' },
        { endpoint: '/api/upnp/redirects/config', method: 'GET' }
      ]
      return this.$axios
        .bulk(requests)
        .then(([delRes, confRes]) => {
          if (delRes.success) this.$message.success('Upnp redirect removed successfully')
          else this.$message.error(this.$t('Failed to remove UPnP redirect'))
          if (confRes.success) this.redirectsData = confRes.data
          else this.$message.error(this.$t('Failed to load UPnP redirects'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$spin(false)
        })
    }
  }
}
</script>
