<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="gps"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :endpoints="[{ endpoint: 'gps/https/config' }]"
      :uci-data="uciData"
      data-key="httpsServer"
      name="https"
      :title="$t('HTTPS/HTTP server settings')"
    >
      <tlt-form-model-item
        element-id="status"
        :help="$t('Status of GPS service, whether it is currently running. If it is active, it will also show how long it has been running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="isStatusGood ? $t('Up') : $t('Down')"
          :class="isStatusGood ? 'success' : 'error'"
        />
        <tlt-dummy-value
          v-if="isStatusGood"
          :value="displayUptime(httpsStatusData?.uptime)"
        />
      </tlt-form-model-item>
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enabled')"
        :help="$t('Enable NMEA forwarding to remote server in HTTPS protocol.')"
        name="enabled"
      />
      <vuci-form-item-list
        :uci-section="s"
        :label="$t('URL')"
        :help="$t('URLs of the remote server (ex. example.com/xxxx).')"
        name="hostname"
        placeholder="0.0.0.0"
        rules="url"
        :maxlines="16"
        :required="s.enabled === '1'"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Interval')"
        :help="$t('Interval on which collected NMEA sentences should be forwarded.')"
        name="interval"
        placeholder="60"
        initial="60"
        rules="irange(1,4294967296)"
        :required="s.enabled === '1'"
      />
    </vuci-named-section>
    <tlt-table
      :title="$t('Servers status')"
      :help="$t('This section displays remote servers status information.')"
      class="[&>div.card-content]:pb-4"
      :columns="serversStatusColumns"
      :data-source="httpsStatusData.servers"
      :table-actions="['column-list', 'search']"
    >
    </tlt-table>
    <vuci-typed-section
      data-key="httpTavl"
      :endpoints="[{ endpoint: 'gps/https/tavl_rules/config' }]"
      :uci-data="uciData"
      :form-methods="addNameOptions.length ? ['get', 'edit', 'create'] : ['get', 'edit']"
      :title="$t('TAVL rules')"
      :table-actions="['column-list', 'search']"
      type="https_tavl_rule"
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
          :display-value="loadTavlType"
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
          :readonly="addNameOptions.length == 0"
          @click="actions.create"
        >
          {{ $t('Add') }}
        </tlt-button>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import tavlMixin from './TAVLMixin.vue'

export default {
  mixins: [tavlMixin],
  data() {
    return {
      tavlNames: [],
      ioInfo: [],
      ioAcl: {},
      formData: {},
      aclOptions: [
        ['current', this.$t('Current')],
        ['percent', this.$t('Percent')]
      ],
      httpsStatusData: {},
      serversStatusColumns: [
        { dataIndex: 'url', title: this.$t('URL') },
        { dataIndex: 'successful_count', title: this.$t('Successful count'), displayFn: this.displayNumber },
        { dataIndex: 'failed_count', title: this.$t('Failed count'), displayFn: this.displayNumber }
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
      if (this.formData.httpTavl && this.formData.httpTavl.some(sec => sec.type === 'acl')) tavl.splice(2, 0, acl)
      return tavl
    },
    addNameOptions() {
      return this.getAvailableNames(this.formData.httpTavl || [], this.ioInfo, false)
    },
    isStatusGood() {
      return this.httpsStatusData?.uptime !== undefined
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: false, immediate: true })
  },
  methods: {
    loadTavlType(value) {
      return value.toUpperCase()
    },
    loadName(value) {
      return this.loadPrettyTavlName(this.ioInfo, value)
    },
    afterLoad() {
      if (!this.$store.board.hwinfo.ios) return
      return this.$axios
        .get('/api/io/status')
        .then(response => {
          // this is a nasty temporary workaround, remove it when io pin info is in board.json and read from board.json
          if (!response.data)
            this.$notification.error(this.$t('Input/output functionality is booting, page will have missing input/output functionality, please wait a few minutes and refresh the page to fix it.'))
          const ioInfo = response.data || []
          this.ioInfo = this.$io.getFilteredPinsInfo(ioInfo)
          this.ioAcl = ioInfo.find(sec => sec.type === 'acl')

          const tavlRules = this.formData.httpTavl
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
    updateStatus() {
      return this.$axios
        .get('/api/gps/https/status')
        .then(({ data }) => {
          this.httpsStatusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    },
    displayNumber(num) {
      return num ?? '-'
    }
  }
}
</script>
