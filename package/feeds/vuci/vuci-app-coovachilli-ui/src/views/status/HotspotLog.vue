<template>
  <tlt-table
    id="records"
    :columns="columns"
    :data-source="hotspot"
    :per-page-text="$t('Records per page')"
    pagination
    :title="$t('Hotspot log')"
    :help="$t('The Hotspot Log section contains information about hotspot connections.')"
    @refresh="loadHotspotLogs"
  >
    <template #session="{ record }">
      <tlt-dummy-value
        :value="record.session === '1' ? $t('Logged in') : $t('Logged out')"
        :class="record.session === '1' ? 'success' : 'error'"
      />
    </template>
  </tlt-table>
</template>

<script>
export default {
  data() {
    return {
      terminateCause: {
        10: this.$t('Logout request'),
        11: this.$t('Idle timeout'),
        12: this.$t('Timeout'),
        13: this.$t('Session expired'),
        14: this.$t('Download limit'),
        15: this.$t('Upload limit'),
        16: this.$t('Total limit'),
        17: this.$t('Location change')
      },
      hotspot: []
    }
  },
  computed: {
    columns() {
      return [
        { dataIndex: 'username', title: this.$t('Username') },
        { dataIndex: 'ip', title: this.$t('IP address') },
        { dataIndex: 'mac', title: this.$t('MAC address') },
        { dataIndex: 'sessiontime', title: this.$t('Session time') },
        { dataIndex: 'start_time', title: this.$t('Start time'), hidden: true },
        { dataIndex: 'terminate_cause', title: this.$t('Termination cause') },
        { dataIndex: 'session', title: this.$t('Status') },
        { dataIndex: 'input_octets', title: this.$t('Download') },
        { dataIndex: 'output_octets', title: this.$t('Upload') }
      ]
    }
  },
  created() {
    this.loadHotspotLogs()
  },
  methods: {
    loadHotspotLogs() {
      this.$spin()
      return this.$axios
        .get('/api/hotspot/logs/status')
        .then(response => {
          const logs = response.success ? response.data : []
          this.hotspot = logs.map(l => ({
            username: l.username,
            ip: l.ip,
            mac: l.mac,
            start_time: this.$localDate(new Date(l.start_time).getTime() / 1000),
            input_octets: '%mB'.format(l.input_octets),
            output_octets: '%mB'.format(l.output_octets),
            sessiontime: this.$t('%d s').format(l.sessiontime),
            terminate_cause: this.terminateCause[l.terminate_cause] || '-',
            session: l.session
          }))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load hotspot log data'))
        })
        .finally(() => {
          this.$spin(false)
        })
    }
  }
}
</script>
