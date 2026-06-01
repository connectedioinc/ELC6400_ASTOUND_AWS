<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="avl"
    :after-load="afterLoad"
    :before-save="beforeSave"
  >
    <tlt-card
      :title="$t('General status')"
      :help="$t('This section displays AVL general status information.')"
    >
      <div class="flex justify-center gap-1">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :card-props="generalStatusData"
        >
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
            class="lg:max-w-fit"
          >
            <cell-row
              v-for="(row, rIdx) in column"
              :key="rIdx"
              :label="row.label"
            >
              <template #value>
                <span :class="row.class">{{ row.value }}</span>
              </template>
            </cell-row>
          </card-cell>
        </tlt-horizontal-card>
      </div>
    </tlt-card>
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/avl/config' }]"
      data-key="avl"
      name="avl"
      :title="$t('AVL server settings')"
      :help="$t('This section is used to configure the main data sending parameters to an AVL server.')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        :help="$t('Turns data sending to an AVL server on or off.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="send_retry"
        :label="$t('Retry on Fail')"
        :help="$t('In case of a failed attempt, retry to send the same data to server later (Retry until successful).')"
      />
      <vuci-form-item-custom
        :uci-section="s"
        name="host_info"
        :label="$t('Host information')"
        inputs="input,input,select"
        :input-props="hostInputProps"
        :headers="[$t('Hostname'), $t('Port'), $t('Protocol')]"
        allow-create
        :write-parse="saveHosts"
        separator=";"
        :maxlines="16"
        :help="$t('Host information, multiple hosts are allowed.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="con_cont"
        :label="$t('Don\'t Contain Connection')"
        :help="$t('Handle each AVL packet iteration as a new connection.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="static_navigation"
        :label="$t('Static Navigation')"
        :help="$t('Stop collecting NMEA data if object is stationary. Ignores data when speed equals to 0 or same as previous coordinates (rounded to 4 decimals).')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="send_empty"
        :label="$t('Send Empty')"
        :help="$t('Send AVL packet with zeros for latitude and longitude if no new data is received within the specified timeout period.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('No Signal Timeout')"
        :help="$t('Set the duration in seconds to wait for new data before beginning to collect zeroed messages. This period is used to determine when signal loss has occurred.')"
        name="timeout_empty"
        initial="2"
        rules="irange(2,86400)"
        required
        :depend="s.send_empty === '1'"
      />
    </vuci-named-section>

    <tlt-table
      :title="$t('Hosts status')"
      :help="$t('This section displays hosts status information.')"
      class="[&>div.card-content]:pb-4"
      :columns="hostStatusColumns"
      :data-source="avlStatusData.hosts"
      :table-actions="['column-list', 'search']"
    >
      <template #connected="{ record }">
        <tlt-dummy-value
          :value="displayConnection(record.connected)"
          :class="getConnectionStyle(record.connected)"
        />
      </template>
    </tlt-table>

    <vuci-typed-section
      type="section"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/avl/main_rules/config' }]"
      data-key="avlMainRule"
      :title="$t('Main rule')"
      :form-methods="['get', 'edit']"
      :help="$t('The Main rule section defines how and when GPS data will be collected and sent to a specified AVL server.')"
      :columns="mainRuleColumns"
      :edit-form="avlRuleEditModal"
    >
      <template #status="{ s }">
        <tlt-icon
          icon="circle"
          :class="getStatusStyle(s.id)"
        />
      </template>
    </vuci-typed-section>

    <vuci-typed-section
      type="avl_rule"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/avl/secondary_rules/config' }]"
      data-key="avlSecondaryRules"
      :title="$t('Secondary rules')"
      :help="
        $t(
          'The Secondary rules section provides you with the possibility to create additional data sending rules. The difference from the main rule is that the secondary rules only send data when the router uses a specified type of WAN and when the digital output is in the specified state.'
        )
      "
      :columns="secondaryRuleColumns"
      :add="beforeAvlRuleAdd"
      :edit-form="avlRuleEditModal"
      :add-title="$t('Add new rule')"
    >
      <template #status="{ s }">
        <tlt-icon
          icon="circle"
          :class="getStatusStyle(s.id)"
        />
      </template>
      <template #wan="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="wan_status"
          :display-value="displayWan"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="wan_status"
          :display-value="displayType"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.wan_status"
          prop="wan_status"
          :label="$t('Wan')"
          :options="addWans"
        />
        <tlt-form-item-select
          v-model="addModel.din_status"
          prop="din_status"
          :label="$t('IO level')"
          :options="addInputs"
        />
        <tlt-form-item-select
          v-model="addModel.priority"
          prop="priority"
          :label="$t('Priority')"
          :options="addPriorities"
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'gps/avl/tavl_rules/config' }]"
      data-key="tavlRules"
      type="tavl_rule"
      :form-methods="addNameOptions.length ? ['get', 'edit', 'create'] : ['get', 'edit']"
      :title="$t('TAVL rules')"
      :help="$t('This section is used to select which router information should be sent to the AVL server.')"
      :table-actions="['column-list', 'search']"
      :columns="tavlColumns"
      :add-title="$t('Add TAVL rule')"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
          :display-value="name => loadPrettyTavlName(ioInfo, name)"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="type"
          :display-value="displayTavlType"
        />
      </template>
      <template #acl="{ s }">
        <vuci-form-item-select
          :depend="s.type === 'acl'"
          :uci-section="s"
          name="acl"
          :options="aclOptions"
        />
      </template>
      <template #enabled="{ s }">
        <tlt-hint>
          <template
            v-if="!isTavlReadonly(ioInfo, s)"
            #hint-box
          >
            {{ $t('Automatically disabled. ADC and ACL cannot be used the same time, you can switch between them') }}
            <router-link to="/services/io/general"> {{ $t('here') }} </router-link>.
          </template>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
            :readonly="isTavlReadonly(ioInfo, s)"
          />
        </tlt-hint>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.name"
          prop="name"
          :label="$t('Name')"
          :options="addNameOptions"
        />
      </template>
      <template #action-design="{ actions }">
        <tlt-button
          button-id="add"
          :readonly="!addNameOptions.length"
          @click="actions.create"
        >
          {{ $t('Add') }}
        </tlt-button>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import avlRuleEdit from './AVLRuleEdit'
