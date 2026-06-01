<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="snmpd"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :title="$utils.getModalTitle($t('SNMP V3 user'), section.username)"
      :help="$t('This section is used to configure the settings of a SNMP user. Scroll your mouse pointer over field names in order to see helpful hints.')"
      data-key="users"
      :endpoints="[{ endpoint: 'snmp/users/config' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Enable SNMP user configuration.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Username')"
        :help="$t('Name of the SNMP user configuration.')"
        name="username"
        required
        :rules="['uciname', validateUsername]"
        maxlength="32"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Access mode')"
        :help="$t('Access mode specifies which access the host has in the community and if they are allowed to retrieve and modify MIB variables from a specific SNMP agent.')"
        name="rights"
        :options="rights"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('MIB subtree')"
        :help="$t('Leave empty to access full MIB tree.')"
        name="mibaccess"
        rules="string"
        maxlength="16"
        placeholder=".1"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Security level')"
        :help="`${$t('A security level is an authentication strategy that is set up for the user. No authentication, no privacy - authenticates with a username.')} \
          </br> ${$t('Authentication - provides MD5 or SHA algorithms for authentication.')} \
          </br> ${$t('Privacy - Provides DES or AES encryption.')}`"
        name="seclevel"
        :options="seclevels"
        rawhtml
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Authentication type')"
        :help="$t('Set authentication type to use with SNMPv3.')"
        name="authtype"
        :options="authenticationTypes"
        :warnings="getAuthWarning"
        :depend="s.seclevel !== 'noauth'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Authentication passphrase')"
        :help="$t('Set authentication passphrase to generate key for SNMPv3.')"
        name="authpass"
        password
        placeholder="Passphrase"
        :depend="s.seclevel !== 'noauth'"
        rules="uciname"
        minlength="8"
        maxlength="64"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Privacy type')"
        :help="$t('Set privacy type to use with SNMPv3.')"
        name="privtype"
        :options="privacyTypes"
        :warnings="getCipherWarning"
        :depend="s.seclevel === 'priv'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Privacy passphrase')"
        :help="$t('Set privacy passpharse to generate key for SNMPv3.')"
        name="privpass"
        password
        placeholder="Passphrase"
        :depend="s.seclevel === 'priv'"
        rules="uciname"
        minlength="8"
        maxlength="64"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {
        users: []
      },
      seclevels: [
        ['noauth', this.$t('No authentication, no privacy')],
        ['auth', this.$t('Authentication, no privacy')],
        ['priv', this.$t('Authentication and privacy')]
      ],
      rights: [
        ['ro', this.$t('Read-Only')],
        ['rw', this.$t('Read-Write')]
      ],
      authenticationTypes: [
        ['SHA', this.$t('SHA')],
        ['MD5', this.$t('MD5')]
      ],
      privacyTypes: [
        ['DES', this.$t('DES')],
        ['AES', this.$t('AES128')]
      ]
    }
  },
  methods: {
    getCipherWarning(value) {
      if (value === 'DES') return this.$t('This privacy type is not considered secure. Consider using a more secure privacy type, such as AES.')
    },
    getAuthWarning(value) {
      if (value === 'MD5') return this.$t('This authentication type is not considered secure. Consider using a more secure authentication type, such as SHA.')
    },
    validateUsername(val) {
      const users = this.formData.users.filter(u => u.username === val)
      if (users.length < 2) return { isValid: true }
      return {
        isValid: false,
        message: this.$t("Username '%s' already exists.").format(val)
      }
    }
  }
}
</script>
