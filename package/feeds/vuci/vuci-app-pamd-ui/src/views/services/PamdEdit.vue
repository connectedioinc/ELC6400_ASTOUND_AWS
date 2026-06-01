<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="pam;rpcd;dropbear"
    editing
    :after-load="loadUsers"
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'access_control/pam/config' }]"
      :name="section.id"
      :title="$utils.getModalTitle($t('PAM auth'))"
      :uci-data="uciData"
      data-key="pamd"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Turns the PAM authentication on or off.')"
        name="enabled"
        initial="0"
      />
      <tlt-inline-message
        v-if="displayRadiusMessage"
        type="info"
        :message="$t('Enabling Require-Message-Authenticator helps avoid forgery attacks in RFC 2865 RADIUS protocol.')"
      />
      <vuci-form-item-radio-group
        :uci-section="s"
        :label="$t('Module')"
        :help="$t('Specifies the PAM module that implements the service.')"
        name="module"
        :initial="filterModules[0]?.value"
        :options="filterModules"
      />
      <vuci-form-item-radio-group
        :uci-section="s"
        :label="$t('Type')"
        :help="$t('Determines the continuation or failure behavior for the module.')"
        name="type"
        initial="required"
        :options="typeOptions"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable for all users')"
        :help="allUsersHint"
        name="all_users"
        initial="0"
        :depend="s.service === 'rpcd' || (s.service === 'sshd' && (s.module === 'radius_auth' || s.module === 'tacplus'))"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Require Message-Authenticator')"
        :help="$t('Require and validate Message-Authenticator RADIUS attribute on Access-Request replies.')"
        name="require_message_auth"
        :initial="s.enabled === '1' ? '0' : '1'"
        :depend="s.module === 'radius_auth'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Default user group')"
        :help="groupHint"
        name="default_group"
        :options="groupOptions"
        :depend="s.service === 'rpcd' && s.all_users === '1' && (s.module === 'radius_auth' || s.module === 'tacplus')"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Select users')"
        :help="$t('Select users for PAM authentication.')"
        name="users"
        :options="userOptions"
        multiple
        :depend="s.service === 'rpcd' && s.all_users === '0'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Server')"
        :help="serverHint"
        name="server"
        rules="ipaddr"
        required
        placeholder="192.168.1.1"
        :depend="s.module === 'radius_auth' || s.module === 'tacplus'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="secretName"
        :help="secretHint"
        name="secret"
        required
        password
        sensitive
        :depend="s.module === 'radius_auth' || s.module === 'tacplus'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Port')"
        :help="portHint"
        name="port"
        rules="port"
        initial="1812"
        :depend="s.module === 'radius_auth'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Port')"
        :help="portHint"
        name="port"
        rules="port"
        initial="49"
        :depend="s.module === 'tacplus'"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Timeout')"
        :help="$t('Timeout in seconds waiting for RADIUS server reply.')"
        name="timeout"
        required
        rules="range(3,10)"
        :depend="s.module === 'radius_auth'"
        initial="3"
      />
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
      formData: {},
      userList: [],
      groupList: [],
      typeOptions: [
        {
          name: this.$t('Required'),
          value: 'required'
        },
        {
          name: this.$t('Requisite'),
          value: 'requisite'
        },
        {
          name: this.$t('Sufficient'),
          value: 'sufficient'
        },
        {
          name: this.$t('Optional'),
          value: 'optional'
        }
      ],
      modules: [
        {
          name: this.$t('TACACS+'),
          value: 'tacplus'
        },
        {
          name: this.$t('RADIUS'),
          value: 'radius_auth'
        },
        {
          name: this.$t('Local'),
          value: 'unix'
        }
      ],
      warningMsg: this.$t('RADIUS Protocol under RFC 2865 is susceptible to forgery attacks. We recommend enabling Require Message-Authenticator option.')
    }
  },
  computed: {
    displayRadiusMessage() {
      const enabled = this.section.enabled === '1'
      const reqMessageAuth = this.section.require_message_auth === '0'
      const radiusModule = this.section.module === 'radius_auth'
      return enabled && reqMessageAuth && radiusModule
    },
    filterModules() {
      return this.modules.filter(module => this.formOptions().modules.includes(module.value))
    },
    userOptions() {
      return this.userList.map(i => [i.id, i.username])
    },
    groupOptions() {
      return [['none', this.$t('None')]].concat(this.groupList.map(i => [i.id, i.id]))
    },
    selectedModuleName() {
      return this.modules.find(m => m[0] === this.section.module)?.[1]
    },
    serverHint() {
      return this.$t('The IP address of the %s server.').format(this.selectedModuleName)
    },
    portHint() {
      return this.$t('%s server authentication port.').format(this.selectedModuleName)
    },
    allUsersHint() {
      if (this.section.module !== 'radius_auth' && this.section.module !== 'tacplus') return this.$t('Turn on PAM authentication for all users.')
      return this.$t('Turn on PAM authentication for all users. It will allow login with users that are not created on the device.')
    },
    groupHint() {
      const hint = this.$t("Specifies the default user group if parameter %s is not sent. Selecting 'None' will deny users without this parameter.")
      return hint.format(this.section.module === 'radius_auth' ? 'Management-Privilege-Level' : 'priv-lvl')
    },
    secretHint() {
      let hint = this.$t('%s server key.')
      if (this.section.module === 'radius_auth') hint = this.$t('%s shared secret.')
      return hint.format(this.selectedModuleName)
    },
    secretName() {
      if (this.section.module === 'radius_auth') return this.$t('Secret')
      return this.$t('Key')
    }
  },
  methods: {
    loadUsers() {
      return this.$axios
        .bulkGet(['/api/users/config', '/api/users/groups/config'])
        .then(([userData, groupData]) => {
          if (userData.success) this.userList = userData.data
          else this.$message.error(this.$t('Failed to load user list'))
          if (groupData.success) this.groupList = groupData.data
          else this.$message.error(this.$t('Failed to load group list'))
        })
        .catch(() => {
          return this.$message.error(this.$t('An unexpected error occurred'))
        })
    }
  }
}
</script>
