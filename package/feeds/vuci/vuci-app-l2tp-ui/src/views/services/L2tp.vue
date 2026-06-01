<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="xl2tpd"
    :after-load="loadData"
    :before-save="onBeforeSave"
  >
    <!-- 'get', 'edit' form-methods because 'addForm' template needs to be one for both typed sections -->
    <vuci-typed-section
      ref="l2tpServerSection"
      :title="$t('L2TP server')"
      :edit-form="editModal"
      type="service"
      :endpoints="[{ endpoint: 'l2tp/server/config' }]"
      :form-methods="['get', 'edit']"
      data-key="l2tp"
      :uci-data="uciData"
      :no-value-text="$t('There are no server instances')"
      :after-delete="onAfterDelete"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="serverCols(s)"
        >
          <name-cell
            :index="index + 1"
            :value="s.description"
          />
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
            :columns="column"
          >
            <cell-row
              v-for="(row, columnIndex) in column"
              :key="columnIndex"
              :label="row.label"
            >
              <template #value>
                <tlt-button
                  v-if="row.onClick"
                  type="text"
                  @click="row.onClick"
                  >{{ row.value }}</tlt-button
                >
                <span
                  v-else
                  :class="row.class"
                  >{{ row.value }}</span
                >
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
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-item-switch
                  class="xl:min-w-max"
                  :uci-section="s"
                  name="enabled"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      ref="l2tpClientSection"
      :title="$t('L2TP clients')"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'l2tp/client/config', sectionFilter: sections => sections['.type'] === 'interface' }, { endpoint: clientLimitReached ? 'l2tp/server/config' : 'l2tp/client/config' }]"
      data-key="l2tp"
      :uci-data="uciData"
      :no-value-text="$t('There are no client instances')"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="clientCols(s)"
        >
          <name-cell
            :index="index + 1"
            :value="s.description"
          />
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
            :columns="column"
          >
            <cell-row
              v-for="(row, columnIndex) in column"
              :key="columnIndex"
              :label="row.label"
            >
              <template #value>
                <tlt-button
                  v-if="row.onClick"
                  type="text"
                  @click="row.onClick"
                  >{{ row.value }}</tlt-button
                >
                <span
                  v-else
                  :class="row.class"
                  >{{ row.value }}</span
                >
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
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-item-switch
                  class="xl:min-w-max"
                  :uci-section="s"
                  name="enabled"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #action-design="{ actions }">
        <tlt-hint :hints="instanceLimitReached ? [{ info: $t('Maximum number of L2TP instances reached.') }] : []">
          <tlt-button
            :readonly="instanceLimitReached"
            button-id="add"
            @click="actions.create"
          >
            {{ $t('Add') }}
          </tlt-button>
        </tlt-hint>
      </template>
    </vuci-typed-section>
    <tlt-logs-modal
      :title="logsTitle"
      :logs="showSingleLog"
      :open="showLogsModal"
      @close="closeModal('showLogsModal')"
    >
    </tlt-logs-modal>
    <tlt-modal
      :open="showServerConfigModal"
      @close="closeModal('showServerConfigModal')"
    >
      <tlt-table
        id="active_clients"
        :columns="clientsColumns"
        :data-source="l2tpStatus[openedInstance?.id]?.peers"
        :no-value-text="$t('There are no active peers')"
        :per-page-text="$t('Active peers per page')"
        pagination
        :title="clientsTitle"
        :table-actions="['column-list', 'search']"
      />
    </tlt-modal>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './L2tpEdit'
import tltLogsModal from '@ui-core/tlt-design/layout/TltLogsModal.vue'

