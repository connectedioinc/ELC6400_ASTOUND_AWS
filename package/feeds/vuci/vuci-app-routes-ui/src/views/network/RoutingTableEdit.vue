<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="network;xl2tpd;pptpd"
    :after-load="setID"
    :before-save="validate"
    bulk-request
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'routing_tables/config' }]"
      data-key="table"
      :name="section.id"
      :title="$utils.getModalTitle($t('routing table'), section.name)"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="name"
        :label="$t('Name of Table')"
        rules="fieldvalidation('^[a-zA-Z]+$',0)"
        maxlength="8"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        name="table_id"
        :label="$t('ID of Table')"
        :rules="['irange(0,65535)', v => except(v, ['255', '254', '253', '220', '128'])]"
        required
      />
    </vuci-named-section>
    <vuci-typed-section
      type="route"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `ip_routes/ipv4/config?table=${initialTableId}` }]"
      :data-key="`${id}_ipv4`"
      :title="$utils.getModalTitle($t('static IPv4 routes'))"
      :columns="staticRoutesIPv4"
      :add="form => (form.table = initialTableId)"
      :table-actions="['column-list', 'search']"
    >
      <template #interface="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="interface"
          :options="interfaces()"
        />
      </template>
      <template #target="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="target"
          rules="ip4addr"
          placeholder="0.0.0.0"
          required
        />
      </template>
      <template #netmask="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="netmask"
          rules="netmask"
          placeholder="255.255.255.255"
        />
      </template>
      <template #gateway="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="gateway"
          rules="ip4addr"
          placeholder="0.0.0.0"
        />
      </template>
      <template #metric="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="metric"
          rules="irange(0,4294967295)"
          placeholder="0"
        />
      </template>
      <template #mtu="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="mtu"
          rules="irange(68,9200)"
          placeholder="1500"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="type"
          :options="type"
          initial=""
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      type="route6"
      :uci-data="uciData"
      :endpoints="[{ endpoint: `ip_routes/ipv6/config?table=${initialTableId}` }]"
      :data-key="`${id}_ipv6`"
      :title="$utils.getModalTitle($t('static IPv6 routes'))"
      :columns="staticRoutesIPv6"
      :add="form => (form.table = initialTableId)"
      :table-actions="['column-list', 'search']"
    >
      <template #interface="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="interface"
          :options="interfaces()"
        />
      </template>
      <template #target="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="target"
          rules="ipmask6"
          placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
          required
        />
      </template>
      <template #gateway="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="gateway"
          rules="ip6addr"
          placeholder="0000:0000:0000:0000:0000:0000:0000:0000"
        />
      </template>
      <template #metric="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="metric"
          rules="irange(0,4294967295)"
          placeholder="0"
        />
      </template>
      <template #mtu="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="mtu"
          rules="irange(68,9200)"
          placeholder="1500"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="type"
          :options="type"
          initial=""
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
export default {
  inject: ['interfaces'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      staticRoutesIPv4: [
        { name: 'interface', label: this.$t('Interface'), help: this.$t('The zone where the target network resides.') },
        { name: 'target', label: this.$t('Target'), help: this.$t('Host-IP or Network.') },
        {
          name: 'netmask',
          label: this.$t('IPv4-Netmask'),
          help: this.$t('A Mask that is applied to the Target to determine to what actual IP addresses the routing rule applies.')
        },
        {
          name: 'gateway',
          label: this.$t('IPv4-Gateway'),
          help: this.$t('Defines where the device should send all the traffic that applies to the rule.')
        },
        {
          name: 'metric',
          label: this.$t('Metric'),
          help: this.$t('The metric value is used as a sorting measure. If a packet about to be routed fits two rules, the one with the lower metric is applied.')
        },
        {
          name: 'mtu',
          label: this.$t('MTU'),
          help: this.$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')
        },
        {
          name: 'type',
          label: this.$t('Route type'),
          help: this.$t('Selects route type. Each type specifies a different behavior for the route.')
        }
      ],
      staticRoutesIPv6: [
        { name: 'interface', label: this.$t('Interface'), help: this.$t('The zone where the target network resides.') },
        { name: 'target', label: this.$t('Target'), help: this.$t('Host-IP or Network.') },
        {
          name: 'gateway',
          label: this.$t('IPv6-Gateway'),
          help: this.$t('Defines where the device should send all the traffic that applies to the rule.')
        },
        {
          name: 'metric',
          label: this.$t('Metric'),
          help: this.$t('The metric value is used as a sorting measure. If a packet about to be routed fits two rules, the one with the lower metric is applied.')
        },
        {
          name: 'mtu',
          label: this.$t('MTU'),
          help: this.$t('Sets the maximum transmission unit (MTU) size. It is the largest size of a protocol data unit (PDU) that can be transmitted in a single network layer transaction.')
        },
        {
          name: 'type',
          label: this.$t('Route type'),
          help: this.$t('Selects route type. Each type specifies a different behavior for the route.')
        }
      ],
      type: [
        ['', this.$t('Unicast')],
        ['local', this.$t('Local')],
        ['broadcast', this.$t('Broadcast')],
        ['multicast', this.$t('Multicast')],
        ['unreachable', this.$t('Unreachable')],
        ['prohibit', this.$t('Prohibit')],
        ['blackhole', this.$t('Blackhole')],
        ['anycast', this.$t('Anycast')]
      ],
      id: '',
      initialTableId: ''
    }
  },
  methods: {
    except(val, excepts) {
      const value = excepts.find(exc => exc === val)
      return {
        isValid: !value,
        message: this.$t('value "%s" is not allowed.').format(value)
      }
    },
    setID() {
      this.id = this.section.id
      this.initialTableId = this.section.table_id
    },
    validate() {
      const idExists = this.formData.table.some(table => table.id !== this.section.id && table.table_id === this.section.table_id)
      const nameExists = this.formData.table.some(table => table.id !== this.section.id && table.name === this.section.name)
      return new Promise((resolve, reject) => {
        if (idExists) reject(this.$t('Table with this route table ID already exists'))
        if (nameExists) reject(this.$t('Table with this route table name already exists'))
        resolve()
      })
    }
  }
}
</script>
