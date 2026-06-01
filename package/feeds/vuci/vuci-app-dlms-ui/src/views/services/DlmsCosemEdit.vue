<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="dlms_client"
    :after-load="afterLoad"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      :data-key="`${father}_cosem`"
      :endpoints="[{ endpoint: `dlms/cosem_group/${father}/cosem/config` }]"
      :title="$utils.getModalTitle($t('DLMS COSEM value'), section.name)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :help="$t('COSEM state.')"
        :label="$t('Enabled')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('COSEM option name.')"
        name="name"
        maxlength="200"
        :rules="validateName"
        required
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Physical device')"
        :help="$t('Physical device to read from.')"
        name="physical_device"
        multiple
        required
        :options="physicalDeviceOptions()"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="logical_name"
        :label="$t('Logical name')"
        :required="hasDeviceWithNameReferencing(true)"
        :rules="validateLogicalName"
        :help="$t('Address which will be used when reading objects from physical devices with logical name referencing.')"
      />
      <vuci-form-item-input
        :uci-section="s"
        name="short_name"
        :label="$t('Short name')"
        :required="hasDeviceWithNameReferencing(false)"
        rules="irange(0, 65535)"
        :help="$t('Address which will be used when reading objects from physical devices with short name referencing.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('COSEM class id')"
        :help="$t('Object type.')"
        name="cosem_id"
        :options="cosemList"
        @change="onCosemIdChange"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Entries')"
        :help="$t('How many data objects to read.')"
        name="entries"
        required
        rules="irange(1,32767)"
        :depend="s.cosem_id === '7'"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Attributes')"
        :help="$t('Available attributes for the selected COSEM class (check it %shere%s).').format('<a href=\'https://www.gurux.fi/Gurux.DLMS.Objects\' target=\'_blank\'>', '</a>')"
        name="attributes"
        :placeholder="$t('-- All --')"
        :options="cosemAttributePairs[s.cosem_id]"
        :save="saveAttributes"
        multiple
        has-select-all
        rawhtml
      />
      <tlt-inline-message
        v-if="getScanMessage"
        type="info"
        :message="getScanMessage"
      />
      <template v-if="scanStatus === scanStatuses.loading">
        <tlt-form-model-item>
          <div class="flex gap-2">
            <tlt-icon
              icon="spinner"
              class="text-theme-text-primary size-5"
              animate
            />
            <span class="text-theme-text-secondary-subtle">{{ $t('Loading parameters...') }}</span>
          </div>
        </tlt-form-model-item>
      </template>
      <template v-else-if="scanStatus === scanStatuses.inProgress">
        <tlt-form-model-item>
          <div class="flex gap-2">
            <tlt-icon
              icon="spinner"
              class="text-theme-text-primary size-5"
              animate
            />
            <span class="text-theme-text-secondary-subtle">{{ $t('Scanning parameters...') }}</span>
          </div>
        </tlt-form-model-item>
        <tlt-form-model-item>
          <tlt-button
            button-id="stop-scan"
            color="error"
            @click="stopScan"
          >
            {{ $t('Stop scan') }}
          </tlt-button>
        </tlt-form-model-item>
      </template>
      <template v-else-if="scanStatus === scanStatuses.stopping">
        <tlt-form-model-item>
          <div class="flex gap-2">
            <tlt-icon
              icon="spinner"
              class="text-theme-text-primary size-5"
              animate
            />
            <span class="text-theme-text-secondary-subtle">{{ $t('Stopping scan...') }}</span>
          </div>
        </tlt-form-model-item>
      </template>
      <template v-else-if="scanStatus !== scanStatuses.unavailable">
        <tlt-form-model-item>
          <tlt-button
            button-id="start-scan"
            @click="initiateScan"
          >
            {{ scanStatus === scanStatuses.completed ? $t('Repeat scan') : $t('Scan') }}
          </tlt-button>
        </tlt-form-model-item>
      </template>
    </vuci-named-section>
    <tlt-table
      id="device-parameters"
      ref="table"
      :title="$t('Device parameters')"
      :help="$t('Scanned parameters of the device.')"
      :columns="parameterColumns"
      pagination
      :data-source="loadedParamsDataSource"
      :table-actions="['column-list', 'search']"
    >
      <template #actions="{ record }">
        <tlt-button
          button-id="apply-parameter"
          type="text"
          :readonly="isParameterApplied(record)"
          @click="applyParameter(record)"
        >
          {{ $t('Apply') }}
        </tlt-button>
      </template>
    </tlt-table>
  </vuci-form>
