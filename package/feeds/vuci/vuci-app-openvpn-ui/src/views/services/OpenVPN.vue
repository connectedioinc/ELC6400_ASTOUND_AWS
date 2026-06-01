<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="openvpn"
    bulk-request
    :after-load="loadData"
    :before-save="onBeforeSave"
    async-load
  >
    <vuci-typed-section
      type="openvpn"
      :title="$t('Server')"
      :form-methods="['get', 'edit']"
      :endpoints="[{ endpoint: 'openvpn/config', sectionFilter: section => section.type !== 'client' }]"
      :edit-form="editModal"
      data-key="openVpn"
      :after-delete="deleteClients"
      :uci-data="uciData"
      :no-value-text="$t('There are no server instances')"
      :error-handlers="{
        edit: handleEditError
      }"
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
            :value="s.name"
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
                  :disabled="false"
                  type="text"
                  @click="row.onClick"
                  >{{ row.value }}</tlt-button
                >
                <div
                  v-else
                  class="flex gap-2 min-w-0 items-center"
                >
                  <span
                    class="truncate"
                    :class="row.class"
                    >{{ row.value }}</span
                  >
                  <tlt-hint
                    v-if="row.hint?.hint.length"
                    :hints="row.hint?.hint"
                    class="shrink-0"
                  >
                    <tlt-icon
                      icon="info"
                      class="text-theme-text-info size-5"
                    />
                  </tlt-hint>
                </div>
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
            <tlt-button
              :ref="`moreButton-${s.id}`"
              button-id="more-btn"
              type="text"
              @click="moreDropdownOpen[s.id] = !moreDropdownOpen[s.id]"
            >
              <tlt-icon
                icon="chevron"
                class="size-5"
                :class="moreDropdownOpen[s.id] ? '-rotate-90' : '-rotate-270'"
              />
              {{ $t('More') }}
            </tlt-button>
            <tlt-dropdown
              v-model:open="moreDropdownOpen[s.id]"
              :options="getMoreOptions(s)"
              :target="$refs[`moreButton-${s.id}`]"
              placement="bottom-end"
              size="large"
              @option-click="option => option.callback()"
              @outside-click="moreDropdownOpen[s.id] = false"
            />
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
                  name="enable"
                  @change="validateEnable"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
    <vuci-typed-section
      ref="clientSection"
      :title="$t('Client')"
      :edit-form="editModal"
      type="openvpn"
      :endpoints="clientEndpointData"
      data-key="openVpn"
      :add-validate="addValidate"
      :uci-data="uciData"
      :no-value-text="$t('There are no client instances')"
      :error-handlers="{
        edit: handleEditError
      }"
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
            :value="s.name"
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
                  :disabled="false"
                  type="text"
                  @click="row.onClick"
                  >{{ row.value }}</tlt-button
                >
                <div
                  v-else
                  class="flex gap-2 min-w-0 items-center"
                >
                  <span
                    class="truncate"
                    :class="row.class"
                    >{{ row.value }}</span
                  >
                  <tlt-hint
                    v-if="row.hint?.hint.length"
                    :hints="row.hint?.hint"
                    class="shrink-0"
                  >
                    <tlt-icon
                      icon="info"
                      class="text-theme-text-info size-5"
                    />
                  </tlt-hint>
                  <tlt-hint v-if="row.value === statusDisplayValues[6]">
                    <template #hintBox>
                      <div class="flex flex-col gap-4">
                        {{ $t('The tunnel connection status cannot be detected due to the current configuration. Possible reasons:') }}
                        <ul class="space-y-4">
                          <li>
                            {{ $t('The script-security parameter value is lower than 2.') }}
                          </li>
                          <li>
                            {{
                              $t(
                                'The persist-tun option is used, which does not reopen the TUN/TAP device (for example, during a ping-restart) and prevents the status detection script from executing.'
                              )
                            }}
                          </li>
                        </ul>
                      </div>
                    </template>
                    <tlt-icon
                      icon="warning"
                      class="text-theme-text-warning size-5"
                    />
                  </tlt-hint>
                </div>
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
                >
                  <template #delete="{ delSection }">
                    <tlt-hint :hints="showDeleteHint(s)">
                      <tlt-button
                        button-id="delete"
                        type="text"
                        color="error"
                        :readonly="!!showDeleteHint(s).length"
                        @click="delSection(s.id)"
                        >{{ $t('Delete') }}</tlt-button
                      >
                    </tlt-hint>
                  </template>
                </vuci-form-edit-delete>
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <tlt-hint
              :hints="showExportHint(s)"
              align-right
            >
              <tlt-button
                :readonly="!!showExportHint(s).length"
                button-id="export_client_config"
                type="text"
                icon-left="upload-export"
                action="add"
                @click="exportConfig(s)"
                >{{ $t('Export') }}</tlt-button
              >
            </tlt-hint>
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
                  name="enable"
                  @change="validateEnable"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
    <tlt-logs-modal
      :title="$t('&quot;%s&quot; logs').format(openvpnStatus[openedInstance]?.name)"
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
        :data-source="openvpnStatus[openedInstance]?.clients"
        :no-value-text="$t('There are no active clients')"
        :per-page-text="$t('Active clients per page')"
        pagination
        :title="$t('Active clients: &quot;%s&quot;').format(openvpnStatus[openedInstance]?.name)"
      />
    </tlt-modal>
    <tlt-modal
      :open="showGenerateClientModal"
      :nav-bar="[$t('Generate client configuration')]"
      @close="closeGenerateClientModal"
    >
      <generate-client-config
        v-model:open="showGenerateClientModal"
        :server-id="serverID"
        :missing-fields="missingFieldsForClient"
        :certificates="certificatesStore.generatedCertificates"
        @generated="showGenerateClientModal = false"
      />
    </tlt-modal>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './OpenVPNEdit.vue'
