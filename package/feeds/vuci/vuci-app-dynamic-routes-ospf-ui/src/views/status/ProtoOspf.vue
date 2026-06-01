<template>
  <tlt-routing-card
    card-title="OSPF"
    :cards="[externalRoutesCard, ...cards].filter(Boolean)"
    :table-columns="tableColumns"
    :cards-columns="cardsColumns"
  />
</template>
<script>
export default {
  data() {
    return {
      cards: [],
      externalRoutesCard: undefined,
      firstLoad: true,
      tableColumns: [
        { dataIndex: 'ip', title: this.$t('Network') },
        { dataIndex: 'type', title: this.$t('Route type') },
        { dataIndex: 'rtype', title: this.$t('Router type') },
        { dataIndex: 'cost', title: this.$t('Cost') },
        { dataIndex: 'area', title: this.$t('Area') },
        { dataIndex: 'via', title: this.$t('Interface') },
        { dataIndex: 'nexthops', title: this.$t('Nexthop') }
      ],
      cardsColumns: [
        { name: 'priority', label: this.$t('Priority') },
        { name: 'state', label: this.$t('State') },
        { name: 'deadTimeMsecs', label: this.$t('Dead Time(s)') },
        { name: 'address', label: this.$t('Neighbor IP') },
        { name: 'ifaceName', label: this.$t('Interface address') },
        { name: 'iface', label: this.$t('Interface') },
        { name: 'retransmitCounter', label: this.$t('Retransmit counter') },
        { name: 'requestCounter', label: this.$t('Request counter') },
        { name: 'dbSummaryCounter', label: this.$t('Summary counter') }
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
        .get('/api/ospf/status')
        .then(ospf => {
          if (!ospf.data) return
          const cards = []
          for (const [id, [data]] of Object.entries(ospf.data.neighbors)) {
            const [iface, address] = data.ifaceName.split(':')
            const ip = data.address
            const cardData = {
              priority: String(data.priority),
              state: data.state,
              deadTimeMsecs: String(data.deadTimeMsecs / 1000),
              address: ip,
              ifaceName: address,
              iface,
              retransmitCounter: String(data.retransmitCounter),
              requestCounter: String(data.requestCounter),
              dbSummaryCounter: String(data.dbSummaryCounter)
            }
            cards.push({
              id: id,
              title: id,
              data: cardData,
              tableData: this.getRoutes(ospf.data, ip)
            })
          }
          this.externalRoutesCard = {
            id: 'external',
            title: this.$t('External Routes'),
            tableData: this.getExternalRoutes(ospf.data)
          }
          this.cards = cards
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load ospf data'))
        })
        .finally(() => {
          if (this.firstLoad) {
            this.$spin(false)
            this.firstLoad = false
          }
        })
    },
    getRoutes(ospf, address) {
      const routes = []
      for (const [id, data] of Object.entries(ospf)) {
        if (id !== 'neighbors') {
          const [hop] = data.nexthops
          if (hop.ip === address && data.routeType !== 'N E2') {
            routes.push(this.parseRoutes(id, data, hop))
          }
        }
      }
      return routes.sort((a, b) => (b.type > a.type ? 1 : a.type > b.type ? -1 : 0))
    },
    getExternalRoutes(ospf) {
      const routes = []
      for (const [id, data] of Object.entries(ospf)) {
        if (id !== 'neighbors') {
          const [hop] = data.nexthops
          if (data.routeType === 'N E2') {
            routes.push(this.parseRoutes(id, data, hop))
          }
        }
      }
      return routes.sort((a, b) => (b.type > a.type ? 1 : a.type > b.type ? -1 : 0))
    },
    parseRoutes(id, data, hop) {
      return {
        id,
        ip: data.routeType === 'R ' ? '-' : id,
        type: data.routeType || '-',
        rtype: data.routerType ? data.routerType.toUpperCase() : '-',
        cost: data?.cost ? String(data.cost) : '-',
        area: data.area || '-',
        via: hop.via || '-',
        nexthops: hop.ip || '-'
      }
    }
  },
  timers: {
    getData: { time: 10000, immediate: true, repeat: true }
  }
}
</script>
