<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_client"
    :after-load="loadData"
  >
    <tlt-card
      :title="$t('General status')"
      :help="$t('This section displays OPC UA Client general status information.')"
      class="[&>div.card-content]:pb-4"
    >
      <tlt-form-model-item
        :help="$t('Displays the current status of the service. Shows whether the service is running and, if active, indicates the duration it has been running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="isStatusGood ? $t('Up') : $t('Down')"
          :class="isStatusGood ? 'success' : 'error'"
        />
        <tlt-dummy-value
          v-if="isStatusGood"
          :value="displayUptime(opcuaStatusData.uptime)"
        />
      </tlt-form-model-item>
    </tlt-card>
    <vuci-typed-section
      :uci-data="uciData"
      type="server"
      :title="$t('OPC UA servers')"
      data-key="server"
      :endpoints="[{ endpoint: 'opcua/server/config' }]"
      :add-title="$t('Add new server')"
      :edit-form="editServerModal"
      :after-delete="onServerDelete"
      :global-settings-form="opcuaGlobal"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="serverOverviewColumns(s)"
        >
          <name-cell
            class="lg:w-[14%]"
            :index="index + 1"
            :value="s.name || '-'"
          />
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
          >
            <cell-row
              v-for="(row, rIdx) in column"
              :key="rIdx"
              :label="row.label"
            >
              <template #value>
                <div class="flex items-center gap-1">
                  <span :class="row.class">{{ row.value }}</span>
                  <tlt-hint
                    v-if="row.errorHint"
                    :hints="[{ info: row.errorHint }]"
                  >
                    <tlt-icon
                      icon="error"
                      class="text-theme-text-danger size-5"
                    />
                  </tlt-hint>
                </div>
              </template>
            </cell-row>
          </card-cell>
          <action-cell>
            <cell-row
              :label="$t('Test')"
              only-mobile-label
            >
              <template #value>
                <tlt-hint :hints="getServerTestHint(s)">
                  <opcua-test
                    :uci-section="s"
                    :get-data="getServerTestData"
                    endpoint="/api/opcua/actions/test_server"
                    :readonly="getServerTestHint(s).length > 0"
                  />
                </tlt-hint>
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  class="xl:min-w-max"
                  :actions="actions"
                />
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <vuci-form-item-switch
              class="lg:min-w-max mb-0"
              :uci-section="s"
              name="enabled"
              :readonly="getServerEnableHint(s).length > 0"
              :hints="getServerEnableHint(s)"
            />
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Server name')"
          prop="name"
          :rules="['uciname', v => instanceExists(v, 'server'), serverLimit]"
          required
        />
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      :uci-data="uciData"
      type="value_group"
      :title="$t('OPC UA value groups')"
      data-key="group"
      :endpoints="[{ endpoint: 'opcua/group/config' }]"
      :add-title="$t('Add new value group')"
      :edit-form="editGroupModal"
      :after-delete="onGroupDelete"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="groupOverviewColumns(s)"
        >
          <name-cell
            class="lg:w-[14%]"
            :index="index + 1"
            :value="s.name || '-'"
          />
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
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
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  class="xl:min-w-max"
                  :actions="actions"
                />
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <vuci-form-item-switch
              class="lg:min-w-max mb-0"
              :uci-section="s"
              name="enabled"
              :readonly="getEnableGroupHint(s).length > 0"
              :hints="getEnableGroupHint(s)"
            />
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.name"
          :label="$t('Value group name')"
          prop="name"
          :rules="['uciname', v => instanceExists(v, 'group'), groupLimit]"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import ServerEdit from './OpcuaServerEdit'
import ValueGroupEdit from './OpcuaGroupEdit'
import opcuaGlobal from './OpcuaGlobal'
import OpcuaTest from './OpcuaTest'
import * as opcuaUtils from './opcuaUtils'

const MAX_SERVERS = 10
const MAX_VALUE_GROUPS = 20