export default {
  components: { tltLogsModal },
  provide() {
    return {
      closeClientEdit: x => this.$refs.l2tpClientSection._closeEdit(x),
      closeServerEdit: x => this.$refs.l2tpServerSection._closeEdit(x),
      overviewUpdateUciData: (data, key) => this.$refs.vuciForm.updateUciData(data, key)
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      formData: {},
      showServerConfigModal: false,
      showLogsModal: false,
      // Uncomment after #13078 issue is done
      // logs: [],
      log: '',
      openedInstance: undefined,
      l2tpStatus: {},
      clientsColumns: [
        { dataIndex: 'username', title: this.$t('Username') },
        { dataIndex: 'local_ip', title: this.$t('Local IP Address') },
        { dataIndex: 'remote_ip', title: this.$t('Remote IP Address') },
        { dataIndex: 'rx', title: this.$t('RX Data') },
        { dataIndex: 'tx', title: this.$t('TX Data') },
        { dataIndex: 'uptime', title: this.$t('Uptime') }
      ],
      statusDisplayValues: {
        0: this.$t('Disconnected'),
        1: this.$t('Connected'),
        2: this.$t('Up'),
        3: this.$t('Down'),
        4: this.$t('Disabled')
      },
      statusColors: {
        0: 'error',
        1: 'success',
        2: 'success',
        3: 'error',
        default: 'disabled'
      },
      typeOptions: [
        ['interface', this.$t('Client')],
        ['service', this.$t('Server')]
      ]
    }
  },
  timers: {
    checkStatus: { time: 6000, autostart: true, immediate: true, repeat: true }
    // Uncomment after #13078 issue is done
    // updateLogs: { time: 6000, autostart: false, immediate: true, repeat: true }
  },
  computed: {
    logsTitle() {
      return this.$t('%s logs').format(`"${this.openedInstance?.description}"`)
    },
    clientsTitle() {
      return this.$t(`Active clients: %s`).format(`"${this.openedInstance?.description}"`)
    },
    serverLimitReached() {
      return this.formData.l2tp?.filter(instance => instance['.type'] === 'service').length >= 1
    },
    clientLimitReached() {
      return this.formData.l2tp?.filter(instance => instance['.type'] === 'interface').length >= 5
    },
    instanceLimitReached() {
      return this.serverLimitReached && this.clientLimitReached
    },
    // Uncomment after #13078 issue is done
    showSingleLog() {
      return this.l2tpStatus[this.openedInstance?.id]?.logs || ''
    }
  },
  methods: {
    onBeforeSave() {
      const enabledInstances = this.formData.l2tp.filter(instance => instance['.type'] === 'interface' && instance.defaultroute === '1' && instance.enabled === '1')
      if (enabledInstances.length > 1) {
        return Promise.reject(this.$t('Only one "Client" instance with enabled "Default route" can be enabled at a time.'))
      }
      return Promise.resolve()
    },
    openModal(instance, showModal) {
      this.openedInstance = instance
      this[showModal] = true
    },
    closeModal(showModal) {
      this[showModal] = false
    },
    serverCols(item) {
      const data = this.l2tpStatus[item.id]
      return {
        item,
        columns: [
          [
            { label: this.$t('Status'), value: this.displayStatus(item.id), class: this.parseStatusColor(data?.status) },
            { label: this.$t('Local IP Address'), value: this.displayLocalIpAddress(item.id) },
            { label: this.$t('Remote IP Address'), value: this.displayServerRemoteIpAddress(item.id) }
          ],
          [
            { label: this.$t('Active clients'), value: this.displayClients(item.id), onClick: () => this.openModal(item, 'showServerConfigModal') },
            { label: this.$t('Logs'), value: this.displayLogs(item.id), onClick: () => this.openModal(item, 'showLogsModal') }
            // Uncomment after #13078 issue is done
            // { label: this.$t('Logs'), value: this.displayLogs(item.id), onClick: () => this.openLogsModal(item.id, 'showLogsModal') }
          ],
          [
            { label: this.$t('RX'), value: this.l2tpStatus[item.id]?.rx ? '%MB'.format(this.displayRx(item.id)) : '-' },
            { label: this.$t('TX'), value: this.l2tpStatus[item.id]?.tx ? '%MB'.format(this.displayTx(item.id)) : '-' }
          ],
          [{ label: this.$t('Uptime'), value: this.displayUptime(item.id) }]
        ]
      }
    },
    clientCols(item) {
      const data = this.l2tpStatus[item.id]
      return {
        item,
        columns: [
          [
            { label: this.$t('Status'), value: this.displayStatus(item.id), class: this.parseStatusColor(data?.status) },
            { label: this.$t('Server'), value: this.displayServer(item.id) },
            { label: this.$t('Username'), value: this.displayUsername(item.id) }
          ],
          [
            { label: this.$t('Local IP Address'), value: this.displayLocalIpAddress(item.id) },
            { label: this.$t('Remote IP Address'), value: this.displayClientRemoteIpAddress(item.id) },
            { label: this.$t('Logs'), value: this.displayLogs(item.id), onClick: () => this.openModal(item, 'showLogsModal') }
            // Uncomment after #13078 issue is done
            // { label: this.$t('Logs'), value: this.displayLogs(item.id), onClick: () => this.openLogsModal(item.id) }
          ],
          [
            { label: this.$t('RX'), value: this.l2tpStatus[item.id]?.rx ? '%MB'.format(this.displayRx(item.id)) : '-' },
            { label: this.$t('TX'), value: this.l2tpStatus[item.id]?.tx ? '%MB'.format(this.displayTx(item.id)) : '-' }
          ],
          [{ label: this.$t('Uptime'), value: this.displayUptime(item.id) }]
        ]
      }
    },
    // Uncomment after #13078 issue is done
    // displayLogs(itemId) {
    //   return !this.logs[itemId]?.data?.response ? '0' : this.logs[itemId].data.response.split(/\n/).length - 1
    // },
    displayLogs(itemId) {
      return !this.l2tpStatus[itemId]?.logs ? '0' : this.l2tpStatus[itemId].logs.split(/\n/).length - 1
    },
    displayUsername(name) {
      return this.l2tpStatus[name]?.username || '-'
    },
    displayServer(name) {
      return this.l2tpStatus[name]?.server || '-'
    },
    displayStatus(name) {
      return this.l2tpStatus[name]?.status ? this.statusDisplayValues[this.l2tpStatus[name].status] : '-'
    },
    parseStatusColor(code) {
      return this.statusColors[code] || this.statusColors.default
    },
    displayLocalIpAddress(name) {
      return this.l2tpStatus[name]?.local_ip || '-'
    },
    displayServerRemoteIpAddress(name) {
      return this.l2tpStatus[name]?.start_ip && this.l2tpStatus[name]?.end_ip ? this.l2tpStatus[name]?.start_ip + ' - ' + this.l2tpStatus[name]?.end_ip : '-'
    },
    displayClientRemoteIpAddress(name) {
      return this.l2tpStatus[name]?.remote_ip || '-'
    },
    displayRx(name) {
      return this.l2tpStatus[name].rx
    },
    displayTx(name) {
      return this.l2tpStatus[name].tx
    },
    displayUptime(name) {
      return this.l2tpStatus[name]?.uptime || '-'
    },
    displayClients(name) {
      return this.l2tpStatus[name]?.clients_connected || this.l2tpStatus[name]?.clients_all ? this.l2tpStatus[name]?.clients_connected + '/' + this.l2tpStatus[name]?.clients_all : '0/0'
    },
    checkStatus() {
      return this.$axios
        .get('/api/l2tp/status/')
        .then(({ data }) => {
          Object.keys(data).forEach(key => {
            if ('peers' in data[key]) {
              data[key].peers.forEach((x, i) => {
                data[key].peers[i].tx = '%MB'.format(x.tx)
                data[key].peers[i].rx = '%MB'.format(x.rx)
              })
            }
          })
          this.l2tpStatus = {}
          Object.keys(data).forEach(key => (this.l2tpStatus[key] = data[key]))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load L2TP status data'))
        })
    },
    // Uncomment after #13078 issue is done
    // updateLogs() {
    //   const logRequests = this.formData.l2tp.map(instance => `/api/l2tp/log/${instance.id}`)
    //   return this.$axios
    //     .bulkGet(logRequests)
    //     .then(data => {
    //       this.logs = {}
    //       Object.keys(data).forEach((key) => {
    //         const validError = !data[key].success && data[key]?.errors[0].code !== 122
    //         if (!validError && this.formData.l2tp?.[key]) this.logs[this.formData.l2tp[key].id] = data[key]
    //         else if (validError) this.$message.error(this.$t('Failed to load log for %s instance').format(this.formData.l2tp[key].id))
    //       })
    //     })
    //     .catch(() => {
    //       this.$message.error(this.$t('Failed to load logs'))
    //     })
    // },

    // Uncomment after #13078 issue is done
    // loadData(form) {
    //   return this.$axios
    //     .get('/api/l2tp/users/config')
    //     .then((data) => {
    //       if (!data.success) this.$message.error(this.$t('Failed to load users'))
    //       this.updateLogs()
    //       return { users: users?.data || [] }
    //     })
    //     .catch(() => {
    //       this.$message.error(this.$t('Failed to load users'))
    //     })
    //     .finally(() => {
    //       this.$timer.start('updateLogs')
    //     })
    // },
    loadData() {
      return this.$axios
        .get('/api/l2tp/users/config')
        .then(data => {
          return { users: data?.data || [] }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load users'))
        })
      // Uncomment after #13078 issue is done
      // this.$timer.start('updateLogs')
      // .finally(() => {
      // })
    },
    onAfterDelete(section, uciData) {
      if (section['.type'] !== 'service') return
      uciData.users = []
    }
  }
}
</script>
