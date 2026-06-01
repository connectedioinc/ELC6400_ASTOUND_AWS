<template>
  <tlt-table
    id="nhrp"
    :columns="nhrp.columns"
    :data-source="nhrp.data || []"
    sid="nhrp_routes"
    title="NHRP"
    :table-actions="nhrp.data.length === 0 ? [] : ['column-list', 'search']"
  >
    <div v-if="nhrp.data.length === 0">
      {{ $t('There are no neighbours') }}
    </div>
  </tlt-table>
</template>
<script>
export default {
  data() {
    return {
      loading: true,
      nhrp: {
        columns: [
          { dataIndex: 'interface', title: this.$t('Interface') },
          { dataIndex: 'type', title: this.$t('Type') },
          { dataIndex: 'protocol', title: this.$t('Protocol address') },
          { dataIndex: 'nbma', title: this.$t('NBMA') },
          { dataIndex: 'identity', title: this.$t('Identity') }
        ],
        data: []
      }
    }
  },
  created() {
    this.$spin()
    this.$timer.start('getData')
  },
  methods: {
    getData() {
      return this.$axios
        .get('/api/nhrp/status')
        .then(({ data }) => {
          if (data) this.nhrp.data = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load nhrp data'))
        })
        .finally(() => {
          if (this.loading) {
            this.loading = false
            this.$spin(false)
          }
        })
    }
  },
  timers: {
    getData: { time: 10000, immediate: true, repeat: true }
  }
}
</script>