export default {
  components: { OpcuaTest },
  provide() {
    return {
      form: () => this.globalEnabled
    }
  },
  data() {
    return {
      getServerTestData: opcuaUtils.getServerTestData,
      editServerModal: markRaw(ServerEdit),
      editGroupModal: markRaw(ValueGroupEdit),
      opcuaGlobal: markRaw(opcuaGlobal),
      formData: {},
      globalEnabled: { globalStatus: 'firstLoad' },
      stateChanged: false,
      infoMessage: this.$t('%s service is disabled, navigate to global settings configuration to enable it.').format('OPC UA'),
      opcuaStatusData: {}
    }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen']),
    isStatusGood() {
      return this.opcuaStatusData.uptime !== undefined
    }
  },
  watch: {
    'globalEnabled.globalStatus': function (value, oldValue) {
      if (oldValue === 'firstLoad') {
        if (!value) {
          this.$notification.info(this.infoMessage)
        }
      } else {
        this.stateChanged = true
      }
    },
    // Note: second state is watched because alert should only be created when modal is fully closed
    modalOpen(value) {
      if (!value && this.stateChanged) {
        this.stateChanged = false
        if (!this.globalEnabled.globalStatus) this.$notification.info(this.infoMessage)
        else this.$notification.remove(this.infoMessage)
      }
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: false, immediate: true })
  },
  methods: {
    updateStatus() {
      const requests = ['/api/opcua/server/status', '/api/opcua/group/status']
      return this.$axios
        .bulkGet(requests)
        .then(([serverData, groupData]) => {
          if (serverData.success) {
            this.opcuaStatusData.uptime = serverData.data.uptime
            this.formData.server.forEach(server => {
              server.content = serverData.data.servers?.find(s => s.id === server.id)
            })
          } else {
            this.$message.error(this.$t('Failed to load to server status data'))
          }

          if (groupData.success) {
            this.formData.group.forEach(group => {
              group.content = groupData.data.value_groups?.find(g => g.id === group.id)
            })
          } else {
            this.$message.error(this.$t('Failed to load to group status data'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    loadData(self) {
      const serverEndpoints = self.server.map(server => `/api/opcua/server/${server.id}/nodes/config`)
      const groupEndpoints = self.group.map(group => `/api/opcua/group/${group.id}/values/config`)
      const requests = ['/api/opcua/global', ...serverEndpoints, ...groupEndpoints]
      return this.$axios
        .bulkGet(requests)
        .then(res => {
          const global = res.shift()
          if (global.success) {
            this.globalEnabled.globalStatus = global.data.enabled === '1'
          } else {
            this.$message.error(this.$t('Failed to load OPC UA global data'))
          }
          const sections = res.map(({ data }) => data).flat()
          const serverNodes = sections.filter(obj => obj['.type'].split('_')[0] === 'server')
          const groupValue = sections.filter(obj => obj['.type'].split('_')[0] === 'value')
          return { serverNodes, groupValue }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred.'))
        })
        .finally(() => {
          this.$timer.start(this.updateStatus)
        })
    },
    instanceExists(val, key) {
      if (this.formData[key].some(o => o.name === val)) {
        return { isValid: false, message: this.$t("Instance '%s' already exists").format(val) }
      }
      return { isValid: true }
    },
    onServerDelete(section, uciData) {
      const deletedNodes = uciData.serverNodes.filter(e => e['.type'] === `server_node_${section.id}`).map(e => e.id)
      uciData.groupValue = uciData.groupValue.map(value => ({
        ...value,
        enabled: deletedNodes.includes(value.server_node) ? '0' : value.enabled
      }))
      uciData.serverNodes = uciData.serverNodes.filter(e => e['.type'] !== `server_node_${section.id}`)
    },
    onGroupDelete(section, uciData) {
      uciData.groupValue = uciData.groupValue.filter(e => e['.type'] !== `value_${section.id}`)
    },
    serverLimit() {
      return {
        isValid: this.formData.server.length < MAX_SERVERS,
        message: this.$t('Server limit was reached (%s max)').format(MAX_SERVERS)
      }
    },
    groupLimit() {
      return {
        isValid: this.formData.group.length < MAX_VALUE_GROUPS,
        message: this.$t('Group limit was reached (%s max)').format(MAX_VALUE_GROUPS)
      }
    },

    getServerEnableHint(section) {
      if (section.enabled !== '1') {
        const serverNodes = this.formData?.serverNodes || []
        const serverNodesByServer = serverNodes.filter(node => node['.type'] === `server_node_${section.id}`)

        if (!serverNodesByServer.every(node => opcuaUtils.isServerNodeValid(node))) {
          return [{ info: this.$t('Cannot enable instance when required values in server nodes are missing. Navigate to edit modal to fill the missing values') }]
        } else if (!opcuaUtils.isServerValid(section)) {
          return [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }]
        }
      }

      return []
    },
    getServerTestHint(server) {
      return !opcuaUtils.isServerValid(server) ? [{ info: this.$t('Cannot test server when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },

    getEnableGroupHint(section) {
      if (section.enabled !== '1' && !opcuaUtils.isGroupValid(section)) {
        return [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }]
      }
      return []
    },

    aggregateStats(arr) {
      if (!arr) return {}
      const stats = arr.reduce(
        (acc, curr) => {
          acc.successfulLastReads += curr.was_last_read_successful
          acc.successful += curr.successful_count || 0
          acc.failed += curr.failed_count || 0
          return acc
        },
        { successfulLastReads: 0, successful: 0, failed: 0 }
      )
      stats.failedLastReads = arr.length - stats.successfulLastReads
      return stats
    },
    displaySessionState(state) {
      const stateMessages = {
        1: this.$t('Closed'),
        2: this.$t('Created'),
        3: this.$t('Activated')
      }
      return stateMessages[state] || '-'
    },
    displayChannelState(state) {
      const stateMessages = {
        1: this.$t('Closed'),
        2: this.$t('Listening'),
        3: this.$t('Connecting'),
        4: this.$t('Connected'),
        5: this.$t('Open')
      }
      return stateMessages[state] || '-'
    },
    getStatusError(errorCode) {
      const errorMessages = {
        1: this.$t('Failed to start server'),
        2: this.$t('Could not establish a network connection to remote server'),
        3: this.$t('The URI specified in the ApplicationDescription does not match the URI in the certificate'),
        4: this.$t('The certificate has expired or is not yet valid'),
        5: this.$t('The HostName used to connect to a server does not match a HostName in the certificate')
      }
      return errorMessages[errorCode] || (errorCode ? this.$t('An unexpected error occurred') : '')
    },
    serverOverviewColumns(item) {
      const statusData = item.content || {}

      const connectStatusError = this.getStatusError(statusData.connect_status)
      const isStatusGood = Object.keys(statusData).length && !connectStatusError
      const serverNodeStats = this.aggregateStats(statusData.server_nodes)

      const columns = [
        [{ label: this.$t('Channel state'), value: this.displayChannelState(statusData.channel_state) }],
        [{ label: this.$t('Session state'), value: this.displaySessionState(statusData.session_state) }],
        [
          { label: this.$t('Recent successful requests'), value: this.displayNumber(serverNodeStats.successfulLastReads, isStatusGood) },
          { label: this.$t('Recent failed requests'), value: this.displayNumber(serverNodeStats.failedLastReads, isStatusGood) }
        ]
      ]

      return { item, columns }
    },
    groupOverviewColumns(item) {
      const statusData = item.content || {}

      const isStatusGood = !!Object.keys(statusData).length
      const valueStats = this.aggregateStats(statusData.values)

      const columns = [
        [{ label: this.$t('Successful count'), value: this.displayNumber(statusData.successful_count) }],
        [{ label: this.$t('Failed count'), value: this.displayNumber(statusData.failed_count) }],
        [{ label: this.$t('Successful values'), value: this.displayNumber(valueStats.successful, isStatusGood) }],
        [{ label: this.$t('Failed values'), value: this.displayNumber(valueStats.failed, isStatusGood) }]
      ]

      return { item, columns }
    },
    displayNumber(num, isStatusGood = true) {
      return isStatusGood && (num || num === 0) ? num : '-'
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    }
  }
}
</script>
