<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="dlms_client"
    :after-load="afterLoad"
    :before-save="beforeSave"
    editing
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :name="section.id"
      data-key="cosem_group"
      :endpoints="[{ endpoint: 'dlms/cosem_group/config' }]"
      :title="$utils.getModalTitle($t('DLMS COSEM group'), section.name)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :help="$t('Value group state.')"
        :label="$t('Enabled')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Name')"
        :help="$t('OBIS code group name.')"
        name="name"
        maxlength="200"
        required
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Interval')"
        :help="$t('Interval for OBIS code reading (in seconds).')"
        name="interval"
        rules="irange(1, 4294967295)"
        initial="60"
        required
      />
      <tlt-inline-message
        v-if="associationNameEnabled"
        id="config-change"
        :message="message"
        type="warning"
      />
      <tlt-form-model-item>
        <vuci-form-item-button
          :uci-section="{}"
          :text="$t('Test')"
          name="test"
          type="button"
          :readonly="getTestHint().length > 0 || testDisabled"
          no-write
          :hints="getTestHint()"
          @click="test"
        />
      </tlt-form-model-item>
      <tlt-text-area
        v-model="testResponse"
        custom-id="test-output"
        :rows="textAreaHeight"
        readonly
      />
    </vuci-named-section>
    <vuci-typed-section
      type="cosem"
      :title="$t('DLMS COSEM value')"
      :table-actions="['column-list', 'search']"
      :columns="cosemColumns"
      :uci-data="uciData"
      :edit-form="cosemEditModal"
      :endpoints="[{ endpoint: `dlms/cosem_group/${section.id}/cosem/config` }]"
      :data-key="`${section.id}_cosem`"
      :add-validate="addValidate"
      :after-delete="afterDelete"
      :restricted-values="['name']"
      :add-title="$t('Add new COSEM value')"
      :edit-form-props="{
        father: section.id
      }"
    >
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #status="{ s }">
        <tlt-hint
          :hints="status.find(stats => stats.id === s.id)?.hint || []"
          rawhtml
        >
          <tlt-icon
            v-if="status.find(stats => stats.id === s.id)?.failed"
            icon="error"
            class="text-theme-text-danger size-5"
          />
        </tlt-hint>
        <!--Workaround that works great-->
        <tlt-hint :hints="[]">
          <tlt-icon
            v-if="status.find(stats => stats.id === s.id)?.success"
            icon="success"
            class="text-theme-text-success size-5"
          />
        </tlt-hint>
        <tlt-hint :hints="[{ info: $t('Missing required options: %s').format(findMissingNameReferencingOptions(formData, s).join(', ')) }]">
          <tlt-icon
            v-if="!status.length && s.enabled === '1' && findMissingNameReferencingOptions(formData, s).length"
            icon="warning"
            class="text-theme-text-warning size-5"
          />
        </tlt-hint>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import cosemEditForm from './DlmsCosemEdit'
import { scanStatuses, isGroupValueValid, getCosemGroupTestActionPayload, validateCosemGroups, findMissingNameReferencingOptions } from './dlmsUtils'

