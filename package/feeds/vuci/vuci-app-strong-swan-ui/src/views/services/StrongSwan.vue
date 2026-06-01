<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="ipsec"
    :after-load="loadData"
    bulk-request
  >
    <vuci-typed-section
      :title="$t('IPsec tunnels')"
      type="remote"
      :endpoints="[{ endpoint: 'ipsec/config' }]"
      data-key="ipsec"
      :uci-data="uciData"
      :edit-form="editModal"
      :after-delete="afterDelete"
      :after-add="afterAdd"
      :no-value-text="$t('There are no IPsec instances')"
      :help="
        $t(
          'This section displays IPsec instances currently\
      existing on the router. In order to begin editing an instance,\
      click the button that looks like a pencil located next to it.'
        )
      "
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          class="mb-4 last:mb-0"
          :test-id="`rowCard-${s.id}`"
          :card-props="ipsecCols(s)"
        >
          <name-cell
            class="lg:w-[14%]"
            :index="index + 1"
            :value="s.id"
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
                  :disabled="false"
                  @click="row.onClick"
                  >{{ row.value }}</tlt-button
                >
                <div
                  v-else
                  class="flex gap-2 min-w-0"
                >
                  <span
                    class="truncate"
                    :class="row.class"
                    >{{ row.value }}</span
                  >
                  <tlt-hint
                    v-if="row.hint?.hint.length"
                    :hints="row.hint.hint"
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
                  class="lg:min-w-max"
                  :actions="actions"
                >
                  <template #delete="{ delSection }">
                    <tlt-hint :hints="deleteHints(s)">
                      <tlt-button
                        :readonly="isChildOfDMVPN(s)"
                        type="text"
                        color="error"
                        button-id="delete"
                        size="md"
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
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-item-switch
                  class="lg:min-w-max"
                  :uci-section="s"
                  name="enabled"
                  @change="validateEnable"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('New configuration name')"
          prop="id"
          required
          :help="$t('Name of the new IPsec configuration. Used for easier configurations management purpose only.')"
          rules="uciname"
          maxlength="512"
        />
      </template>
    </vuci-typed-section>
    <tlt-modal
      :open="showLogsModal"
      @close="closeModal('showLogsModal')"
    >
      <tlt-card :title="$t(`Logs: %s`).format(openedInstance)">
        <tlt-text-area
          v-model="showSingleLog"
          custom-id="template"
          rows="30"
          readonly
        />
      </tlt-card>
    </tlt-modal>
    <tlt-modal
      :open="showServerConfigModal"
      @close="closeModal('showServerConfigModal')"
    >
      <tlt-table
        id="clients"
        :columns="clientsColumns"
        :data-source="ipsecStatus[openedInstance]?.peers"
        :no-value-text="$t('There are no active clients')"
        :per-page-text="$t('Active clients per page')"
        pagination
        :title="$t(`Clients: %s`).format(openedInstance)"
        :table-actions="['column-list', 'search']"
      />
    </tlt-modal>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './StrongSwanEdit'
