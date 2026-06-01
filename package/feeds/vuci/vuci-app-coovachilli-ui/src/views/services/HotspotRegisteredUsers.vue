<template>
  <tlt-table
    id="registered_hotspot_users"
    :columns="columns"
    :data-source="users"
    :no-value-text="$t('No users registered')"
    :title="$t('Registered hotspot users')"
    :table-actions="['column-list', 'search']"
  >
    <template #delete="{ record }">
      <tlt-button
        :id="'delete_' + record.id"
        size="md"
        type="text"
        color="error"
        @click="deleteUser(record)"
      >
        {{ $t('Delete') }}
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
        { dataIndex: 'username', title: this.$t('Name') },
        { dataIndex: 'email', title: this.$t('Email') },
        {
          dataIndex: 'expiration',
          title: this.$t('Expiration time'),
          help: this.$t('Registration expiration time in seconds.')
        },
        { dataIndex: 'phone', title: this.$t('Phone') },
        {
          dataIndex: 'date',
          title: this.$t('Registration date'),
          help: this.$t('The date is displayed according to your local timezone.')
        },
        { dataIndex: 'delete', title: this.$t('Delete user') }
      ]
    }
  },

  timers: {
    loadRegisteredUsers: { time: 3000, autostart: true, immediate: true, repeat: true }
  },
  methods: {
    loadRegisteredUsers() {
      return this.$axios
        .bulkGet(['/api/hotspot/user_management/config', '/api/hotspot/users/config'])
        .then(([hotspotUsers, allUsers]) => {
          if (!hotspotUsers.success) {
            hotspotUsers.data.users = []
            hotspotUsers.data.sms_users = []
            this.$message.error(this.$t('Failed to load hotspot users data'))
          }
          if (!allUsers.success) this.$message.error(this.$t('Failed to load local users data'))
          const registeredUsers = allUsers.success ? allUsers.data : []
          hotspotUsers.data.users.forEach(user => {
            user.type = 'user'
          })
          hotspotUsers.data.sms_users.forEach(user => {
            user.type = 'sms_user'
          })
          const users = [...hotspotUsers.data.users, ...hotspotUsers.data.sms_users, ...registeredUsers]
          this.users = users.map(u => ({
            id: u.id,
            type: u.type,
            username: u.username || '-',
            expiration: u.expiration ? u.expiration + ' s' : this.$t('Unlimited'),
            phone: u.phone || '-',
            email: u.email ? u.email : '-',
            date: u.created ? this.$localDate(new Date(u.created.replace(' ', 'T') + 'Z').getTime() / 1000) : '-'
          }))
        })
        .catch(() => {
          this.$message.error('An unexpected error occurred')
        })
    },
    deleteUser(user) {
      this.$prompt.show({
        title: this.$t('Delete user?'),
        content: this.$t('This process can not be undone.'),
        okText: this.$t('Delete'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.onPromptOk(user)
      })
    },
    onPromptOk(user) {
      if (user.type) {
        return this.$axios
          .delete(`/api/hotspot/user_management/config/${user.id}`, {
            data: { data: { user_type: user.type } }
          })
          .then(() => {
            this.$message.success(this.$t('User deleted successfuly'))
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to delete a hotspot user'))
          })
      }
      return this.$axios
        .delete(`/api/hotspot/users/config/${user.id}`)
        .then(() => {
          this.$message.success(this.$t('User deleted successfuly'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to delete a hotspot user'))
        })
    }
  }
}
</script>
