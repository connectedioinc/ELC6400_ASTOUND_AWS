<template>
  <tlt-routing-card
    card-title="RIP"
    :cards="cards"
    :table-columns="tableColumns"
    :cards-columns="cardsColumns"
  />
</template>
<script>
export default {
  data() {
    return {
      firstLoad: true,
      cards: [],
      tableColumns: [
        { dataIndex: 'Network', title: this.$t('Network') },
        { dataIndex: 'NextHop', title: this.$t('NextHop') },
        { dataIndex: 'Metric', title: this.$t('Metric') },
        { dataIndex: 'From', title: this.$t('From') },
        { dataIndex: 'Tag', title: this.$t('Tag') },
        { dataIndex: 'Time', title: this.$t('Time') }
      ],
      cardsColumns: [
        { name: 'interface', label: this.$t('Interface') },
        { name: 'sendreceive', label: this.$t('Send/Receive') },
        { name: 'badpackets', label: this.$t('Bad packets') },
        { name: 'badroutes', label: this.$t('Bad routes') },
        { name: 'distance', label: this.$t('Distance') },
        { name: 'lastUpdate', label: this.$t('Last Update') }
      ]
    }
  },
  created() {
    this.$spin()
    this.$timer.start('getData')
  },
  methods: {
    getData() {
      return this.$axios
        .get('/api/rip/status')
        .then(({ data }) => {
          if (data) {
            const cards = []
            const skey = 'sources'
            const sourceKeyArray = Object.keys(data[skey])
            const sendreceive = data[skey].sendreceive
            const Interface = data[skey].Interface
            for (let i = 0; i < sourceKeyArray.length - 2; i++) {
              const sources = data[skey]
              const j = i + 1
              const cardData = {
                sendreceive: sendreceive || '-',
                interface: Interface || '-',
                badpackets: sources[sourceKeyArray[i]].Badpackets || '-',
                distance: sources[sourceKeyArray[i]].Distance || '-',
                badroutes: sources[sourceKeyArray[i]].Badroutes || '-',
                lastUpdate: sources[sourceKeyArray[i]].LastUpdate || '-'
              }
              cards.push({
                id: sources[sourceKeyArray[i]].Gateway || i,
                title: sources[sourceKeyArray[i]].Gateway || '-',
                data: cardData,
                tableData: this.getTableData(data, j, skey, sources, sourceKeyArray)
              })
            }
            this.cards = cards
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load rip data'))
        })
        .finally(() => {
          this.$spin(false)
          if (this.firstLoad) {
            this.firstLoad = false
          }
        })
    },
    getTableData(info, ii, nkey, neighbors, neighborKeyArray) {
      const table = []
      const jsonKeys = Object.keys(info)
      for (let i = 0; i < jsonKeys.length; i++) {
        const route = info[jsonKeys[i]]
        if (jsonKeys[i] !== nkey) {
          if (route.From === neighbors[neighborKeyArray[ii - 1]].Gateway && route.Type === 'R(n)') {
            table.push({
              Network: route.Network || '-',
              NextHop: route.NextHop || '-',
              Metric: route.Metric || '-',
              From: route.From || '-',
              Tag: route.Tag || '-',
              Time: route.Time || '-'
            })
          }
        }
      }
      return table
    }
  },
  timers: {
    getData: { time: 10000, immediate: true, repeat: true }
  }
}
</script>