import { useCertificatesStore } from '@/stores/certificates'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions,
      warningMessages: () => this.warningMessages,
      setWarningMessages: messages => (this.warningMessages = messages)
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      ipsecStatus: {},
      showServerConfigModal: false,
      showLogsModal: false,
      openedInstance: undefined,
      clientsColumns: [
        { dataIndex: 'peer_ip_address', title: this.$t('Remote IP address') },
        { dataIndex: 'my_id', title: this.$t('Local ID') },
        { dataIndex: 'peer_id', title: this.$t('Remote ID') },
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
      formOptions: {
        interfaces: [],
        clients: [],
        servers: [],
        gre: []
      },
      formData: {},
      warningMessages: []
    }
  },
  timers: {
    checkStatus: { time: 6000, autostart: true, immediate: true, repeat: true }
  },
  computed: {
    showSingleLog() {
      return this.ipsecStatus[this.openedInstance]?.logs || ''
    },
    certificatesStore() {
      return useCertificatesStore()
    }
  },
  methods: {
    validateEnable(self) {
      const instance = self.uciSection
      if (instance.enabled === '1' && !instance.pre_shared_key && !instance.multiple_secrets) {
        self.uciSection.enabled = '0'
        this.$message.error(this.$t("Missing 'Pre-shared key' option"))
      }
    },
    afterAdd(instance, { uciData }) {
      if (!('ipsec-connection-proposal' in uciData)) uciData['ipsec-connection-proposal'] = []
      uciData['ipsec-connection-proposal'].push(instance)
    },
    openModal(name, showModal) {
      this.openedInstance = name
      this[showModal] = true
    },
    closeModal(showModal) {
      this[showModal] = false
    },
    ipsecCols(item) {
      const data = this.ipsecStatus[item.id]
      const columns = [
        [{ label: this.$t('Status'), value: this.displayStatus(item.id), class: this.parseStatusColor(data?.status) }],
        [
          { label: this.$t('Remote host'), value: this.displayRemoteHost(item.id) },
          { label: this.$t('Active clients'), value: this.displayClients(item.id), onClick: () => this.openModal(item.id, 'showServerConfigModal') },
          { label: this.$t('Logs'), value: this.displayLogs(item.id), onClick: () => this.openModal(item.id, 'showLogsModal') }
        ],
        [
          { label: this.$t('Uptime'), value: this.displayUptime(item.id) },
          { label: this.$t('RX'), value: '%MB'.format(this.displayRx(item.id)) },
          { label: this.$t('TX'), value: '%MB'.format(this.displayTx(item.id)) }
        ],
        [
          { label: this.$t('Type'), value: this.displayType(item.id) },
          { label: this.$t('Key exchange'), value: this.displayKeyExchange(item.id) }
        ]
      ]
      if (!data?.xfrm_ip) {
        columns[0].push(
          {
            label: this.$t('Local subnet'),
            value: this.displaySubnet(item.id, 'local_subnet'),
            hint: this.displaySubnetHint(item.id, 'local_subnet')
          },
          {
            label: this.$t('Remote subnet'),
            value: this.displaySubnet(item.id, 'remote_subnet'),
            hint: this.displaySubnetHint(item.id, 'remote_subnet')
          }
        )
      } else {
        columns[0].push({
          label: this.$t('IP Address'),
          value: this.displayAddress(item.id, 'xfrm_ip')
        })
      }
      return {
        item,
        columns
      }
    },
    checkStatus() {
      return this.$axios
        .get('/api/ipsec/status')
        .then(({ data }) => {
          Object.keys(data).forEach(key => {
            if ('peers' in data[key]) {
              data[key].peers.forEach((x, i) => {
                data[key].peers[i].tx = '%MB'.format(x.tx)
                data[key].peers[i].rx = '%MB'.format(x.rx)
              })
            }
          })
          this.ipsecStatus = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load IPsec status data'))
        })
    },
    displayLogs(itemId) {
      return !this.ipsecStatus[itemId]?.logs ? '0' : this.ipsecStatus[itemId].logs.split(/\n/).length - 1
    },
    displayStatus(name) {
      return this.ipsecStatus[name]?.status ? this.statusDisplayValues[this.ipsecStatus[name].status] : '-'
    },
    parseStatusColor(code) {
      return this.statusColors[code] || this.statusColors.default
    },
    displaySubnetHint(name, key) {
      if (!this.ipsecStatus[name]?.[key] || this.ipsecStatus[name]?.[key].length <= 1) return { hint: [] }
      const hint = this.ipsecStatus?.[name]?.[key]?.map(info => ({ info })) || []
      return { hint }
    },
    displayAddress(name, key) {
      return this.ipsecStatus[name]?.[key] || '-'
    },
    displaySubnet(name, key) {
      return this.ipsecStatus[name]?.[key]?.length <= 1 ? this.ipsecStatus[name][key][0] : this.ipsecStatus[name]?.[key] ? this.ipsecStatus[name][key].length : '-'
    },
    displayRemoteHost(name) {
      return this.ipsecStatus[name]?.remote_host || '-'
    },
    displayRx(name) {
      return this.ipsecStatus[name]?.rx
    },
    displayTx(name) {
      return this.ipsecStatus[name]?.tx
    },
    displayType(name) {
      const isRouteBased = this.ipsecStatus[name]?.xfrm_ip
      if (!isRouteBased) {
        return this.ipsecStatus[name]?.type || '-'
      }
      return this.$t('Route based')
    },
    displayKeyExchange(name) {
      return this.ipsecStatus[name]?.keyexchange || '-'
    },
    displayUptime(name) {
      return this.ipsecStatus[name]?.uptime || '-'
    },
    displayClients(name) {
      return this.ipsecStatus[name]?.clients_conected || this.ipsecStatus[name]?.clients_all ? this.ipsecStatus[name]?.clients_conected + '/' + this.ipsecStatus[name]?.clients_all : '-'
    },
    afterDelete(section, uciData) {
      return this.$axios.get('/api/ipsec/secrets/config').then(response => {
        uciData['ipsec-connection-proposal'] = uciData['ipsec-connection-proposal']?.filter(x => x.id !== section.id) ?? []
        uciData.secrets = response.data
      })
    },
    isChildOfDMVPN(s) {
      return s.service === 'dmvpn'
    },
    deleteHints(s) {
      return this.isChildOfDMVPN(s) ? [{ info: this.$t("This instance can't be deleted because it is part of DMVPN configuration") }] : []
    },
    getFormOptions() {
      return {
        ...this.formOptions,
        certificates: this.certificatesStore.generatedCertificates
      }
    },
    loadData(_, responses) {
      this.warningMessages = responses?.[0]?.messages ?? []
      const request = ['/api/interfaces/config', '/api/ipsec/secrets/config', '/api/l2tp/client/config', '/api/l2tp/server/config', '/api/gre/config']
      return this.$axios
        .bulkGet(request)
        .then(([iface, secret, clients, servers, gre]) => {
          this.formOptions = {
            interfaces: iface.success ? iface.data : [],
            clients: clients.success ? clients.data : [],
            servers: servers.success ? servers.data : [],
            gre: gre.success ? gre.data : []
          }
          const secrets = secret.success ? secret.data : []
          if (!iface.success) this.$message.error(this.$t('Failed to load interface data'))
          if (!clients.success) this.$message.error(this.$t('Failed to load L2tp client data'))
          if (!servers.success) this.$message.error(this.$t('Failed to load L2tp server data'))
          if (!secret.success) this.$message.error(this.$t('Failed to load Ipsec secret data'))
          if (!gre.success) this.$message.error(this.$t('Failed to load Gre data'))
          return { secrets }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    }
  }
}
</script>
