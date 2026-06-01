<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="opcua_server"
    :after-load="loadData"
    :before-save="handleMultiFileSaving"
  >
    <tlt-card
      :title="$t('Status')"
      :help="$t('This section displays OPC UA Server status information.')"
      class="[&>div.card-content]:pb-4"
    >
      <div class="flex justify-center gap-1">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :card-props="statusData"
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
        </tlt-horizontal-card>
      </div>
    </tlt-card>
    <vuci-named-section
      v-slot="{ s }"
      name="opcua_server"
      :title="$t('OPC UA server configuration')"
      :uci-data="uciData"
      data-key="opcua"
      :endpoints="[{ endpoint: 'opcua/destination_server/config' }]"
      :exception-options="['tcl']"
      :after-save="fixTCLValue"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        initial="0"
        :help="$t('Enable/disable OPC UA server.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="port"
        :label="$t('Port')"
        placeholder="4840"
        rules="port"
        :required="s.enabled === '1'"
        :help="$t('Service port.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Default nodes enabled')"
        :help="$t('If disabled, then all nodes which are provided by default will be removed.')"
        name="default_nodes_enabled"
        initial="1"
        :readonly="isStringIdTypeUsed && s.default_nodes_enabled === '0'"
      >
        <template
          v-if="isStringIdTypeUsed"
          #after-content="{ controlRef }"
        >
          <tlt-popover
            :target="() => controlRef"
            fallback-placements="top-start"
          >
            {{ $t('All nodes with string ID type must be disabled, you can disable them') }}
            <router-link to="/services/opcua/opcua_server/data_sources"> {{ $t('here') }} </router-link>.
          </tlt-popover>
        </template>
      </vuci-form-item-switch>
      <vuci-form-item-switch
        :uci-section="s"
        name="encryption"
        :label="$t('Encryption')"
        initial="0"
        :help="$t('Enable/disable encryption.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="application_uri"
        :label="$t('Application URI')"
        placeholder="urn:unconfigured:application"
        rules="string"
        :depend="s.encryption === '1'"
        required
        :help="$t('Should match SubjectAlternativeName in client certificate.')"
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="certificate"
        :label="$t('Certificate')"
        :help="$t('Client certificate.')"
        max-size="16MB"
        :depend="s.encryption === '1'"
        required
      />
      <vuci-form-item-upload
        :uci-section="s"
        name="key"
        :label="$t('Key')"
        :help="$t('Client key.')"
        max-size="16MB"
        :depend="s.encryption === '1'"
        required
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="disable_unencrypted_access"
        :label="$t('Disable unencrypted access')"
        initial="0"
        :depend="s.encryption === '1'"
        :help="$t('Whether to disallow access without encryption.')"
      />
      <vuci-form-item-custom
        name="tcl"
        inputs="input"
        :uci-section="s"
        :label="$t('TCL')"
        :maxlines="10"
        :input-props="[{ type: 'file' }]"
        :depend="s.encryption === '1'"
        :help="$t('Trusted certificate list.')"
        allow-create
      >
        <template #input-input="{ row, setValue }">
          <vuci-form-item-upload
            :ref="`tcl_${row}`"
            :uci-section="returnSection(s, row)"
            :name="`tcl_${row}`"
            use-option-as-separator
            option="tcl"
            @reset="res => reset(res)"
            @uploaded="
              res => {
                setValue(res.data.path)
                mergeData(res, row)
              }
            "
          />
        </template>
      </vuci-form-item-custom>
    </vuci-named-section>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      formData: {},
      opcuaStatusData: {},
      formOptions: {
        serverNodes: []
      }
    }
  },
  computed: {
    statusData() {
      const statusData = this.opcuaStatusData || {}
      const isStatusGood = statusData?.uptime !== undefined
      const errorHint = this.getStatusError(statusData?.error_code)

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error',
            errorHint: errorHint
          }
        ],
        [{ label: this.$t('Uptime'), value: this.displayTime(statusData?.uptime) }],
        [{ label: this.$t('Connected clients'), value: this.displayNumber(statusData?.active_session_count) }],
        [{ label: this.$t('Node reads'), value: this.displayNumber(statusData?.node_read_count) }],
        [{ label: this.$t('Time since last request'), value: this.displayTime(statusData?.time_since_last_node_read) }]
      ]
      return { columns }
    },
    isStringIdTypeUsed() {
      return this.formOptions.serverNodes.some(serverNode => serverNode.enabled === '1' && serverNode.node_id_type === 'string')
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    fixTCLValue(_, res) {
      // After full file delete TCL value is not returned, and with custom TCL implementation it needs a manual reset
      if (!res.data.tcl) {
        this.formData.opcua[0].tcl = []
      }
    },
    reset(res) {
      const tcl = this.formData.opcua[0].tcl
      this.formData.opcua[0].tcl = tcl.length > 1 ? [...tcl.filter(path => path !== res)] : []
    },
    deleteFakeUploadData(refKeys) {
      refKeys.forEach(key => {
        if (key.includes('tcl_')) {
          delete this.formData.opcua[0][key]
        }
      })
    },
    returnSection(s, row) {
      return {
        id: s.id,
        tcl: s.tcl,
        [`tcl_${row}`]: s.tcl?.[row] || '',
        [`tcl_${row}:file_size`]: s['tcl:file_size']?.[row] || 0
      }
    },
    handleMultiFileSaving() {
      const refKeys = Object.keys(this.$refs)
      const section = this.formData.opcua[0]
      // Reset uploads when custom component is hidden with depends
      if (section.encryption === '0') {
        refKeys.forEach(key => key.includes('tcl_') && this.$refs[key] && this.$refs[key].reset())
        this.deleteFakeUploadData(refKeys)
        return Promise.resolve()
      }
      const refFiles = refKeys.filter(key => key.includes('tcl_') && this.$refs[key]).map(val => this.$refs[val].file.name)
      // It is important to use an if here, because `section.tcl` can be an empty string
      if (section.tcl) {
        section.tcl = section.tcl.filter(path => path && refFiles.includes(path.replace('/etc/vuci-uploads/cbid.opcua_server.opcua_server.tcl', '')))
      }
      const duplicateFile = refFiles.find((file, index) => refFiles.indexOf(file) !== index)
      if (duplicateFile) {
        return Promise.reject(this.$t('Duplicate files are not allowed, remove %s duplicate file'.format(duplicateFile)))
      }
      this.deleteFakeUploadData(refKeys)
      return Promise.resolve()
    },
    mergeData(res) {
      this.formData.opcua[0].tcl = [...this.formData.opcua[0].tcl.filter(value => value && value !== res.data.path), res.data.path]
    },
    updateStatus() {
      return this.$axios
        .get('/api/opcua/destination_server/status')
        .then(({ data }) => {
          this.opcuaStatusData = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    getStatusError(errorCode) {
      const errorMessages = {
        1: this.$t('Failed to start server'),
        2: this.$t('The TCP port is already in use')
      }
      return errorMessages[errorCode] || (errorCode ? this.$t('An unexpected error occurred') : '')
    },
    loadData() {
      return this.$axios
        .bulkGet(['/api/opcua/destination_server/nodes/config', { endpoint: '/api/link_aggregation/config', condition: this.$store.hasPackages('vuci-app-link-aggregation-tsw-ui') }])
        .then(([nodes, ports]) => {
          this.formOptions.serverNodes = nodes.success ? nodes.data : []
          if (ports.success && ports.data.length > 0) {
            this.$store.readOnlyPage = true
            this.$notification.warning({
              title: this.$t('Port Aggregation Enabled'),
              text: this.$t('OPC UA server configuration cannot be modified because Port Aggregation is enabled.'),
              action: {
                text: this.$t('Go to Port Aggregation'),
                to: '/network/ports/port_aggregation'
              }
            })
          }
          if (!nodes.success) this.$message.error(this.$t('Failed to load OPC UA server nodes data'))
          if (!ports.success) this.$message.error(this.$t('Failed to load link aggregation data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayTime(time) {
      return time || time === 0 ? '%t'.format(time) : '-'
    }
  }
}
</script>