import tavlMixin from './TAVLMixin.vue'

export default {
  mixins: [tavlMixin],
  provide() {
    return {
      ioNames: () => this.ioNames,
      filteredIOs: () => this.filteredIOs,
      ioList: () => this.ioInfo
    }
  },
  data() {
    return {
      formData: {},
      avlRuleEditModal: markRaw(avlRuleEdit),
      mainRuleColumns: [
        {
          name: 'status',
          label: this.$t('Status'),
          help: this.$t('Indicates whether a rule is active or not.')
        },
        { name: 'priority', label: this.$t('Rule priority'), help: this.$t('Specifies main rule priority.'), displayFn: this.displayPriority },
        {
          name: 'collect_period',
          label: this.$t('Collect period'),
          help: this.$t('Period (in seconds) for data collection.')
        },
        {
          name: 'saved_records',
          label: this.$t('Min saved records'),
          help: this.$t('Minimal amount of coordinates registered, to send them to server immediately (even if  Send period have not passed yet).')
        },
        {
          name: 'send_period',
          label: this.$t('Send period'),
          help: this.$t('Period (in seconds) for sending collected data to server.')
        }
      ],
      rulePriorities: {
        low: this.$t('Low'),
        high: this.$t('High'),
        panic: this.$t('Panic'),
        security: this.$t('Security')
      },
      inputs: {
        low: this.$t('Low'),
        high: this.$t('High'),
        both: this.$t('Both')
      },
      addInputs: [
        ['low', this.$t('Low')],
        ['high', this.$t('High')],
        ['both', this.$t('Both')]
      ],
      addPriorities: [
        ['low', this.$t('Low')],
        ['high', this.$t('High')],
        ['panic', this.$t('Panic')],
        ['security', this.$t('Security')]
      ],
      cfg_in_out: false,
      secondaryRuleColumns: [
        {
          name: 'status',
          label: this.$t('Status'),
          help: this.$t('Indicates whether a rule is active or not.')
        },
        {
          name: 'wan',
          label: this.$t('Wan'),
          help: this.$t('Specifies which WAN needs to be in use for this configuration to apply.')
        },
        {
          name: 'type',
          label: this.$t('Type'),
          help: this.$t('Specifies type/state of WAN which is needed for configuration to apply.')
        },
        {
          name: 'din_status',
          label: this.$t('Digital input'),
          help: this.$t('Specifies digital input state which is needed for configuration to apply.'),
          displayFn: this.displayInput
        },
        {
          name: 'priority',
          label: this.$t('Rule priority'),
          help: this.$t(
            "The rule's priority. Different priority settings add different flags to event packets, so they can be displayed differently in the receiving system. The router sends data of higher priority first."
          ),
          displayFn: this.displayPriority
        },
        {
          name: 'collect_period',
          label: this.$t('Collect period'),
          help: this.$t('Period (in seconds) for data collection.'),
          displayFn: this.$utils.valueOrBlank
        },
        {
          name: 'saved_records',
          label: this.$t('Min saved records'),
          help: this.$t('Minimal amount of coordinates registered, to send them to server immediately (even if  Send period have not passed yet).'),
          displayFn: this.$utils.valueOrBlank
        },
        {
          name: 'send_period',
          label: this.$t('Send period'),
          help: this.$t('Period (in seconds) for sending collected data to server.'),
          displayFn: this.$utils.valueOrBlank
        },
        {
          name: 'enabled',
          label: this.$t('Enabled')
        }
      ],
      aclOptions: [
        ['current', this.$t('Current')],
        ['percent', this.$t('Percent')]
      ],
      ioInfo: [],
      hasWifi: this.$store.board?.hwinfo?.wifi,
      hostInputProps: [
        {
          prop: 'hostname',
          rules: 'host',
          initial: '192.168.0.1',
          required: true
        },
        {
          prop: 'port',
          initial: '8500',
          rules: 'port',
          required: true
        },
        {
          prop: 'proto',
          initial: 'tcp',
          options: [
            ['tcp', 'TCP'],
            ['udp', 'UDP']
          ]
        }
      ],
      avlStatusData: {},
      hostStatusColumns: [
        { dataIndex: 'hostname', title: this.$t('Hostname') },
        { dataIndex: 'port', title: this.$t('Port') },
        { dataIndex: 'protocol', title: this.$t('Protocol'), displayFn: value => value.toUpperCase() },
        { dataIndex: 'connected', title: this.$t('Connection') },
        { dataIndex: 'successful_count', title: this.$t('Successful count'), displayFn: this.displayNumber },
        { dataIndex: 'failed_count', title: this.$t('Failed count'), displayFn: this.displayNumber },
        { dataIndex: 'collected_record_count', title: this.$t('Collected records'), displayFn: this.displayNumber },
        { dataIndex: 'time_since_last_record_sent', title: this.$t('Time since last record sent'), displayFn: this.displayTime }
      ]
    }
  },
  computed: {
    tavlColumns() {
      const tavl = [
        { name: 'name', label: this.$t('Name'), help: this.$t('Name of Tavl rule.') },
        { name: 'type', label: this.$t('Type'), help: this.$t('Type of Tavl rule.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ]
      const acl = {
        name: 'acl',
        label: this.$t('ACL Property'),
        help: this.$t('Select which property - ampere or percentage is sent to AVL server.')
      }
      if (this.formData.tavlRules && this.formData.tavlRules.some(sec => sec.type === 'acl')) tavl.splice(2, 0, acl)
      return tavl
    },
    ioAcl() {
      return this.ioInfo.find(sec => sec.type === 'acl')
    },
    filteredIOs() {
      return this.ioInfo.filter(io => io.type === 'gpio' && io.direction === 'in').map(io => [io.id, io.name_with_pins])
    },
    ioNames() {
      return [...new Set(this.ioInfo.map(io => [io.id, io.name_with_pins]))]
    },
    addWans() {
      const options = [
        ['mobile_home', this.$t('Mobile home')],
        ['mobile_roaming', this.$t('Mobile roaming')],
        ['mobile_both', this.$t('Mobile both')],
        ['wired', this.$t('Wired')]
      ]
      if (this.hasWifi) options.push(['wifi', this.$t('WiFi')])
      return options
    },
    addNameOptions() {
      return this.getAvailableNames(this.formData.tavlRules || [], this.ioInfo, true)
    },
    generalStatusData() {
      const statusData = this.avlStatusData || {}
      const isStatusGood = statusData?.uptime !== undefined

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error'
          }
        ],
        [{ label: this.$t('Uptime'), value: this.displayTime(statusData?.uptime) }],
        [{ label: this.$t('Current distance'), value: this.displayNumber(statusData?.current_distance) }],
        [{ label: this.$t('Current angle'), value: this.displayNumber(statusData?.current_angle) }],
        [{ label: this.$t('Current accuracy'), value: this.displayNumber(statusData?.current_accuracy) }]
      ]

      return { columns }
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: false, immediate: true })
  },
  methods: {
    saveHosts(values) {
      return values[0] !== '' ? values.join(';') : ''
    },
    updateStatus() {
      return this.$axios
        .get('/api/gps/avl/status')
        .then(({ data }) => {
          this.avlStatusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    afterLoad() {
      if (!this.$store.board.hwinfo.ios) return
      return this.$axios
        .get('/api/io/status')
        .then(response => {
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          if (!response.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))
          this.ioInfo = this.$io.getFilteredPinsInfo(response.data || [])

          const tavlRules = this.formData.tavlRules
          if (tavlRules) {
            for (const tavlRule of tavlRules) {
              if (this.isTavlReadonly(this.ioInfo, tavlRule)) {
                tavlRule.enabled = undefined
              }
            }
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load I/O data'))
        })
        .finally(() => {
          this.$timer.start(this.updateStatus)
        })
    },
    displayTavlName(name) {
      return this.loadPrettyTavlName(this.ioInfo, name)
    },
    displayTavlType(value) {
      return value.toUpperCase()
    },
    displayPriority(value) {
      return this.rulePriorities[value] ? this.rulePriorities[value] : this.$t('N/A')
    },
    displayWan(value) {
      if (value) {
        if (value.includes('mobile')) {
          return this.$t('Mobile')
        } else if (value.includes('wired')) {
          return this.$t('Wired')
        } else if (value.includes('wifi')) {
          return this.$t('WiFi')
        }
      }
      return this.$t('N/A')
    },
    displayType(value) {
      if (value.includes('home')) {
        return this.$t('Home')
      } else if (value.includes('roaming')) {
        return this.$t('Roaming')
      } else if (value.includes('both')) {
        return this.$t('Both')
      }
      return this.$t('N/A')
    },
    displayInput(value) {
      return this.inputs[value] || '-'
    },
    beforeAvlRuleAdd(section) {
      section.io_type = 'gpio'
    },
    beforeSave() {
      if (this.formData.avl[0].host_info.length !== new Set(this.formData.avl[0].host_info).size) return Promise.reject(this.$t('Duplicate host information is not allowed'))
      return Promise.resolve()
    },
    displayConnection(connection) {
      if (connection === undefined) return '-'
      return connection ? this.$t('Up') : this.$t('Down')
    },
    getConnectionStyle(connection) {
      if (connection === undefined) return
      return connection ? 'success' : 'error'
    },
    displayTime(time) {
      return time || time === 0 ? '%t'.format(time) : '-'
    },
    displayNumber(num) {
      return num ?? '-'
    },
    getStatusStyle(sid) {
      return `size-2 ${this.avlStatusData.active_rule === sid ? 'text-theme-text-success' : 'text-theme-text-danger'}`
    }
  }
}
</script>
