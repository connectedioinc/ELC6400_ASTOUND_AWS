<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="snmpd"
  >
    <vuci-typed-section
      :uci-data="uciData"
      :edit-form="editForm"
      :columns="userColumns"
      :endpoints="[{ endpoint: 'snmp/users/config' }]"
      :table-actions="['column-list', 'search']"
      :title="$t('SNMP V3 users')"
      :help="$t('This section displays SNMP user configurations currently existing on the device.')"
      type="user"
      data-key="users"
    >
      <template #username="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="username"
        />
      </template>
      <template #seclevel="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="v => securityLevels[v]"
          name="seclevel"
        />
      </template>
      <template #authtype="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="authtype"
        />
      </template>
      <template #privtype="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="privtype"
        />
      </template>
      <template #rights="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          :display-value="v => rights[v]"
          name="rights"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import editForm from './SnmpV3Edit'

export default {
  data() {
    return {
      editForm: markRaw(editForm),
      formData: {
        users: []
      },
      userColumns: [
        { name: 'username', label: this.$t('Username'), help: this.$t('Set username to access SNMP.') },
        {
          name: 'seclevel',
          label: this.$t('Security level'),
          help: this.$t('A security level is an authentication strategy that is set up for the user.')
        },
        {
          name: 'authtype',
          label: this.$t('Authentication type'),
          help: this.$t('Set authentication type to use with SNMPv3.')
        },
        {
          name: 'privtype',
          label: this.$t('Encryption type'),
          help: this.$t('Set encryption type to use with SNMPv3.')
        },
        {
          name: 'rights',
          label: this.$t('Access mode'),
          help: this.$t('Access mode specifies which access the host has in the community and if they are allowed to retrieve and modify MIB variables from a specific SNMP agent.')
        },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      securityLevels: {
        noauth: this.$t('No authentication, no privacy'),
        auth: this.$t('Authentication, no privacy'),
        priv: this.$t('Authentication and privacy')
      },
      rights: {
        ro: this.$t('Read-Only'),
        rw: this.$t('Read-Write')
      }
    }
  },
  methods: {
    validateEnable(self) {
      const section = self.uciSection
      if (self.model === '0' || section.enabled !== '1') return
      const requiredEnableOptions = []
      if (!section.rights) {
        requiredEnableOptions.push(this.$t('Access mode'))
      }
      if (!section.seclevel) {
        requiredEnableOptions.push(this.$t('Security level'))
      }
      if ((section.seclevel === 'auth' || section.seclevel === 'priv') && !section.authpass) {
        requiredEnableOptions.push(this.$t('Authentication passphrase'))
      }
      if (section.seclevel === 'priv' && !section.privpass) {
        requiredEnableOptions.push(this.$t('Privacy passphrase'))
      }
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        self.model = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
    }
  }
}
</script>
