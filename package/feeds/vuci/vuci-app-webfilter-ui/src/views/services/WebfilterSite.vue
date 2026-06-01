<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    :extra-load="extraLoad"
    :after-load="afterLoad"
    config="hostblock"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="general"
      :title="$t('Site blocking settings')"
      :help="$t('The site blocking service provides you with the possibility to create a Blocklist or Allowlist that filters out which websites users on the local network can access.')"
      :uci-data="uciData"
      data-key="config"
      :endpoints="[{ endpoint: 'webfilter/global' }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable')"
        :help="$t('Turns site blocking on or off.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Mode')"
        :help="
          $t(`Mode of operation %s \
        Allowlist - allow every site included in the list and block everything else %s \
        Blocklist - block every site included in the list and allow everything else.`).format('<br>', '<br>')
        "
        name="mode"
        :options="listOptions"
        initial="blacklist"
        rawhtml
      />
      <vuci-form-item-select
        :uci-section="s"
        name="network"
        :label="$t('Network')"
        :help="$t('Network for which the site blocking service is activated.')"
        :options="filteredNetworkOptions"
        :placeholder="$t('-- Please select --')"
        :rules="validateHotspot"
      />
      <tlt-form-model-item
        :label="$t('Host list')"
        :help="$t('Upload a file with many hosts, one hostname per file line (max file size allowed is 3KB).')"
      >
        <tlt-upload
          name="host"
          action="/api/webfilter/config"
          :max-size="3072"
          instant
          :errors="uploadErrors"
          @uploaded="onUpload"
        />
      </tlt-form-model-item>
    </vuci-named-section>
    <vuci-typed-section
      v-model:selected="checkedSections"
      v-model:per-page="perPage"
      v-model:current-page="currentPage"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'webfilter/config' }]"
      :bulk-actions="bulkActions"
      data-key="block"
      type="block"
      :title="$t('Site blocking rules')"
      :table-actions="['search', 'column-list']"
      :help="$t('Configuration for individual websites.')"
      :columns="siteColumns"
      :row-actions="rowActions"
      :after-save="afterSave"
      pagination
      search
      :after-add="afterAdd"
      :error-handlers="{ create: handleError }"
    >
      <template #host="{ s }">
        <vuci-form-item-input
          v-if="!s.phost"
          :uci-section="s"
          name="host"
          :rules="[validateWildCard, validateHostname]"
          placeholder="myhost.example.com"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          :readonly="!!s.phost"
          name="enabled"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { isArray } from '@ui-core/utils/inspect.ts'