</template>

<script>
import { rules } from '@/validation-rules'
import { cosemList, cosemAttributePairs, scanStatuses, hasDeviceWithNameReferencing as utilsHasDeviceWithNameReferencing } from './dlmsUtils'

export default {
  inject: ['formOptions', 'scanStatusByDevice', 'loadedParamsByDevice'],
  props: {
    section: {
      type: Object,
      required: true
    },
    father: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      cosemList,
      cosemAttributePairs,
      initialAttributes: '',
      initialCosemId: '',
      sideMessageTxt: this.$t('Incorrectly configured TCP connection was detected, connection device values were removed from device select list'),
      parameterColumns: [
        { dataIndex: 'obis', title: this.$t('Logical name') },
        { dataIndex: 'short_name', title: this.$t('Short name'), displayFn: val => val || '-' },
        { dataIndex: 'cosem_class_id', title: this.$t('COSEM class id'), actions: { filter: { type: 'uniqueValues' } }, displayFn: this.displayCosemType },
        { dataIndex: 'actions', title: this.$t('Actions') }
      ],
      scanStatuses
    }
  },
  computed: {
    physicalDevices() {
      return this.section.physical_device || []
    },
    scanStatus() {
      if (!this.physicalDevices.length) return this.scanStatuses.unavailable

      let isStoppingAnyScan = false
      let completedScans = 0
      let isParametersLoading = false
      let startedScans = 0
      this.physicalDevices.forEach(id => {
        const { status } = this.scanStatusByDevice()[id] || {}
        if (status === this.scanStatuses.completed) completedScans++
        if (status === this.scanStatuses.loading) isParametersLoading = true
        if (status === this.scanStatuses.stopping) isStoppingAnyScan = true
        if (status === this.scanStatuses.inProgress || status === this.scanStatuses.inQueue) startedScans++
      })

      if (isParametersLoading) return this.scanStatuses.loading
      else if (isStoppingAnyScan) return this.scanStatuses.stopping
      else if (startedScans > 0) return this.scanStatuses.inProgress
      else if (completedScans === this.physicalDevices.length) return this.scanStatuses.completed
      else if (completedScans > 0 && completedScans < this.physicalDevices.length) return this.scanStatuses.incomplete
      return this.scanStatuses.idle
    },
    getScanMessage() {
      const messages = {
        [this.scanStatuses.incomplete]: () => this.$t('Some devices are not scanned, scan them to get available parameters.'),
        [this.scanStatuses.completed]: () => this.$t('Repeat scan for devices to refresh found parameters.'),
        [this.scanStatuses.idle]: () => this.$t('Device parameters are not scanned, scan them to get available parameters.'),
        default: () => ''
      }
      return (messages[this.scanStatus] || messages.default)()
    },
    loadedParamsDataSource() {
      const result = []
      const parametersByLogicalName = {}

      const parametersByDevice = this.loadedParamsByDevice()
      let scannedDevices = 0

      for (let i = 0; i < this.physicalDevices.length; i++) {
        const deviceId = this.physicalDevices[i]
        const deviceParameters = parametersByDevice[deviceId] || []
        if (deviceParameters.length > 0) {
          scannedDevices += 1
        }

        for (const parameter of deviceParameters) {
          parametersByLogicalName[parameter.obis] ||= {
            occurences: 0,
            shortNames: new Set(),
            cosemClassIds: new Set()
          }
          const parameterByLogicalName = parametersByLogicalName[parameter.obis]

          parameterByLogicalName.cosemClassIds.add(parameter.cosem_class_id)
          parameterByLogicalName.occurences += 1
          if (parameter.short_name) {
            parameterByLogicalName.shortNames.add(parameter.short_name)
          }
        }
      }

      const needsShortName = this.hasDeviceWithNameReferencing(false)

      for (const logicalName in parametersByLogicalName) {
        const parameter = parametersByLogicalName[logicalName]
        if (parameter.occurences != scannedDevices) {
          continue
        }
        if (parameter.cosemClassIds.size != 1) {
          continue
        }
        if (parameter.shortNames.size > 1) {
          continue
        }
        if (needsShortName && parameter.shortNames.size == 0) {
          continue
        }
        result.push({
          obis: logicalName,
          short_name: Array.from(parameter.shortNames)[0],
          cosem_class_id: Array.from(parameter.cosemClassIds)[0]
        })
      }

      result.sort((a, b) => a.obis > b.obis)

      return result
    }
  },
  beforeUnmount() {
    this.$notification.remove(this.sideMessageTxt)
  },
  methods: {
    afterLoad() {
      this.initialCosemId = this.section.cosem_id
      this.initialAttributes = this.section.attributes
    },
    validateName(value) {
      if (this.formData[`${this.father}_cosem`].some(value => value.name === this.section.name && value.id !== this.section.id))
        return { valid: false, message: this.$t('Name %s is already in use').format(this.section.name) }
      return { isValid: !value.match(/"/), message: 'A string of any characters is accepted except "' }
    },
    validateLogicalName(value) {
      const result = rules.nospace(value)
      if (!result.isValid) {
        return result
      }

      const obisGroups = value.split('.')
      if (obisGroups.length !== 6) {
        return { isValid: false, message: this.$t('Must have exactly 6 integers separated by dots') }
      }

      const obisGroupMaxValues = [15, 255, 255, 255, 255, 255]
      for (let i = 0; i < obisGroups.length; i++) {
        const result = rules.irange(obisGroups[i], 0, obisGroupMaxValues[i])
        if (!result.isValid) {
          return {
            isValid: false,
            message: this.$t('Number %s: %s').format(i + 1, result.message)
          }
        }
      }

      return { isValid: true }
    },
    physicalDeviceOptions() {
      let devices = []
      const connections = this.formData.connection.filter(con => con.connection_type === '0' && (!con.address || !con.port))
      devices = this.formData.device.filter(device => device.connection && !connections.includes(device.connection))
      return devices.map(item => [item.id, item.name])
    },
    showMessage() {
      this.$notification.error(this.sideMessageTxt, false)
    },
    initiateScan() {
      this.$bus.emit('start-device-scan', this.physicalDevices)
    },
    stopScan() {
      this.$prompt.show({
        title: this.$t('Are you sure?'),
        content: this.$t('If a scan is stopped, you will need to start over from the beginning'),
        okText: this.$t('Confirm'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.$bus.emit('stop-device-scan', this.physicalDevices)
        }
      })
    },
    applyParameter(p) {
      const needsShortName = this.hasDeviceWithNameReferencing(false)
      const cosems = this.formData[`${this.father}_cosem`]
      const cosem = cosems.find(c => c.id === this.section.id)
      cosem.logical_name = p.obis
      cosem.cosem_id = p.cosem_class_id
      if (needsShortName) {
        cosem.short_name = p.short_name
      }
      this.$refs.vuciForm.updateUciData(cosems, `${this.father}_cosem`)
    },
    isParameterApplied(p) {
      const needsShortName = this.hasDeviceWithNameReferencing(false)
      if (needsShortName && this.section.short_name != p.short_name) {
        return false
      }

      return this.section.logical_name === p.obis && this.section.cosem_id === p.cosem_class_id
    },
    displayCosemType(cosemId) {
      const cosemTypePair = this.cosemList.find(c => c[0] === cosemId)
      return cosemTypePair ? cosemTypePair[1] : '-'
    },
    onCosemIdChange(_, val) {
      const cosem = this.formData[`${this.father}_cosem`].find(c => c.id === this.section.id)
      if (this.initialCosemId === val && this.initialAttributes) {
        if (typeof this.initialAttributes === 'string') {
          cosem.attributes = this.initialAttributes?.split(' ')
        } else {
          cosem.attributes = [...this.initialAttributes]
        }
      } else {
        cosem.attributes = []
      }
    },
    saveAttributes(self) {
      return self.model.join(' ')
    },
    hasDeviceWithNameReferencing(isLogicalName) {
      return utilsHasDeviceWithNameReferencing(this.formData, this.physicalDevices, isLogicalName)
    }
  }
}
</script>
