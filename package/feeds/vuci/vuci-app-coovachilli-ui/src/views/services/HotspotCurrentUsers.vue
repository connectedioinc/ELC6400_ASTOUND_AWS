<template>
  <tlt-table
    id="hotspot_users"
    :columns="columns"
    :data-source="users"
    :no-value-text="$t('No users currently connected')"
    :title="$t('Hotspot user sessions')"
    :table-actions="['column-list', 'search']"
  >
    <template #clientState="{ record }">
      <tlt-dummy-value
        :value="record.clientState ? $t('Active') : $t('Inactive')"
        :class="record.clientState ? 'success' : 'error'"
      />
    </template>
    <template #logout="{ record }">
      <tlt-button
        :id="'logout_' + record.macAddress"
        :disabled="!record.clientState"
        @click="logoutUser(record)"
      >
        {{ $t('Logout') }}
      </tlt-button>
    </template>
  </tlt-table>
</template>
<script>
export default {
  data() {
    return {
      users: [],
      columns: [
        { dataIndex: 'userName', title: this.$t('Username') },
        { dataIndex: 'ipAddress', title: this.$t('IP') },
        { dataIndex: 'macAddress', title: this.$t('MAC') },
        { dataIndex: 'inputOctets', title: this.$t('Download') },
        { dataIndex: 'outputOctets', title: this.$t('Upload') },
        { dataIndex: 'sessionTime', title: this.$t('Session time') },
        { dataIndex: 'startTime', title: this.$t('Start time'), hidden: true },
        { dataIndex: 'clientState', title: this.$t('State') },
        { dataIndex: 'logout', title: this.$t('Logout user') }
      ]
    }
  },
  timers: {
    loadCurrentUsers: { time: 3000, autostart: true, immediate: true, repeat: true }
  },
  methods: {
    loadCurrentUsers() {
      return this.$axios
        .get('/api/hotspot/user_management/status')
        .then(response => {
          const users = response.success ? response.data : []
          this.users = users.map(u => ({
            userName: u.session.userName || '-',
            ipAddress: u.ipAddress || '-',
            macAddress: u.macAddress || '-',
            inputOctets: u.accounting.inputOctets ? '%MB'.format(u.accounting.inputOctets) : '0 B',
            outputOctets: u.accounting.outputOctets ? '%MB'.format(u.accounting.outputOctets) : '0 B',
            startTime: u.session.startTime ? this.$localDate(Number(u.session.startTime)) : '-',
            sessionTime: u.accounting.sessionTime ? u.accounting.sessionTime + ' s' : '-',
            clientState: u.clientState
          }))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load current user data'))
        })
    },
    logoutUser(user) {
      return this.$axios
        .post('/api/hotspot/user_management/actions/logout_user', { data: { macaddress: user.macAddress } })
        .then(() => {
          this.$message.success(this.$t('User logout successful'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to logout a user'))
        })
    }
  }
}
</script>