export default {
  data() {
    return {
      listOptions: [
        ['whitelist', this.$t('Allowlist')],
        ['blacklist', this.$t('Blocklist')]
      ],
      siteColumns: [
        { name: 'host', label: this.$t('Hostname'), actions: { filter: { type: 'uniqueValues' } }, width: 'lg' },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('Toggle blocking rules on or off.'), actions: { filter: { type: 'uniqueValues' } }, displayFn: this.parseEnabled }
      ],
      formData: {},
      uploadErrors: {
        1: this.$t('Error while uploading the file'),
        103: this.$t('Domain names with an optional wildcard (*) at the start are accepted (e.g., example.com or *.example.com).'),
        150: this.$t('Maximum upload file size reached'),
        default: this.$t('Failed to upload host list')
      },
      coovaChilli: this.$store.hasPackages('coova-chilli'),
      networkOptions: [],
      hotspotInterface: {},
      enabledHotspot: false,
      enabledCodes: {
        0: this.$t('Disabled'),
        1: this.$t('Enabled')
      },
      checkedSections: [],
      bulkActions: [{ id: 'delete', label: this.$t('Delete'), buttonProps: { iconLeft: 'delete' }, callback: this.onDeleteClick }],
      perPage: null,
      currentPage: 1
    }
  },
  computed: {
    filteredNetworkOptions() {
      const networkOptions = this.networkOptions.filter(item => item.area_type === 'lan' && item.id !== 'lan').map(this.$network.getName)
      if (this.hotspotInterface) networkOptions.push(['hotspot', this.$t('Hotspot')])
      networkOptions.unshift(['all', this.$t('All LAN interfaces')])
      return networkOptions
    }
  },
  created() {
    this.$notification.info(this.$t('Be careful not to block Yourself when using VPN or other services!'))
    this.$timer.start({ method: this.updateHostnames, time: 5000, autostart: false, immediate: false })
  },
  methods: {
    rowActions() {
      return [{ id: 'delete', callback: this.onDeleteClick }]
    },
    filterCheckedSections(data) {
      return data.filter(id => {
        return !this.formData.block.some(record => record.id !== id && data.includes(record.id) && record._children?.some(child => child.id === id))
      })
    },
    onDeleteClick(data) {
      data = !isArray(data) ? [data.id] : data
      const title = data.length > 1 ? this.$t('Delete these configurations?') : this.$t('Delete this configuration?')
      const dataToDelete = { data: { data: this.filterCheckedSections(data) } }
      this.$prompt.show({
        title,
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Delete'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.$spin()
          this.$axios
            .delete('/api/webfilter/config', dataToDelete)
            .then(() => {
              this.$message.success(this.$t('Selected hostnames have been removed'))
            })
            .catch(() => {
              this.$message.error(this.$t('Failed to clear hostname list'))
            })
            .finally(() => {
              this.$refs.vuciForm.loadData(true)
              this.$spin(false)
            })
        }
      })
    },
    parseEnabled(code) {
      return this.enabledCodes[code]
    },
    handleError(err) {
      return err.data.errors[0].error
    },
    afterAdd() {
      const pageEntries = Number(this.perPage)
      const index = (this.formData.block.length + 1) / pageEntries
      this.$nextTick(() => (this.currentPage = Math.ceil(index)))
    },
    onUpload({ res }) {
      this.formData.block = [...this.formData.block, ...res.data]
      this.$message.success(this.$t('The host list was uploaded successfully with %s hostnames').format(res.data.length))
    },
    validateHostname(value) {
      const regex = /^\*(\..*)/
      // replacing * to random letter to pass hostname validation
      value = value.replace(regex, 'a$1')
      this.$VuciValidator.value = value
      const hosts = this.formData.block.map(host => host.host)
      const duplicateHostname = hosts.find((item, index) => hosts.indexOf(item) !== index && item === value)
      if (duplicateHostname) return { isValid: false, message: this.$t("Hostname '%s' already exist").format(duplicateHostname) }
      if (this.$VuciValidator.hostname().isValid) return { isValid: true }
      return {
        isValid: false,
        message: this.$t('Domain names with an optional wildcard (*) at the start are accepted (e.g., example.com or *.example.com).')
      }
    },
    validateHotspot(val) {
      if (val !== 'hotspot' || (val === 'hotspot' && this.enabledHotspot)) return { isValid: true }
      this.$message.error(this.$t('Hotspot instance must be enabled'))
      return { isValid: false, message: this.$t('Hotspot instance must be enabled') }
    },
    validateWildCard(value) {
      const regex = /.+\*.*/
      const match = regex.test(value)
      if (!match) return { isValid: true }
      return { isValid: false, message: this.$t('Wildcard (*) can only be located at the start of the hostname.') }
    },
    afterLoad() {
      const requests = [
        {
          endpoint: '/api/hotspot/status',
          condition: this.coovaChilli
        },
        '/api/interfaces/config'
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([hotspotStatus, interfacesConfig]) => {
          if (!hotspotStatus.success) this.$message.error(this.$t('Failed to load Hotspot data'))
          if (!interfacesConfig.success) this.$message.error(this.$t('Failed to load network data'))
          this.networkOptions = interfacesConfig.success ? interfacesConfig.data : []
          this.hotspotInterface = hotspotStatus.success ? hotspotStatus.data : {}
          this.enabledHotspot = this.hotspotInterface.enabled !== '0'
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    updateHostnames() {
      return this.$axios
        .get('/api/webfilter/config')
        .then(({ data }) => {
          this.formData.block = data.map(newRecord => {
            const existingRecord = this.formData.block.find(record => record.id === newRecord.id)
            return !existingRecord?.host || (existingRecord.host === newRecord.host && existingRecord.enabled === newRecord.enabled) ? { ...existingRecord, ...newRecord } : existingRecord
          })
          this.extraLoad()
        })
        .catch(() => {
          this.$timer.stop({ method: this.updateHostnames })
          this.$message.error(this.$t('Failed to load configuration'))
        })
    },
    extraLoad(form = this.formData) {
      if (!form?.block || !isArray(form.block)) return form
      const childHosts = new Set(form.block.filter(item => item.phost).map(item => item.host))
      form.block = form.block
        .filter(item => !childHosts.has(item.host))
        .map(item => {
          if (form.block.some(child => item.host && child.phost === item.host)) {
            const children = form.block.filter(child => child.phost === item.host)
            return {
              ...item,
              _children: children
            }
          }
          return item
        })
      this.$refs.vuciForm.initialForm.block = form.block
      return form
    },
    afterSave() {
      this.$timer.start({ method: this.updateHostnames })
    }
  }
}
</script>
