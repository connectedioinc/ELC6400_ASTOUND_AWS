<template>
  <vuci-form
    v-model="formData"
    :config="section.type === 'service' ? 'pptpd' : 'network'"
    editing
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :name="section.id"
        :title="$utils.getModalTitle('PPTP %s'.format(section['.type'] === 'service' ? $t('server') : $t('client')), section.description)"
        :help="
          $t(`This section is used to configure the settings of the %s server instance.
                    A PPTP server is an entity that waits for incoming connections from PPTP clients.
                    Scroll your mouse pointer over field names in order to see helpful hints.`).format(section.id)
        "
        :endpoints="[{ endpoint: typeEndpoints[currentSection['.type']] }]"
        :uci-data="uciData"
        data-key="pptp"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Turns the PPTP instance on or off.')"
          name="enabled"
        />
        <tlt-inline-message
          v-if="limitReachedMessage"
          type="info"
          :message="limitReachedMessage"
        />
        <vuci-form-item-radio-group
          :uci-section="s"
          name=".type"
          :label="$t('Role')"
          :options="typeOptions"
          :help="$t('Choose a role for PPTP instance.')"
          @change="changeType"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Name')"
          name="description"
          :rules="['uciname', validateName]"
          :help="$t('Name of the PPTP instance.')"
          required
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Server')"
          :help="$t('PPTP server\'s IP address or hostname.')"
          name="server"
          rules="host"
          placeholder="8.8.8.8"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Username')"
          :help="$t('Username used for authentication to the PPTP server.')"
          name="username"
          :rules="v => [validateDuplicate]"
          maxlength="255"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Password')"
          :help="$t('Password used for authentication to the PPTP server.')"
          name="password"
          rules="credentials_validate"
          maxlength="255"
          password
          sensitive
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Local IP')"
          :help="$t('IP Address of this PPTP network interface.')"
          name="localip"
          rules="ip4addr"
          placeholder="0.0.0.0"
          initial="192.168.0.1"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Remote IP range begin')"
          :help="$t('PPTP IP address leases will begin from the address specified in this field.')"
          name="start"
          rules="ip4addr"
          placeholder="0.0.0.0"
          initial="192.168.0.20"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Remote IP range end')"
          :help="$t('PPTP IP address leases will end with the address specified in this field.')"
          name="limit"
          :rules="validateLimit"
          placeholder="0.0.0.0"
          initial="192.168.0.30"
        />
        <tlt-form-accordion :name="`${s.id}_configuration`">
          <vuci-form-item-switch
            :depend="s['.type'] === 'interface' && !defaultFlag"
            :uci-section="s"
            :label="$t('Default route')"
            :help="
              $t(
                'When selected, this connection will become the device\'s default route. \
                    This means that all traffic directed to the Internet will go through the PPTP \
                    server and the server\'s IP address will be seen as this device\'s source IP to other hosts on the Internet.'
              )
            "
            name="defaultroute"
            :rmempty="false"
          />
          <vuci-form-item-switch
            :depend="s['.type'] === 'service' || (s['.type'] == 'interface' && !clientFlag)"
            :uci-section="s"
            :label="$t('Client to client')"
            :help="$t('Add route to make other PPTP clients accessible.')"
            name="client_to_client"
            :rmempty="false"
          />
          <vuci-form-item-input
            :depend="s['.type'] === 'service'"
            :uci-section="s"
            :label="$t('Timeout')"
            :help="$t('Time in seconds. When no packets pass through the tunnel for the specified time, the server terminates the connection to client.')"
            name="idle"
            rules="range(0,65535)"
            placeholder="20"
          />
          <vuci-form-item-input
            :depend="s['.type'] === 'service'"
            :uci-section="s"
            :label="$t('Primary DNS')"
            :help="$t('The primary DNS server.')"
            name="dns1"
            rules="ip4addr"
            placeholder="8.8.8.8"
          />
          <vuci-form-item-input
            :depend="s['.type'] === 'service'"
            :uci-section="s"
            :label="$t('Secondary DNS')"
            :help="$t('The secondary DNS server.')"
            name="dns2"
            rules="ip4addr"
            placeholder="8.8.8.8"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('MPPE Encryption')"
            :help="$t('MPPE (Microsoft Point-to-Point Encryption) – a method of encrypting data transferred across connections.')"
            :options="mppeOptions"
            name="mppe"
            initial="stateless"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('MPPE Key length')"
            :help="$t('Encryption strength for MPPE.')"
            :options="keyOptions"
            name="mppe_encryption"
            initial="128"
            multiple
            :depend="s.mppe !== 'none'"
          />
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Custom options')"
            :help="$t('Custom PPPD (Point-to-Point Protocol Daemon) options are used to configure and manage PPP connections.')"
            :options="s['.type'] === 'service' ? customServerOptions : customClientOptions"
            name="pptp_options"
            multiple
            allow-create
            rules="fieldvalidation('^[a-zA-Z0-9-./\,_ ]+$')"
          />
        </tlt-form-accordion>
      </vuci-named-section>
      <vuci-typed-section
        v-if="currentSection['.type'] === 'service'"
        :title="$t('User list')"
        type="login"
        :columns="userColumns"
        :table-actions="['column-list', 'search']"
        :endpoints="[{ endpoint: `pptp/server/${section.id}/users/config` }]"
        :uci-data="uciData"
        data-key="pptp_server_users"
        :add="beforeAdd"
      >
        <template #username="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="username"
            :rules="v => [validateDuplicate, credentials_validate_no_diacritics]"
            maxlength="255"
            required
          />
        </template>
        <template #password="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            rules="credentials_validate"
            name="password"
            maxlength="255"
            password
            sensitive
            can-randomize
          />
        </template>
        <template #remoteip="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            rules="ip4addr"
            placeholder="0.0.0.0"
            name="remoteip"
          />
        </template>
      </vuci-typed-section>
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          @click="customSave(save)"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script>
export default {
  inject: ['closeEdit', 'overviewUpdateUciData'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      postServerFields: ['id', '.type', 'enabled', 'description', 'localip', 'start', 'limit', 'dns1', 'dns2', 'idle', 'mppe', 'mppe_encryption', 'pptp_options', 'client_to_client'],
      postClientFields: ['id', '.type', 'enabled', 'description', 'server', 'username', 'password', 'defaultroute', 'mppe', 'mppe_encryption', 'pptp_options', 'client_to_client'],
      originalInstanceType: undefined,
      typeChanged: false,
      typeEndpoints: {
        interface: 'pptp/client/config',
        service: 'pptp/server/config'
      },
      formData: {},
      userColumns: [
        {
          name: 'username',
          label: this.$t('Username'),
          help: this.$t('Username used for authentication to this PPTP server.')
        },
        {
          name: 'password',
          label: this.$t('Password'),
          help: this.$t('Password used for authentication to this PPTP server. All characters are allowed except ` and space.')
        },
        {
          name: 'remoteip',
          label: this.$t("PPTP client's IP"),
          help: this.$t(
            'Assigns an IP address to the client that uses the adjacent authentication info. This field is optional and if left the client will simply receive an IP address from the IP pool defined above.'
          )
        }
      ],
      mppeOptions: [
        ['none', this.$t('None')],
        ['stateful', this.$t('Stateful')],
        ['stateless', this.$t('Stateless')]
      ],
      keyOptions: [
        { key: '40', value: '40' },
        { key: '56', value: '56' },
        { key: '128', value: '128' }
      ],
      customServerOptions: [
        'proxyarp',
        'encounter',
        'auth',
        'lcp-echo-failure 3',
        'lcp-echo-interval 60',
        'default-asyncmap',
        'mtu 1482',
        'mru 1482',
        'nobsdcomp',
        'nodeflate',
        'require-mschap-v2',
        'refuse-chap',
        'refuse-mschap',
        'refuse-eap',
        'refuse-pap',
        'logfd 2'
      ],
      customClientOptions: ['refuse-pap', 'refuse-eap', 'refuse-chap', 'refuse-mschap', 'noipdefault', 'noauth', 'nobsdcomp', 'nodeflate', 'idle 0', 'maxfail 0']
    }
  },
  computed: {
    currentSection() {
      return this.formData.pptp?.find(s => s.id === this.section.id) || {}
    },
    dataToSend() {
      return this.currentSection['.type'] === 'service' ? this.postServerFields : this.postClientFields
    },
    typeOptions() {
      return [
        { value: 'interface', name: this.$t('Client'), disabled: this.clientLimitReached },
        { value: 'service', name: this.$t('Server'), disabled: this.serverLimitReached }
      ]
    },
    deleteEndpoint() {
      return this.section['.type'] === this.originalInstanceType && !this.typeChanged
        ? this.typeEndpoints[this.currentSection['.type']]
        : this.currentSection['.type'] === 'interface'
          ? 'pptp/server/config'
          : 'pptp/client/config'
    },
    serverLimitReached() {
      return this.formData.pptp?.filter(instance => instance['.type'] === 'service').length >= 1 && this.section['.type'] !== 'service'
    },
    clientLimitReached() {
      return this.formData.pptp?.filter(instance => instance['.type'] === 'interface').length >= 5 && this.section['.type'] !== 'interface'
    },
    limitReachedMessage() {
      if (this.section['.type'] !== 'service' && this.serverLimitReached) return this.$t('Maximum number of PPTP server instances has been reached.')
      if (this.section['.type'] !== 'interface' && this.clientLimitReached) return this.$t('Maximum number of PPTP client instances has been reached.')
      return false
    },
    defaultFlag() {
      return this.section.client_to_client === '1'
    },
    clientFlag() {
      return this.section.defaultroute === '1'
    }
  },

  created() {
    this.originalInstanceType = this.section['.type']
  },
  methods: {
    async beforeAdd() {
      if (this.typeChanged && this.originalInstanceType !== 'service') {
        try {
          await this.$axios.delete(`/api/pptp/client/config`, { data: { data: [this.section.id] } })
          await this.$axios.post('/api/pptp/server/config', { data: { id: this.section.id } })
          // updates overview data in case user closes modal without saving
          // (server instance gets created and client deleted after adding user)
          this.overviewUpdateUciData(this.formData.pptp, 'pptp')
        } catch {
          this.$message.error(this.$t('An unexpected error occurred'))
        } finally {
          this.typeChanged = false
          this.originalInstanceType = 'service'
        }
      }
    },
    async customSave(save) {
      this.removeFields()
      if (this.originalInstanceType === this.currentSection['.type']) {
        return save()
      }
      // validation for changing role + name
      const nameValidation = this.validateName(this.currentSection.description)
      if (!nameValidation.isValid) return this.$message.error(nameValidation.message)
      try {
        this.$spin()
        await this.$axios.delete(`/api/${this.deleteEndpoint}`, { data: { data: [this.section.id] } })
        const newInstance = await this.$axios.post(`/api/${this.typeEndpoints[this.currentSection['.type']]}`, { data: { ...this.currentSection } })
        if (this.section.type === 'service') delete this.formData.pptp_server_users
        const newPptp = this.formData.pptp.map(x => (x.description === this.section.description ? newInstance.data : x))
        const newUsers = this.originalInstanceType === 'service' && this.typeChanged && this.formData.pptp_server_users?.length ? [] : this.formData.pptp_server_users
        const updatedData = { pptp_server_users: newUsers, pptp: newPptp }
        this.closeEdit(updatedData)
        this.$message.success(this.$t('Configuration has been applied'))
      } catch {
        this.$message.error(this.$t('An unexpected error occurred'))
      } finally {
        this.$spin(false)
      }
    },
    // removes fields that are not needed for the current instance type
    removeFields() {
      const index = this.formData.pptp.findIndex(s => s.id === this.currentSection.id)
      Object.keys(this.formData.pptp[index]).forEach(key => {
        if (!this.dataToSend.includes(key)) delete this.formData.pptp[index][key]
      })
    },
    validateName(val) {
      return { isValid: !this.formData?.pptp.find(x => x.description === val && x.id !== this.currentSection.id), message: this.$t('Name %s is already in use'.format(this.section.description)) }
    },
    changeType(self) {
      const index = this.formData.pptp.findIndex(s => s.id === this.currentSection.id)
      this.formData.pptp[index].pptp_options = self.model === 'service' ? this.customServerOptions : this.customClientOptions
      this.typeChanged = true
    },
    credentials_validate_no_diacritics(val) {
      const regex = /^[0-9a-zA-Z@._-]*$/
      if (!regex.test(val)) {
        return { isValid: false, message: 'Alphanumeric and @, ., _, - characters are allowed.' }
      }
      return { isValid: true }
    },
    validateDuplicate(val) {
      const users = this.formData.pptp_server_users.map(user => user.username)
      const duplicateUsername = users.find((item, index) => users.indexOf(item) !== index && item === val)
      if (!duplicateUsername) return { isValid: true }
      return { isValid: false, message: this.$t("Username '%s' already exists").format(duplicateUsername) }
    },
    validateLimit(value) {
      const startValue = this.section.start
      const startArray = startValue.split('.')
      const endArray = value.split('.')
      if (
        startArray.length < 4 ||
        endArray.length < 4 ||
        !(startArray[0] === endArray[0] && startArray[1] === endArray[1] && startArray[2] === endArray[2] && parseInt(endArray[3]) - parseInt(startArray[3]) < 100)
      ) {
        return {
          isValid: false,
          message: this.$t('The value of remote IP range begin or end is invalid: IP adresses must be in the same /24 subnet and the range cannot exceed 100 adresses.')
        }
      } else {
        return { isValid: true }
      }
    }
  }
}
</script>
