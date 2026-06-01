<template>
  <tlt-routing-card
    card-title="EIGRP"
    :cards="cards"
    :table-columns="tableColumns"
    :cards-columns="cardsColumns"
  />
</template>
<script>
export default {
  data() {
    return {
      cards: [],
      tableColumns: [
        { dataIndex: 'ip', title: this.$t('IP') },
        { dataIndex: 'fd', title: this.$t('FD') },
        { dataIndex: 'serno', title: this.$t('Serno') }
      ],
      cardsColumns: [
        { name: 'Interface', label: this.$t('Interface') },
        { name: 'Hold', label: this.$t('Hold') },
        { name: 'Uptime', label: this.$t('Uptime') },
        { name: 'SRTT', label: this.$t('SRTT') },
        { name: 'RTO', label: this.$t('RTO') },
        { name: 'Q', label: this.$t('Queue count') },
        { name: 'Seq', label: this.$t('Sequence num') }
      ]
    }
  },
  async created() {
    this.$spin()
    await this.getData()
    this.$spin(false)
    this.$timer.start('getData')
  },
  methods: {
    getData() {
      return this.$axios
        .get('/api/eigrp/status')
        .then(data => {
          if (data?.data) {
            const cards = []
            const nkey = 'neighbors'
            const neighborKeyArray = Object.keys(data.data[nkey])
            for (let i = 0; i < neighborKeyArray.length; i++) {
              const neighbors = data.data[nkey]
              const j = i + 1
              const ip = neighbors[neighborKeyArray[i]].Address || '-'
              const cardData = {
                Interface: neighbors[neighborKeyArray[i]].Interface || '-',
                Hold: neighbors[neighborKeyArray[i]].Hold || '-',
                Uptime: neighbors[neighborKeyArray[i]].Uptime || '-',
                SRTT: neighbors[neighborKeyArray[i]].SRTT || '-',
                RTO: neighbors[neighborKeyArray[i]].RTO || '-',
                Q: neighbors[neighborKeyArray[i]].Q || '-',
                Seq: neighbors[neighborKeyArray[i]].Seq || '-'
              }
              cards.push({
                id: ip,
                title: ip,
                data: cardData,
                tableData: this.getTableData(data.data, j, nkey, neighbors, neighborKeyArray)
              })
            }
            this.cards = cards
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load eigrp data'))
        })
    },
    getTableData(info, ii, nkey, neighbors, neighborKeyArray) {
      const table = []
      const jsonKeys = Object.keys(info)
      for (let i = 0; i < jsonKeys.length; i++) {
        const route = info[jsonKeys[i]]
        if (jsonKeys[i] !== nkey) {
          let address = String(route.via)
          address = address.split(' ')
          if (address[1] === neighbors[neighborKeyArray[ii - 1]].Address) {
            const fd = route.fd.split(' ')
            const serno = route.serno.split(' ')
            const ip = route.ip.split(' ')
            table.push({
              fd: fd[2] || '-',
              serno: serno[1] || '-',
              ip: ip[2] || '-'
            })
          }
        }
      }
      return table
    }
  },
  timers: {
    getData: { time: 10000, immediate: false, repeat: true }
  }
}
</script>
