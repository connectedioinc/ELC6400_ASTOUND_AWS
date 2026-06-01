<template>
  <vuci-form
    v-slot="{ uciData }"
    config="ulogd"
    :after-load="loadNetworks"
    :extra-load="extraLoad"
    bulk-request
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      name="global"
      :title="$t('Traffic logging settings')"
      data-key="ulogd"
      :endpoints="[{ endpoint: 'ulog/config' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Enable traffic logging.')"
        @change="updateRequire"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="network"
        :label="$t('Networks')"
        :options="networkOptions"
        multiple
        required
      />
    </vuci-named-section>
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      name="ftp"
      :title="$t('FTP settings')"
      data-key="ulog"
      :endpoints="[{ endpoint: 'ulog/ftp/config' }]"
      :after-save="onAfterSave"
    >
      <tlt-tabs :tabs="tabs">
        <template #server>
          <vuci-form-item-input
            :uci-section="s"
            name="host"
            :label="$t('Server address')"
            :help="$t('The domain name or IP address of the server.')"
            rules="host"
            placeholder="your.ftp.server"
            :required="isRequired"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="username"
            :label="$t('Username')"
            :help="$t('The username of the FTP server that will be used for logs uploading.')"
            rules="credentials_validate"
            maxlength="512"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="password"
            :label="$t('Password')"
            :help="$t('The password of the FTP server that will be used for logs uploading.')"
            rules="credentials_validate"
            maxlength="512"
            password
            sensitive
          />
          <vuci-form-item-input
            :uci-section="s"
            name="port"
            :label="$t('Port')"
            :help="$t('The TCP/IP port of the server.')"
            rules="port"
            initial="21"
            placeholder="21"
            :required="isRequired"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="remote_file_path"
            :label="$t('Subfolder')"
            :help="$t('FTP server\'s subfolder in which received file will be stored. Entry should end with a slash (either &quot;/&quot; or &quot;\\&quot;).')"
            :rules="validatePath"
          />
        </template>
        <template #upload>
          <vuci-form-item-select
            :uci-section="s"
            name="extra_name_info"
            :label="$t('File name extras')"
            :help="$t('Extra information to be added to file name.')"
            :options="extras"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="custom_string"
            :label="$t('Custom string')"
            :help="$t('Custom string to be added to ftp file name.')"
            rules="fieldvalidation('^[a-zA-Z0-9_+.\-]+$',0)"
            :depend="s.extra_name_info === 'custom'"
            :required="isRequired"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="fixed"
            :label="$t('Mode')"
            :help="$t('The schedule mode to be used for uploading to FTP server.')"
            :options="modes"
            initial="0"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="hours"
            :label="$t('Hours')"
            :help="$t('Uploading will be performed on this specific time of the day. Range [0 - 23].')"
            rules="irange(0,23)"
            :depend="s.fixed === '1'"
            :required="isRequired"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="minutes"
            :label="$t('Minutes')"
            :help="$t('Uploading will be performed on this specific time of the day. Range [0 - 59].')"
            rules="irange(0,59)"
            :depend="s.fixed === '1'"
            :required="isRequired"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="interval"
            :label="$t('Upload interval')"
            :help="$t('Upload logs to server every x hours.')"
            :options="uploadIntervals"
            initial="1"
            :depend="s.fixed === '0'"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="weekdays"
            :label="$t('Days')"
            :help="$t('Uploading will be performed on these days only.')"
            :options="weekdays"
            multiple
            :required="isRequired"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      extras: [
        ['none', this.$t('No extra information')],
        ['mac', this.$t('MAC address')],
        ['serial', this.$t('Serial number')],
        ['custom', this.$t('Custom string')]
      ],
      uploadIntervals: [
        ['1', this.$t('1 hour')],
        ['2', this.$t('2 hours')],
        ['4', this.$t('4 hours')],
        ['8', this.$t('8 hours')],
        ['12', this.$t('12 hours')],
        ['24', this.$t('24 hours')]
      ],
      weekdays: [
        ['mon', this.$t('Monday')],
        ['tue', this.$t('Tuesday')],
        ['wed', this.$t('Wednesday')],
        ['thu', this.$t('Thursday')],
        ['fri', this.$t('Friday')],
        ['sat', this.$t('Saturday')],
        ['sun', this.$t('Sunday')]
      ],
      tabs: [
        { name: 'server', title: this.$t('FTP Server') },
        { name: 'upload', title: this.$t('Upload Settings') }
      ],
      modes: [
        ['0', this.$t('Interval')],
        ['1', this.$t('Fixed')]
      ],
      networkOptions: [],
      isRequired: false
    }
  },
  methods: {
    extraLoad(form) {
      this.isRequired = form.ulog[0].enabled === '1'
    },
    loadNetworks(form) {
      return this.$axios
        .get('/api/ulog/available_interfaces/options')
        .then(({ data }) => {
          this.networkOptions = data.network
          return form
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load network options'))
        })
    },
    updateRequire(self) {
      this.isRequired = self.uciSection.enabled === '1'
    },
    validatePath(value) {
      if (!(/(\/)$/.test(value) || /(\\)$/.test(value))) {
        return { isValid: false, message: this.$t('Value should end with a slash ("/" or "\\").') }
      }
      if (/\/(?=\/)/.test(value) || /\\(?=\\)/.test(value)) {
        return { isValid: false, message: this.$t('Value can not contain more than one consecutive slash.') }
      }
      if (!(/^[^\\]+(\/)$/.test(value) || /^[^/]+(\\)$/.test(value)) && value.length > 1) {
        return { isValid: false, message: this.$t('Only one type of slash ("/" or "\\") can be used in a value.') }
      }
      return { isValid: true }
    }
  }
}
</script>
