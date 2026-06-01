<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="table"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'routing_tables/config' }]"
      data-key="table"
      :title="$t('Routing tables')"
      :help="$t('List of created routing tables.')"
      :columns="tablesSection"
      :add-validate="addValidate"
      :edit-form="RoutingTableEdit"
      :after-add="afterAdd"
      :table-actions="['column-list', 'search']"
    >
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.table_id"
          prop="table_id"
          :label="$t('ID')"
          rules="irange(0,65535)"
          required
        />
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('New configuration name')"
          prop="name"
          required
          rules="fieldvalidation('^[a-zA-Z]+$',0)"
          maxlength="8"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      type="rule"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ip_rules/ipv4/config' }]"
      data-key="rules"
      :title="$t('Routing rules for IPv4')"
      :help="$t('Routing rules for IPv4.')"
      :columns="rulesSection"
      :edit-form="RoutesRulesEdit"
      :table-actions="['column-list', 'search']"
    >
      <template #priority="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="priority"
          :display-value="priority"
        />
      </template>
      <template #_match="{ s }">
        <div>
          <fw-rule
            v-for="(action, index) in parseMatch(s)"
            :key="index"
            v-bind="action"
          />
        </div>
      </template>
      <template #_action="{ s }">
        <fw-rule-value :property="parseAction(s)" />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import RoutingTableEdit from './RoutingTableEdit.vue'
import RoutesRulesEdit from './RoutesRulesEdit.vue'
import { useRouteRuleParser } from './useRouteRuleParser'
import FwRule from '@/components/network/firewall/FwRule.vue'
import FwRuleValue from '@/components/network/firewall/FwRuleValue.vue'
export default {
  components: { FwRule, FwRuleValue },
  provide() {
    return {
      interfaces: () => this.interfaceOptions
    }
  },
  setup: useRouteRuleParser,
  data() {
    return {
      formData: {},
      tablesSection: [
        { name: 'table_id', label: this.$t('Table ID') },
        { name: 'name', label: this.$t('Table name') }
      ],
      rulesSection: [
        { name: 'priority', label: this.$t('Priority') },
        { name: '_match', label: this.$t('Match'), width: 'sm' },
        { name: '_action', label: this.$t('Action') }
      ],
      interfacesAndVpns: [],
      RoutingTableEdit: markRaw(RoutingTableEdit),
      RoutesRulesEdit: markRaw(RoutesRulesEdit)
    }
  },
  computed: {
    interfaceOptions() {
      return this.$network.parseInterfaceAndVpnOptions(this.interfacesAndVpns)
    }
  },
  methods: {
    async loadData(form) {
      return this.$axios
        .bulkGet(['/api/ip_routes/ipv4/config', '/api/ip_routes/ipv6/config', '/api/interfaces/basic/status?include=vpn'])
        .then(([ipv4Routes, ipv6Routes, interfaceStatus]) => {
          const uciData = {}
          this.interfacesAndVpns = interfaceStatus.success ? interfaceStatus.data : this.showError($t('Interface'))
          const ipv4Data = ipv4Routes.success ? ipv4Routes.data : this.showError('IPv4')
          const ipv6Data = ipv6Routes.success ? ipv6Routes.data : this.showError('IPv6')
          form.table.forEach(t => {
            uciData[`${t.id}_ipv4`] = ipv4Data.filter(ipv4 => ipv4.table === t.table_id)
            uciData[`${t.id}_ipv6`] = ipv6Data.filter(ipv6 => ipv6.table === t.table_id)
          })
          return uciData
        })
        .catch(() => {
          this.$message.error(this.$t('Unexpected error'))
        })
    },
    afterAdd(_, res) {
      const dataKeys = [`${res.newSection.id}_ipv4`, `${res.newSection.id}_ipv6`]
      dataKeys.forEach(dataKey => {
        res.uciData[dataKey] = []
      })
    },
    showError(type) {
      this.$message.error(this.$t('Failed to load %s data').format(type))
      return type === 'system' ? false : []
    },
    priority(value) {
      return value || this.$t('Automatic')
    },
    addValidate(addModel, sections) {
      if (sections.some(section => section.table_id === addModel.table_id)) return { valid: false, message: this.$t('%s table ID is reserved for other table').format(addModel.table_id) }
      if (sections.some(section => section.name === addModel.name)) return { valid: false, message: this.$t('Table with %s route name already exists').format(addModel.name) }
      if (['255', '254', '253', '220', '128'].includes(addModel.table_id))
        return {
          valid: false,
          message: this.$t('%s table ID is reserved for other service or kernel').format(addModel.table_id)
        }
      else return { valid: true }
    }
  }
}
</script>
