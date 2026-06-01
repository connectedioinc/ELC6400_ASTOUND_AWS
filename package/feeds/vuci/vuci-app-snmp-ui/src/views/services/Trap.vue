<template>
  <vuci-form
    v-slot="{ uciData }"
    config="snmptrap"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('Trap service settings')"
      :help="$t('This section is used to configure trap service settings.')"
      :uci-data="uciData"
      data-key="settings"
      :endpoints="[{ endpoint: 'snmp/trap/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
      />
      <vuci-form-item-custom
        :uci-section="s"
        name="hosts"
        :label="$t('Destination address')"
        :help="$t('Destination address to which SNMP (Simple Network Management Protocol) trap messages are sent.')"
        :headers="[$t('Hostname'), $t('Port')]"
        inputs="input,input"
        :input-props="hostInputProps"
        :write-parse="values => values.join(';')"
        allow-create
        separator=";"
        :maxlines="20"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="community"
        :label="$t('Community')"
        initial="Public"
        rules="uciname"
        maxlength="31"
        :help="$t('The SNMP (Simple Network Management Protocol) community is an ID that allows access to a routers SNMP data.')"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
    <vuci-typed-section
      type="trap"
      :edit-form="editForm"
      :columns="trapRulesColumns"
      :title="$t('Trap rules')"
      :help="$t('This section displays SNMP trap configurations currently existing on the router.')"
      :uci-data="uciData"
      :table-actions="['column-list', 'search']"
      data-key="rules"
      :endpoints="[{ endpoint: 'snmp/trap/config' }]"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
          :display-value="displayType"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="type"
          :display-value="displayName"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import editForm from './TrapEdit'

export default {
  provide() {
    return { formOptions: this.getFormOptions }
  },
  data() {
    return {
      editForm: markRaw(editForm),
      modems: [],
      ios: [],
      events: [],
      trapRulesColumns: [
        { name: 'name', label: this.$t('Trap type') },
        { name: 'type', label: this.$t('Trigger'), help: this.$t('The trigger which invokes the rule.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      trapTypes: {
        gsm: this.$t('GSM'),
        iotrap: this.$t('Input/Output'),
        eventtrap: this.$t('Events log'),
        chilli: this.$t('Hotspot client')
      },
      trapNames: {
        signalstrtrap: this.$t('Signal strength'),
        conntypetrap: this.$t('Network type')
      },
      chilliNames: {
        connectedtrap: this.$t('Connected'),
        disconnectedtrap: this.$t('Disconnected')
      },
      hostInputProps: [
        {
          prop: 'hostname',
          rules: 'host',
          initial: '192.168.1.1',
          required: true
        },
        {
          prop: 'port',
          initial: '162',
          rules: 'port',
          required: true
        }
      ]
    }
  },
  computed: {
    ioPins() {
      return this.$io
        .getFilteredPinsInfo(this.ios)
        .filter(io => ['gpio', 'dwi', 'relay', 'adc', 'acl', 'pwr'].includes(io.type))
        .map(io => [io.id, io.name_with_pins])
    },
    ioPinsObj() {
      const pins = {}
      this.ioPins.forEach(([pin, name]) => {
        pins[pin] = name
      })
      return pins
    }
  },
  methods: {
    getFormOptions() {
      return { modems: this.modems, ioPins: this.ioPins, events: this.events }
    },
    afterLoad() {
      return this.$axios
        .bulkGet([{ endpoint: '/api/modems/status', condition: 'mobifd.control' }, { endpoint: '/api/io/status', condition: this.$store.board.hwinfo.ios }, '/api/snmp/trap/options'])
        .then(([modemRes, ioRes, eventsRes]) => {
          if (modemRes.success) this.modems = modemRes.data
          else this.$message.error(this.$t('Failed to load modem info'))
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          if (ioRes.success) this.ios = ioRes.success && ioRes.data ? ioRes.data : []
          else this.$message.error(this.$t('Failed to load I/O status'))
          if (eventsRes.success) this.events = eventsRes.data.events
          else this.$message.error(this.$t('Failed to load events'))
          if (!ioRes.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error has occurred'))
        })
    },
    displayType(_, { uciSection: { type } }) {
      return this.trapTypes[type] || this.$t('N/A')
    },
    displayName(_, { uciSection: { type, name, event } }) {
      if (type === 'gsm') {
        return this.trapNames[name] || this.$t('N/A')
      }
      if (type === 'iotrap') {
        return this.ioPinsObj[name] || this.$t('N/A')
      }
      if (type === 'eventtrap') {
        return this.$eventsOptions.getTypes()[event] || this.$t('N/A')
      }
      if (type === 'chilli') {
        return this.chilliNames[name] || this.$t('N/A')
      }
      return this.$t('N/A')
    },
    isNameSet(section) {
      if (!section.name) return false
      return true
    },
    validateEnable(self) {
      const section = self.uciSection
      if (self.model === '0' || section.enabled !== '1') return
      const requiredEnableOptions = []
      switch (section.type) {
        case 'gsm':
          if (!this.isNameSet(section)) requiredEnableOptions.push(this.$t('Trigger'))
          if (section.name === 'signalstrtrap' && !section.signal) requiredEnableOptions.push(this.$t('Signal strength'))
          break
        case 'iotrap':
          if (!this.isNameSet(section)) requiredEnableOptions.push(this.$t('Trigger'))
          if (!section.state) requiredEnableOptions.push(this.$t('State change'))
          if ((section.name.match('acl') || section.name.match('adc') || section.name.match('pwr')) && !section.from) {
            requiredEnableOptions.push(section.name.match('acl') ? this.$t('Min current') : this.$t('Min voltage'))
          }
          if ((section.name.match('acl') || section.name.match('adc') || section.name.match('pwr')) && !section.to) {
            requiredEnableOptions.push(section.name.match('acl') ? this.$t('Max current') : this.$t('Max voltage'))
          }
          break
        case 'eventtrap':
          if (!section.event) requiredEnableOptions.push(this.$t('Event'))
          if (!section.event_mark) requiredEnableOptions.push(this.$t('Event subtype'))
          break
        case 'chilli':
          if (!this.isNameSet(section)) requiredEnableOptions.push(this.$t('Trigger'))
          break
        default:
          requiredEnableOptions.push(this.$t('Trap type'))
          if (!this.isNameSet(section)) requiredEnableOptions.push(this.$t('Trigger'))
          break
      }
      if (requiredEnableOptions.length === 1) {
        this.$message.error(this.$t('Missing required option: %s').format(requiredEnableOptions))
        self.model = '0'
      }
      if (requiredEnableOptions.length > 1) {
        this.$message.error(this.$t('Missing required options: %s').format(requiredEnableOptions.join(', ')))
        self.model = '0'
      }
    }
  }
}
</script>