export default {
  inject: ['scanStatusByDevice'],
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      cosemEditModal: markRaw(cosemEditForm),
      cosemColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('COSEM value name.'), displayFn: v => v || '-' },
        { name: 'enabled', label: this.$t('Enabled'), help: this.$t('COSEM value configuration button.') },
        { name: 'status' }
      ],
      formData: {},
      testDisabled: false,
      testResponse: '',
      status: [],
      scanStatuses
    }
  },
  computed: {
    associationNameEnabled() {
      if (!this.formData[`${this.section.id}_cosem`]) return false
      return this.formData[`${this.section.id}_cosem`].some(section => section.enabled === '1' && section.cosem_id === '15')
    },
    message() {
      return this.associationNameEnabled ? this.$t('Test request might take a really long time with a COSEM that has Association logical name COSEM class.') : ''
    },
    textAreaHeight() {
      return Math.max(3, Math.min(this.testResponse.split('\n').length, 20))
    }
  },
  methods: {
    findMissingNameReferencingOptions,
    afterLoad(uciData) {
      const cosemGroup = uciData.cosem_group.find(c => c.id === this.section.id)
      if (cosemGroup) {
        cosemGroup.enabled = '1'
      }
      return uciData
    },
    async beforeSave() {
      if (this.section.enabled === '1' && !this.formData[`${this.section.id}_cosem`].some(section => section.enabled === '1'))
        return Promise.reject(this.$t('Cannot enable COSEM group without enabled COSEM group value'))
      else if (this.section.enabled === '1') {
        const cosemGroupsValidation = validateCosemGroups(this.formData, this.section.id)
        if (!cosemGroupsValidation.isValid) return Promise.reject(cosemGroupsValidation.message)
      }

      return Promise.resolve()
    },
    addValidate(addModel, sections) {
      if (sections.length < 20) return { valid: true }
      return {
        valid: false,
        message: this.$t('Maximum number of COSEM instances has been reached')
      }
    },
    formStatus(testResponse, error = false) {
      const object = this.formData[`${this.section.id}_cosem`].filter(object => object.enabled === '1')
      const updatedObject = object.map(s => {
        s.failed = ''
        s.success = ''
        s.hint = []
        let validJson = {}
        let failedDevices = []
        if (testResponse && !error) {
          validJson = testResponse.result
          if (!validJson[s.name]) {
            s.failed = '1'
            s.hint = [{ info: this.$t('Configuration test failed due to invalid configuration.') }]
          } else {
            const devices = Object.keys(validJson[s.name])
            failedDevices = devices.map(dev => ({
              device: dev,
              err: validJson[s.name][dev].error,
              message: validJson[s.name][dev].result
            }))
          }
        }
        let hint = ''
        if (error) {
          s.failed = '1'
          s.hint = [{ info: this.$t('Test configuration request failed') }]
        }
        if (failedDevices.length !== 0 && failedDevices.some(dev => dev.err)) {
          const dev = failedDevices.filter(device => device.err)
          dev.forEach(dev => {
            hint = hint + this.$t('%s failed with an error: %s %s').format(`<b>${dev.device}</b>`, dev.message, '</br>')
          })
          s.failed = '1'
          s.hint = [{ info: hint }]
        } else if (!testResponse.error && s.failed !== '1') {
          s.hint = []
          s.success = '1'
        }
        return s
      })
      this.status = updatedObject
    },
    test() {
      const payload = getCosemGroupTestActionPayload(this.formData, this.section.id)
      if (!payload) {
        return
      }

      payload.pretty = '1'

      this.testDisabled = true
      return this.$axios
        .post('/api/dlms/cosem_group/actions/test', { data: payload })
        .then(({ data }) => {
          this.testResponse = JSON.stringify(data, null, 2)
          this.formStatus(data)
        })
        .catch(error => {
          this.formStatus({}, true)
          if (error.response?.data?.errors?.[0]?.code === 16) return this.$message.error(this.$t('There are no enabled connections, please enable a connection before using COSEM groups'))
          this.$message.error(this.$t('Failed to test request, encountered an unexpected error.'))
        })
        .finally(() => {
          this.testDisabled = false
        })
    },
    getTestHint() {
      const enabledCosemValues = this.formData[`${this.section.id}_cosem`]?.filter(groupValue => groupValue.enabled === '1')
      const invalidCosemValues = enabledCosemValues?.filter(groupValue => !isGroupValueValid(groupValue))

      if (!enabledCosemValues?.length) {
        return [{ info: this.$t('There are no enabled objects in the group') }]
      } else if (invalidCosemValues?.length) {
        const name = invalidCosemValues[0].name || this.$t('Undefined')
        return [{ info: this.$t('%s COSEM object parameters are missing, double check your configuration').format(name) }]
      } else if (this.isScanActive()) {
        return [{ info: this.$t('Scan is in progress') }]
      }

      return []
    },
    afterDelete(res) {
      if (!this.formData[`${this.section.id}_cosem`].find(value => value.enabled === '1' && res.id !== value.id)) {
        const section = this.formData.cosem_group.find(section => section.id === this.section.id)
        section.enabled = '0'
      }
    },
    isScanActive() {
      return this.formData[`${this.section.id}_cosem`]?.some(c => c.physical_device?.some(id => this.scanStatusByDevice()[id]?.status === this.scanStatuses.inProgress))
    }
  }
}
</script>