import tltLogsModal from '@ui-core/tlt-design/layout/TltLogsModal.vue'
import GenerateClientConfig from './GenerateClientConfig.vue'
import { useCertificatesStore } from '@/stores/certificates'

export default {
  components: { tltLogsModal, GenerateClientConfig },
  provide() {
    return {
      formOptions: this.getFormOptions,
      warningMessages: () => this.warningMessages,
      setWarningMessages: messages => (this.warningMessages = messages)
    }
  },
  data() {
    return {
      formData: {},
      formOptions: {
        certificates: [],
        interfaces: [],
        networks: [],
        ip6addresses: []
      },
      ddns: [],
      warningMessages: [],
      showServerConfigModal: false,
      showLogsModal: false,
      logs: [],
      openedInstance: undefined,
      openvpnStatus: {},
      editModal: markRaw(EditForm),
      statusDisplayValues: {
        0: this.$t('Disconnected'),
        1: this.$t('Connected'),
        2: this.$t('Up'),
        3: this.$t('Down'),
        4: this.$t('Disabled'),
        5: this.$t('Checking connection'),
        6: this.$t('Undetectable')
      },
      statusColors: {
        0: 'error',
        1: 'success',
        2: 'success',
        3: 'error',
        4: 'disabled',
        5: 'text-theme-text-warning',
        6: 'text-theme-text-warning',
        default: 'error'
      },
      typeOptions: [
        ['server', this.$t('Server')],
        ['client', this.$t('Client')]
      ],
      updateStarted: false,
      editErrors: {
        1: instances => this.$t('Private key decryption password is required for: %s').format(instances.join(', ')),
        6: instances => this.$t('PKCS #12 passphrase is required for: %s').format(instances.join(', ')),
        7: instances => this.$t('Provided PKCS #12 passphrase is invalid for: %s').format(instances.join(', ')),
        default: this.$t('An unexpected error occurred')
      },
      clientEndpointData: [],
      moreDropdownOpen: {},
      showGenerateClientModal: false,
      missingFieldsForClient: []
    }
  },
  timers: {
    checkStatus: { time: 6000, autostart: true, immediate: true, repeat: true }
  },
  computed: {
    serverID() {
      return this.formData.openVpn?.find(i => i.type === 'server')?.id || ''
    },
    certificatesStore() {
      return useCertificatesStore()
    },
    showSingleLog() {
      return this.openvpnStatus[this.openedInstance]?.logs || ''
    },
    clientsColumns() {
      const columns = [
        { dataIndex: 'name', title: this.$t('Common name') },
        { dataIndex: 'ip', title: this.$t('Remote IP Address') },
        { dataIndex: 'rx', title: this.$t('RX Data') },
        { dataIndex: 'tx', title: this.$t('TX Data') },
        { dataIndex: 'uptime', title: this.$t('Uptime') }
      ]
      if (this.openvpnStatus[this.openedInstance]?.protocol === 'tap') {
        columns.splice(1, 0, { dataIndex: 'vpn_mac', title: this.$t('MAC address') })
      } else {
        columns.splice(1, 0, { dataIndex: 'vpn_ip', title: this.$t('Local IP Address') }, { dataIndex: 'vpn_ip6', title: this.$t('Local IPv6 Address') })
      }
      return columns
    }
  },
  mounted() {
    this.clientEndpointData = [{ endpoint: 'openvpn/config', sectionFilter: section => section.type === 'client' }]
  },
  methods: {
    getMoreOptions(s) {
      return [
        {
          label: this.$t('Export'),
          icon: 'upload-export',
          id: 'export',
          disabled: !!this.showExportHint(s).length,
          class: 'whitespace-nowrap text-theme-text-primary font-semibold',
          hints: this.showExportHint(s),
          callback: () => this.exportConfig(s)
        },
        {
          label: this.$t('Generate client configuration'),
          icon: 'client-config',
          id: 'generate-client',
          disabled: !!this.showExportHint(s).length,
          class: 'whitespace-nowrap text-theme-text-primary font-semibold',
          callback: () => this.openGenerateClientModal(s)
        }
      ]
    },
    addValidate() {
      const serverCount = this.formData.openVpn.filter(i => i.type === 'server').length
      const clientCount = this.formData.openVpn.filter(i => i.type === 'client').length
      if (serverCount === 0 && clientCount === 20) {
        return {
          valid: false,
          message: this.$t('Maximum limit of 20 client instances have been reached. To create a server instance, please remove or edit one of your existing client instances first.')
        }
      }
      const maxCount = serverCount >= 1 && clientCount >= 20
      if (!maxCount) return { valid: true }
      return {
        valid: false,
        message: this.$t('Maximum number of OpenVPN instances has been reached')
      }
    },
    parseHint(name, vals, isWarningHint = false) {
      if (isWarningHint) {
        const uniqueMessages = new Set(this.warningMessages.filter(message => message.source.startsWith(name)).map(message => message.message))
        return { hint: Array.from(uniqueMessages).map(message => ({ info: message })) }
      }
      const hintContent = []
      vals.forEach(val => {
        if (this.openvpnStatus[name]?.[val.key]) {
          hintContent.push({
            title: val.title,
            info: this.openvpnStatus[name][val.key]
          })
        }
      })
      return { hint: hintContent.length > 1 ? hintContent : [] }
    },
    getFormOptions() {
      return {
        ...this.formOptions,
        certificates: this.certificatesStore.generatedCertificates
      }
    },
    openModal(name, showModal) {
      this.openedInstance = name
      this[showModal] = true
    },
    closeModal(showModal) {
      this[showModal] = false
    },
    serverCols(item) {
      const data = this.openvpnStatus[item.id]
      return {
        item,
        columns: [
          [
            {
              label: this.$t('Status'),
              value: this.displayStatus(item.id),
              class: this.parseStatusColor(data?.status),
              hint: this.parseHint(item.id, [], true)
            },
            {
              label: this.$t('Local IP Address'),
              value: this.displayLocalIpAddress(item.id),
              hint: this.parseHint(item.id, [
                { title: 'IPv4', key: 'ipaddress' },
                { title: 'IPv6', key: 'ip6address' }
              ])
            },
            { label: this.$t('TUN/TAP'), value: this.displayProtocol(item.id) }
          ],
          [
            {
              label: this.$t('Active clients'),
              value: this.displayClients(item.id),
              onClick: () => this.openModal(item.id, 'showServerConfigModal')
            },
            { label: this.$t('Logs'), value: this.displayLogs(item.id), onClick: () => this.openModal(item.id, 'showLogsModal') }
          ],
          [
            { label: this.$t('RX'), value: '%MB'.format(this.displayRx(item.id)) },
            { label: this.$t('TX'), value: '%MB'.format(this.displayTx(item.id)) }
          ],
          [{ label: this.$t('Uptime'), value: this.displayUptime(item.id) }]
        ]
      }
    },
    clientCols(item) {
      const data = this.openvpnStatus[item.id]
      return {
        item,
        columns: [
          [
            {
              label: this.$t('Status'),
              value: this.displayStatus(item.id),
              class: this.parseStatusColor(data?.status),
              hint: this.parseHint(item.id, [], true)
            },
            { label: this.$t('TUN/TAP'), value: this.displayProtocol(item.id) }
          ],
          [
            {
              label: this.$t('Local IP Address'),
              value: this.displayLocalIpAddress(item.id),
              hint: this.parseHint(item.id, [
                { title: 'IPv4', key: 'ipaddress' },
                { title: 'IPv6', key: 'ip6address' }
              ])
            },
            {
              label: this.$t('Remote IP Address'),
              value: this.displayRemoteIpAddress(item.id),
              hint: this.parseHint(item.id, [
                { title: 'IPv4', key: 'ipaddress_remote' },
                { title: 'IPv6', key: 'ip6address_remote' }
              ])
            },
            {
              label: this.$t('Logs'),
              value: this.displayLogs(item.id),
              onClick: () => this.openModal(item.id, 'showLogsModal')
            }
          ],
          [
            { label: this.$t('RX'), value: '%MB'.format(this.displayRx(item.id)) },
            { label: this.$t('TX'), value: '%MB'.format(this.displayTx(item.id)) }
          ],
          [{ label: this.$t('Uptime'), value: this.displayUptime(item.id) }]
        ]
      }
    },
    loadData(form, responses) {
      if (responses[0]?.messages) this.warningMessages = responses[0].messages
      const serverInstance = form.openVpn.find(instance => instance.type === 'server')
      const requests = [
        '/api/interfaces/config',
        { endpoint: '/api/interfaces/basic/status/lan', condition: this.$store.isAccessPoint },
        { endpoint: '/api/ddns/config', condition: 'vuci-app-ddns-api.control' },
        '/api/basic/network/devices/status'
      ]
      if (serverInstance) requests.push(`/api/openvpn/${serverInstance.id}/clients/config`)
      return this.$axios
        .bulkGet(requests)
        .then(([interfaces, lanStatus, ddns, networks, ...rest]) => {
          this.formOptions.interfaces = interfaces.success ? interfaces.data : []
          if (lanStatus.success && this.$store.isAccessPoint) this.formOptions.interfaces.push(lanStatus.data)
          this.formOptions.networks = networks.success ? networks.data : []
          this.ddns = ddns.success ? ddns.data : []
          let tls = []
          if (serverInstance) tls = rest.pop()
          if (!interfaces.success) this.$message.error(this.$t('Failed to load interface data'))
          if (!interfaces.success) this.$message.error(this.$t('Failed to load LAN interface status'))
          if (!networks.success) this.$message.error(this.$t('Failed to load network data'))
          if (serverInstance && !tls.success) this.$message.error(this.$t('Failed to load TLS client data'))
          if (!ddns.success) this.$message.error(this.$t('Failed to load DDNS data'))
          return { tlsClients: tls?.data || [] }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    displayLogs(itemId) {
      return !this.openvpnStatus[itemId]?.logs ? '0' : this.openvpnStatus[itemId].logs.split(/\n/).length - 1
    },
    displayStatus(name) {
      return this.openvpnStatus[name]?.status ? this.statusDisplayValues[this.openvpnStatus[name].status] : '-'
    },
    parseStatusColor(code) {
      return this.statusColors[code] || this.statusColors.default
    },
    displayLocalIpAddress(name) {
      return this.openvpnStatus[name]?.ipaddress || this.openvpnStatus[name]?.ip6address || '-'
    },
    displayRemoteIpAddress(name) {
      return this.openvpnStatus[name]?.ipaddress_remote || this.openvpnStatus[name]?.ip6address_remote || '-'
    },
    displayProtocol(name) {
      return this.openvpnStatus[name]?.protocol ? this.openvpnStatus[name].protocol.toUpperCase() : '-'
    },
    displayRx(name) {
      return this.openvpnStatus[name]?.rx
    },
    displayTx(name) {
      return this.openvpnStatus[name]?.tx
    },
    displayUptime(name) {
      return this.openvpnStatus[name]?.uptime || '-'
    },
    displayClients(name) {
      return this.openvpnStatus[name]?.clients_connected || this.openvpnStatus[name]?.clients_all ? this.openvpnStatus[name]?.clients_connected + '/' + this.openvpnStatus[name]?.clients_all : '-'
    },
    showExportHint(item) {
      const disabled = this.displayStatus(item.id) === this.$t('Disabled') || this.displayStatus(item.id) === '-'
      return disabled ? [{ info: this.$t('Enable instance to export configuration file.') }] : []
    },
    showDeleteHint(item) {
      return this.ddns.some(x => x.interface === `openvpn_${item.id}`) ? [{ info: this.$t('Instance is used by Dynamic DNS.') }] : []
    },
    checkStatus() {
      return this.$axios
        .get('/api/openvpn/status/')
        .then(({ data }) => {
          Object.keys(data).forEach(key => {
            if ('clients' in data[key]) {
              data[key].clients.forEach((x, i) => {
                data[key].clients[i].tx = '%MB'.format(x.tx)
                data[key].clients[i].rx = '%MB'.format(x.rx)
              })
            }
          })
          this.openvpnStatus = {}
          Object.keys(data).forEach(key => (this.openvpnStatus[key] = data[key]))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load OpenVPN status data'))
        })
    },
    exportConfig(s) {
      return this.$utils
        .downloadFileApi(`/api/openvpn/${s.id}/actions/download`, 'text/plain', 'POST')
        .then(() => {
          this.$message.success(this.$t('Configuration download was successful'))
        })
        .catch(() => this.$message.error(this.$t('Failed to download OpenVPN configuration file')))
    },
    openGenerateClientModal(server) {
      this.$axios
        .post(`/api/openvpn/${server.id}/actions/generate`, { data: {} })
        .then(() => {
          this.downloadGeneratedConfig(server)
        })
        .catch(({ response }) => {
          if (response?.data?.errors) {
            this.missingFieldsForClient = response.data.errors
            this.showGenerateClientModal = true
          }
        })
    },
    closeGenerateClientModal() {
      this.$prompt.show({
        title: this.$t('Go back?'),
        content: this.$t('Unsaved changes will be discarded'),
        okText: this.$t('Discard'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.showGenerateClientModal = false
          this.missingFieldsForClient = []
        }
      })
    },
    downloadGeneratedConfig(server) {
      return this.$utils
        .downloadFileApi(`/api/openvpn/${server.id}/actions/generate`, null, 'POST')
        .then(() => {
          this.$message.success(this.$t('Configuration download was successful'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to download OpenVPN configuration file'))
        })
    },
    requiredCheckFailed(instance) {
      const { configuration, type, auth_mode, use_pkcs } = instance
      if (configuration === 'custom') return !instance.config
      if (type === 'client' && !instance.remote?.[0] && configuration !== 'external') return true
      if (use_pkcs === '1') return !instance.pkcs12
      if (auth_mode === 'skey') return !instance.secret
      if (configuration === 'external') return !instance.user || !instance.pass
      if (['pass', 'tls/pass'].includes(auth_mode)) {
        if (type === 'server') return !instance.userpass
        return !instance.user || !instance.pass || !instance.ca
      }
      return !instance.ca || !instance.cert || !instance.key
    },
    validateEnable(self) {
      const instance = self.uciSection
      if (instance.enable === '1' && this.requiredCheckFailed(instance)) {
        self.model = '0'
        this.$message.error(this.$t('Missing some required values'))
      }
    },
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        const isInvalid = this.formData.openVpn.some(instance => !instance.dev && instance.enable === '1')
        const customConfig = this.formData.openVpn.some(instance => instance.configuration === 'custom' && instance.config !== '')
        if (isInvalid && !customConfig) reject(this.$t('Missing required option: TUN/TAP'))
        resolve()
      })
    },
    handleEditError(response) {
      const errors = response.payload[0].errors.map(err => ({ ...err, instance: this.formData.openVpn.find(i => i.id === err.section).name }))
      const groupedErrors = errors.reduce((acc, { code, instance }) => {
        if (!acc[code]) acc[code] = []
        acc[code].push(instance)
        return acc
      }, {})
      const [[firstCode, firstInstances], ...rest] = Object.entries(groupedErrors)
      // since different errors can occur because of multiple instances with different configurations, return only first one and show messages for others
      rest.forEach(([code, instances]) => this.$message.error(this.editErrors[code] ? this.editErrors[code](instances) : this.editErrors.default))
      return this.editErrors[firstCode](firstInstances) || this.editErrors.default
    },
    deleteClients() {
      this.formData.tlsClients = []
    }
  }
}
</script>
