<template>
  <vuci-form
    v-model="formData"
    :config="section['.type'] === 'service' ? 'xl2tpd' : 'network'"
    editing
    :before-save="onBeforeSave"
  >
    <template #default="{ uciData }">
      <vuci-named-section
        v-slot="{ s }"
        :endpoints="[{ endpoint: typeEndpoints[currentSection['.type']] }]"
        :name="section.id"
        :title="$utils.getModalTitle('L2TP %s'.format(section['.type'] === 'service' ? $t('server') : $t('client')), section.description)"
        :help="
          $t(`This section is used to configure the settings of the %s client instance.
        An L2TP client is an entity that initiates a connection to an L2TP server.
          Scroll your mouse pointer over field names in order to see helpful hints.`).format(section.id)
        "
        :uci-data="uciData"
        data-key="l2tp"
      >
        <vuci-form-item-switch
          :uci-section="s"
          :label="$t('Enable')"
          :help="$t('Turns the L2TP instance on or off.')"
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
          :help="$t('Choose a role for L2TP instance.')"
          @change="changeType"
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Name')"
          name="description"
          :rules="['uciname', validateName]"
          :help="$t('Name of the L2TP instance.')"
          required
        />
        <tlt-inline-message
          v-if="!xl2tpd6 && s['.type'] === 'service'"
          id="l2tpv6_support_message"
          type="warning"
        >
          {{ $t('L2TPv6 support package is required to use IPv6 addresses. The package can be installed using the') }}
          <router-link to="/system/package_manager"> {{ $t('Package Manager') }} </router-link>.
        </tlt-inline-message>
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Server')"
          :help="$t('L2TP server\'s IP address or hostname.')"
          name="server"
          placeholder="0.0.0.0"
          :rules="validateServer"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Username')"
          :help="$t('Username used for authentication to the L2TP server.')"
          name="username"
          rules="credentials_validate"
          maxlength="512"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Password')"
          :help="$t('Password used for authentication to the L2TP server. All characters are allowed except ` and space.')"
          name="password"
          rules="credentials_validate"
          maxlength="512"
          password
          sensitive
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          name="auth"
          :label="$t('CHAP secret')"
          :help="$t('A secret used for L2TP Tunnel Authentication.')"
          :rules="['fieldvalidation(\'^[a-zA-Z0-9!@$%&*+/=?^_`{|}~.-]+$\')']"
          password
          sensitive
          minlength="5"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('MTU')"
          :help="$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')"
          name="mtu"
          placeholder="1400"
          rules="irange(68,9200)"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Default route')"
          :help="
            $t(
              'When selected, this connection will become the device\'s default route. This means that all traffic directed to the Internet will go through the L2TP server and the server\'s IP address will be seen as this device\'s source IP to other hosts on the Internet.'
            )
          "
          name="defaultroute"
          :rmempty="false"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Allow CHAP')"
          :help="$t('Allows CHAP authentication method to be used.')"
          name="auth_chap"
          initial="1"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Allow PAP')"
          :help="$t('Allow PAP authentication method to be used.')"
          name="auth_pap"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Allow MSCHAP-v2')"
          :help="$t('Allow MSCHAP-v2 authentication method to be used.')"
          name="auth_mschap2"
          initial="1"
        />
        <vuci-form-item-select
          :depend="s['.type'] === 'interface'"
          :uci-section="s"
          :label="$t('Custom options')"
          :help="$t('Custom pppd (Point-to-Point Protocol Daemon) options are used to configure and manage PPP connections.')"
          name="pppd_options"
          multiple
          allow-create
          rules="fieldvalidation('^[a-zA-Z0-9-./\,_ ]+$')"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Use IPv6')"
          :help="$t('L2TPv6 support package is required to enable this option. Enables an IPv6 socket to accept L2TP connections over IPv6.')"
          name="use_ipv6"
          :readonly="!xl2tpd6"
          :save="saveData"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Local IP')"
          :help="$t('IP Address of this L2TP network interface.')"
          name="localip"
          placeholder="0.0.0.0"
          rules="ip4addr"
          initial="192.168.0.1"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Remote IP range begin')"
          :help="$t('L2TP IP address leases will begin from the address specified in this field.')"
          name="start"
          placeholder="192.168.0.20"
          rules="ip4addr"
          initial="192.168.0.20"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Remote IP range end')"
          :help="$t('L2TP IP address leases will end with the address specified in this field.')"
          name="limit"
          placeholder="192.168.0.30"
          rules="ip4addr"
          initial="192.168.0.30"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Port')"
          :help="$t('Port for binding.')"
          name="port"
          placeholder="1701"
          rules="port"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Enable CHAP')"
          :help="$t('Challenge-Handshake Authentication Protocol for L2TP.')"
          name="chap"
        />
        <vuci-form-item-input
          :depend="s['.type'] === 'service' && s.chap === '1'"
          :uci-section="s"
          name="auth"
          :label="$t('CHAP Secret')"
          :help="$t('A secret used for L2TP Tunnel Authentication.')"
          :rules="['fieldvalidation(\'^[a-zA-Z0-9!@$%&*+/=?^_`{|}~.-]+$\')']"
          minlength="5"
          password
          sensitive
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('CHAP authentication')"
          :help="$t('When turned on it requires CHAP authentication method to be used, when turned off it refuses CHAP authentication method.')"
          name="auth_chap"
          initial="1"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('PAP authentication')"
          :help="$t('When turned on it requires PAP authentication method to be used, when turned off it refuses PAP authentication method.')"
          name="auth_pap"
        />
        <vuci-form-item-switch
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('MSCHAP-v2 authentication')"
          :help="$t('When turned on it requires MSCHAP-v2 authentication method to be used, when turned off it refuses MSCHAP-v2 authentication method.')"
          name="auth_mschap2"
          initial="1"
        />
        <vuci-form-item-select
          :depend="s['.type'] === 'service'"
          :uci-section="s"
          :label="$t('Custom options')"
          :help="$t('Custom pppd (Point-to-Point Protocol Daemon) options are used to configure and manage PPP connections.')"
          name="pppd_options"
          multiple
          allow-create
          rules="fieldvalidation('^[a-zA-Z0-9-./\,_ ]+$')"
        />
      </vuci-named-section>
      <vuci-typed-section
        v-if="currentSection['.type'] === 'service'"
        type="login"
        :endpoints="[{ endpoint: `l2tp/users/config` }]"
        :uci-data="uciData"
        :title="$t('User list')"
        :table-actions="['search', 'column-list']"
        :columns="userColumns"
        data-key="users"
        :add="beforeAdd"
      >
        <template #username="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="username"
            :rules="v => [validateDuplicate, v.credentials_validate]"
            maxlength="512"
            required
          />
        </template>
        <template #password="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="password"
            rules="credentials_validate"
            maxlength="512"
            password
            sensitive
            can-randomize
          />
        </template>
        <template #remoteip="{ s }">
          <vuci-form-item-input
            :uci-section="s"
            name="remoteip"
            rules="ip4addr"
            placeholder="0.0.0.0"
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
  inject: ['closeClientEdit', 'closeServerEdit', 'overviewUpdateUciData'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      postServerFields: ['id', '.type', 'enabled', 'description', 'use_ipv6', 'localip', 'start', 'limit', 'port', 'chap', 'auth', 'auth_chap', 'auth_pap', 'auth_mschap2', 'pppd_options'],
      postClientFields: ['id', '.type', 'enabled', 'description', 'auth', 'auth_chap', 'auth_mschap2', 'auth_pap', 'defaultroute', 'enabled', 'mtu', 'password', 'pppd_options', 'server', 'username'],
      originalInstanceType: undefined,
      typeChanged: false,
      typeEndpoints: {
        interface: 'l2tp/client/config',
        service: 'l2tp/server/config'
      },

      xl2tpd6: this.$store.hasPackages('xl2tpd6.control'),
      formData: {},
      userColumns: [
        { name: 'username', label: this.$t('Username') },
        { name: 'password', label: this.$t('Password') },
        { name: 'remoteip', label: this.$t("L2TP Client's IP") }
      ],
      customServerOptions: [
        'noauth',
        'logfd 2',
        'noccp',
        'novj',
        'novjccomp',
        'nopcomp',
        'noaccomp',
        'mtu 1400',
        'mru 1400',
        'lcp-echo-interval 20',
        'lcp-echo-failure 5',
        'connect-delay 5000',
        'nodefaultroute',
        'noipdefault',
        'proxyarp'
      ],
      customClientOptions: ['usepeerdns', 'nodefaultroute', 'lcp-max-terminate 0']
    }
  },
  computed: {
    currentSection() {
      return this.formData.l2tp?.find(s => s.id === this.section.id) || {}
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
          ? 'l2tp/server/config'
          : 'l2tp/client/config'
    },
    serverLimitReached() {
      return this.formData.l2tp?.filter(instance => instance['.type'] === 'service').length >= 1 && this.section['.type'] !== 'service'
    },
    clientLimitReached() {
      return this.formData.l2tp?.filter(instance => instance['.type'] === 'interface').length >= 5 && this.section['.type'] !== 'interface'
    },
    limitReachedMessage() {
      if (this.section['.type'] !== 'service' && this.serverLimitReached) return this.$t('Maximum number of L2TP server instances has been reached.')
      if (this.section['.type'] !== 'interface' && this.clientLimitReached) return this.$t('Maximum number of L2TP client instances has been reached.')
      return false
    }
  },
  created() {
    this.originalInstanceType = this.section['.type']
    this.originalCustomOptions = this.section.pppd_options || []
  },
  methods: {
    async beforeAdd() {
      if (this.typeChanged && this.originalInstanceType !== 'service') {
        try {
          await this.$axios.delete(`/api/l2tp/client/config`, { data: { data: [this.section.id] } })
          await this.$axios.post('/api/l2tp/server/config', { data: { id: this.section.id } })
          // updates overview data in case user closes modal without saving
          // (server instance gets created and client deleted after adding user)
          this.overviewUpdateUciData(this.formData.l2tp, 'l2tp')
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
        if (this.section.type === 'service') delete this.formData.users
        const newL2tp = this.formData.l2tp.map(x => (x.description === this.section.description ? newInstance.data : x))
        const newUsers = this.originalInstanceType === 'service' && this.typeChanged && this.formData.users?.length ? [] : this.formData.users
        const updatedData = { users: newUsers, l2tp: newL2tp }
        this.currentSection['.type'] !== 'interface' ? this.closeClientEdit(updatedData) : this.closeServerEdit(updatedData)
        this.$message.success(this.$t('Configuration has been applied'))
      } catch {
        this.$message.error(this.$t('An unexpected error occurred'))
      } finally {
        this.$spin(false)
      }
    },
    // removes fields that are not needed for the current instance type
    removeFields() {
      const index = this.formData.l2tp.findIndex(s => s.id === this.currentSection.id)
      Object.keys(this.formData.l2tp[index]).forEach(key => {
        if (!this.dataToSend.includes(key)) delete this.formData.l2tp[index][key]
      })
    },
    validateName(val) {
      return { isValid: !this.formData?.l2tp.find(x => x.description === val && x.id !== this.currentSection.id), message: this.$t('Name %s is already in use'.format(this.section.description)) }
    },
    changeType(self) {
      const index = this.formData.l2tp.findIndex(s => s.id === this.currentSection.id)
      this.formData.l2tp[index].pppd_options = self.model === 'service' ? this.customServerOptions : this.customClientOptions
      this.typeChanged = true
    },
    validateServer(val) {
      this.$VuciValidator.value = val
      const resHost = this.$VuciValidator.host()
      const resHostIpPort = this.$VuciValidator.hostipport()
      if (resHost.isValid || resHostIpPort.isValid) return { isValid: true }
      else
        return {
          isValid: false,
          message: this.$t(
            'A domain name or IP address (IPv4 or IPv6) with an optional port (values from 1 to 65535) is required (e.g., 192.168.1.1, ::0000:8a2e:0370:7334, example.com, or 192.168.1.1:80).'
          )
        }
    },
    validateCustom(s) {
      const regx = /^[^'`]+$/
      if (!regx.test(s)) {
        return { isValid: false, message: this.$t("Character ' and ` are not allowed.") }
      }
      return { isValid: true }
    },
    validateDuplicate(val) {
      const users = this.formData.users.map(user => user.username)
      const duplicateUsername = users.find((item, index) => users.indexOf(item) !== index && item === val)
      if (!duplicateUsername) return { isValid: true }
      return { isValid: false, message: this.$t("Username '%s' already exists").format(duplicateUsername) }
    },
    onBeforeSave() {
      const enabledInstances = this.formData.l2tp.filter(instance => instance['.type'] === 'interface' && instance.defaultroute === '1' && instance.enabled === '1')
      if (enabledInstances.length > 1) {
        return Promise.reject(this.$t('Only one "Client" instance with enabled "Default route" can be enabled at a time.'))
      }
      return Promise.resolve()
    },
    saveData(_, data) {
      return this.xl2tpd6 ? data.use_ipv6 : '0'
    }
  }
}
</script>
