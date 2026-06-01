<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    editing
    config="network;xl2tpd;pptpd"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'ip_rules/ipv4/config' }]"
      data-key="rules"
      :name="section.id"
      :title="$t('Routing rules for IPv4')"
      :help="$t('Configuration for a specific rule.')"
    >
      <vuci-form-item-input
        :uci-section="s"
        name="priority"
        :label="$t('Priority')"
        :help="$t('Controls the order of the IP rules, by default the priority is auto-assigned so that they are processed in the same order.')"
        rules="irange(0, 65535)"
        placeholder="1"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="in"
        :label="$t('Incoming interface')"
        :help="$t('Specifies the incoming logical interface name.')"
        :options="inInterfaces"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="out"
        :label="$t('Outgoing interface')"
        :help="$t('Specifies the outgoing logical interface name.')"
        :options="outInterfaces"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="src"
        :label="$t('Source subnet')"
        :help="$t('Specifies the source subnet to match (CIDR notation).')"
        rules="subnet4"
        placeholder="192.168.1.0/24"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="dest"
        :label="$t('Destination subnet')"
        :help="$t('Specifies the destination subnet to match (CIDR notation).')"
        placeholder="192.168.1.0/24"
        rules="subnet4"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="tos"
        :label="$t('TOS Value to Match')"
        :help="$t('Specifies the TOS value to match in IP headers.')"
        :options="tosOptions"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="mark"
        :label="$t('Firewall Mark')"
        :help="$t('Specifies the firewall mark and optionally its mask to match, e.g., 0xFF to match mark 255 or 0x0/0x1 to match any even mark value.')"
        :rules="validateMark"
        placeholder="0xFF"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="invert"
        :label="$t('Invert matches')"
        :help="$t('If enabled, the meaning of the match options (Firewall Mark, TOS Value, Source and Destination subnets) is inverted.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Matched Traffic Action')"
        name="action_group"
        :options="actions"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="lookup"
        :label="$t('Lookup Table')"
        :help="$t('The rule target is a table lookup.')"
        :options="tableOptions"
        :depend="s.action_group == 'lookup'"
        allow-create
      />
      <vuci-form-item-select
        :uci-section="s"
        name="goto"
        :label="$t('Jump to rule priority')"
        :help="$t('The rule target is a jump to another rule specified by its priority value.')"
        :options="ruleOptions"
        :depend="s.action_group == 'goto'"
        allow-create
      />
      <vuci-form-item-select
        :uci-section="s"
        name="action"
        :label="$t('Routing Action')"
        :help="$t('The rule target is one of the routing actions outlined in the table below.')"
        :options="routingAction"
        :depend="s.action_group == 'action'"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
import { hexstring } from '@/validation-rules'
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
      actions: [
        ['lookup', this.$t('Lookup Table')],
        ['goto', this.$t('Jump to rule')],
        ['action', this.$t('Routing Action')]
      ],
      routingAction: [
        ['prohibit', this.$t('Prohibit')],
        ['unreachable', this.$t('Unreachable')],
        ['blackhole', this.$t('Blackhole')],
        ['throw', this.$t('Throw')]
      ],
      tosOptions: [
        ['0', this.$t('Normal-Service (0)')],
        ['2', this.$t('Minimize-Cost (2)')],
        ['4', this.$t('Maximize-Reliability (4)')],
        ['8', this.$t('Maximize-Troughput (8)')],
        ['16', this.$t('Minimize-Delay (16)')]
      ]
    }
  },
  computed: {
    inInterfaces() {
      return [['', this.$t('Any')]].concat(this.interfaces())
    },
    outInterfaces() {
      return [['', this.$t('None')]].concat(this.interfaces())
    },
    tableOptions() {
      const tables = this.formData.table.map(table => [table.table_id, `${table.name} (${table.table_id})`])
      return tables.length !== 0 ? tables : [['nil', this.$t('No routing tables found')]]
    },
    ruleOptions() {
      const rules = this.formData.rules.filter(rule => rule.priority && rule.priority !== '').map(rule => rule.priority)
      return rules.length !== 0 ? rules : [['nil', this.$t('No routing rules found')]]
    }
  },
  methods: {
    /**
     * @param {string} valueString
     */
    validateMark(valueString) {
      const invalid = {
        isValid: false,
        message: this.$t('Both firewall mark and mask should consist of a "0x" prefix and no more than 8 hexadecimal characters.')
      }
      const values = valueString.split('/')
      if (values.length > 2) return invalid
      if (values.some(value => value.length > 10 || !value.startsWith('0x') || !hexstring(value.substring(2)))) return invalid
      return { isValid: true }
    }
  }
}
</script>
