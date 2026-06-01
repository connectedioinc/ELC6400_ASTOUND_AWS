<template>
  <tlt-table
    id="ARP"
    sid="arp_routes"
    :title="$t('ARP')"
    :columns="arp.columns"
    :data-source="arp.data"
    :loading="loading"
    :table-actions="['column-list', 'search']"
  />
  <tlt-table
    id="ipv4_routes"
    sid="ipv4_routes"
    :title="$t('IPV4-routes')"
    :columns="routes.columns"
    :data-source="routes.data"
    :loading="loading"
    :table-actions="['column-list', 'search']"
  />
  <tlt-table
    id="ipv6_routes"
    sid="ipv6_routes"
    :title="$t('IPV6-routes')"
    :columns="routes6.columns"
    :data-source="routes6.data"
    :loading="loading"
    :table-actions="['column-list', 'search']"
  />
  <tlt-table
    id="ipv6_routes_neighbours"
    sid="ipv6_routes_neighbours"
    :title="$t('IPv6 neighbours')"
    :columns="routes6Neighbours.columns"
    :data-source="routes6Neighbours.data"
    :loading="loading"
    :table-actions="['column-list', 'search']"
  />
</template>

<script>
export default {
  data() {
    return {
      loading: true,
      rtn: [],
      arp: {
        columns: [
          { dataIndex: 'dest', title: this.$t('IPv4-Address') },
          { dataIndex: 'mac', title: this.$t('MAC-Address') },
          { dataIndex: 'dev', title: this.$t('Interface') }
        ],
        data: []
      },
      routes: {
        columns: [
          { dataIndex: 'dev', title: this.$t('Network') },
          { dataIndex: 'dest', title: this.$t('Target') },
          { dataIndex: 'gw', title: this.$t('IPV4-Gateway') },
          { dataIndex: 'metric', title: this.$t('Metric') },
          { dataIndex: 'table', title: this.$t('Table') }
        ],
        data: []
      },
      routes6: {
        columns: [
          { dataIndex: 'dev', title: this.$t('Network') },
          { dataIndex: 'dest', title: this.$t('Target') },
          { dataIndex: 'gw', title: this.$t('IPv6-Gateway') },
          { dataIndex: 'metric', title: this.$t('Metric') },
          { dataIndex: 'table', title: this.$t('Table') }
        ],
        data: []
      },
      routes6Neighbours: {
        columns: [
          { dataIndex: 'dest', title: this.$t('IPv6-Address') },
          { dataIndex: 'mac', title: this.$t('MAC-Address') },
          { dataIndex: 'dev', title: this.$t('Interface') }
        ],
        data: []
      }
    }
  },
  async created() {
    this.$spin()
    await this.loadData()
    this.$spin(false)
  },
  methods: {
    showError(type) {
      this.$message.error(this.$t('Failed to load %s data').format(type))
      return []
    },
    loadData() {
      const requests = [
        '/api/interfaces/basic/status?include=vpn',
        '/api/routes/status/routes_tables',
        '/api/ip_neighbors/ipv4/status',
        '/api/ip_routes/ipv4/status',
        '/api/ip_routes/ipv6/status',
        '/api/ip_neighbors/ipv6/status'
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([ifaceStatus, rtn, arp, routes, routes6, routesNeighbors]) => {
          this.interfaceStatus = ifaceStatus.success ? ifaceStatus.data : this.showError('Interface')
          this.rtn = rtn.success ? rtn.data : this.showError('route table')
          this.arp.data = arp.success ? this.parseArpData(arp.data) : this.showError('arp')
          this.routes.data = routes.success ? this.parseRoutesData(routes.data) : this.showError('ipv4 route')
          this.routes6.data = routes6.success ? this.parseRoutes6Data(routes6.data) : this.showError('ipv6 route data')
          this.routes6Neighbours.data = routesNeighbors.success ? this.parseRoutes6NeighboursData(routesNeighbors.data) : this.showError('ipv6 route neighbor')
          this.loading = false
        })
        .catch(() => {
          this.$message.error(this.$t('Unexpected error'))
        })
    },
    parseArpData(data) {
      return data.map(element => ({
        dest: element.dest || '-',
        mac: element.mac || '-',
        dev: this.$network.getInterfaceAndVpnName(this.interfaceStatus, element.dev ?? '-', 'name')
      }))
    },
    parseRoutesData(data) {
      return data.map(element => ({
        dev: this.$network.getInterfaceAndVpnName(this.interfaceStatus, element.dev ?? '-', 'name'),
        dest: element.dest || '-',
        gw: element.gateway || '*',
        metric: element.metric || '0',
        table: this.rtn[element.table] ? this.rtn[element.table] : element.table ? element.table : '-'
      }))
    },
    parseRoutes6Data(data) {
      return data.map(element => ({
        dev: this.$network.getInterfaceAndVpnName(this.interfaceStatus, element.dev ?? '-', 'name'),
        dest: element.dest || '-',
        gw: element.gateway || '::',
        metric: element.metric || '0',
        table: this.rtn[element.table] ? this.rtn[element.table] : element.table ? element.table : '-'
      }))
    },
    parseRoutes6NeighboursData(data) {
      return data.map(element => ({
        dev: this.$network.getInterfaceAndVpnName(this.interfaceStatus, element.dev ?? '-', 'name'),
        mac: element.mac || '-',
        dest: element.dest || '-'
      }))
    }
  }
}
</script>
