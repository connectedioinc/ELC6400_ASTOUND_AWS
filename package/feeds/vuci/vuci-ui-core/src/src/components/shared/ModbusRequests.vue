<template>
  <vuci-typed-section
    :uci-data="uciData"
    :type="`request_${section.id}`"
    :columns="requestColumns"
    :title="$t('Requests configuration')"
    :table-actions="['column-list', 'search']"
    :data-key="`${section.id}_request`"
    :endpoints="[{ endpoint }]"
    :before-add="onAdd"
    :after-delete="afterDelete"
    :edit-form="editModal"
    :edit-form-props="editFormProps"
    :row-actions="getRowActions"
  >
    <template #name="{ s }">
      <data-source-hint
        :tag-consuming-services="tagConsumersByRequestId[s.id]"
        :is-overlapping="isRequestOverlapping(s)"
      >
        <tlt-form-model-item>
          <tlt-dummy-value :value="s.name" />
        </tlt-form-model-item>
      </data-source-hint>
    </template>
    <template #data_type="{ s }">
      <vuci-form-item-dummy
        :uci-section="s"
        :display-value="displayDatatype"
        name="data_type"
      />
    </template>
    <template #function="{ s }">
      <vuci-form-item-dummy
        :uci-section="s"
        name="function"
        :display-value="displayFunction"
      />
    </template>
    <template #first_reg="{ s }">
      <vuci-form-item-dummy
        :uci-section="s"
        name="first_reg"
      />
    </template>
    <template #reg_count="{ s }">
      <vuci-form-item-dummy
        :uci-section="s"
        name="reg_count"
      />
    </template>
    <template #enabled="{ s }">
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :readonly="!!isDisabled(s)"
        :hints="!!isDisabled(s) ? [{ info: isDisabled(s) }] : []"
      />
    </template>
  </vuci-typed-section>
</template>

<script>
import { markRaw } from 'vue'
import ModbusUtils from '@/components/shared/ModbusUtils.vue'
import DataSourceHint from '@/components/shared/UniversalGatewayUtilities/DataSourceHint.vue'
import EditForm from './ModbusRequestsEdit.vue'

export default {
  components: { DataSourceHint },
  mixins: [ModbusUtils],
  props: {
    uciData: {
      type: Object,
      required: true
    },
    section: {
      type: Object,
      required: true
    },
    endpoint: {
      type: String,
      required: true
    },
    onTestRequest: {
      type: Function,
      default: null
    },
    testDisabled: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      functionOptions: [
        ['1', this.$t('Read coils (1)')],
        ['2', this.$t('Read input coils (2)')],
        ['3', this.$t('Read holding registers (3)')],
        ['4', this.$t('Read input registers (4)')],
        ['5', this.$t('Set single coil (5)')],
        ['6', this.$t('Set single holding register (6)')],
        ['15', this.$t('Set multiple coils (15)')],
        ['16', this.$t('Set multiple holding registers (16)')]
      ],
      requestColumns: [
        {
          name: 'name',
          label: this.$t('Name'),
          help: this.$t('Name of this request (only used for easier identification of the request or its meaning).')
        },
        {
          name: 'data_type',
          label: this.$t('Data type'),
          help: this.$t('Data type that will be used for storing the response data (only for read requests)')
        },
        {
          name: 'function',
          label: this.$t('Function'),
          help: this.$t('Modbus function code for the request.')
        },
        {
          name: 'first_reg',
          label: this.$t('First register number'),
          help: this.$t('Start Register/Coil/Input (1-65536).')
        },
        {
          name: 'reg_count',
          label: this.$t('Register count / Values'),
          help: this.$t('Number of Registers/Coils/Inputs or actual values to be written')
        },
        {
          name: 'enabled',
          label: this.$t('Enabled'),
          help: this.$t('If disabled, the request will not be sent to server.')
        }
      ]
    }
  },
  computed: {
    tagConsumersByRequestId() {
      return Object.entries(this.formOptions().tagStatus).reduce((acc, [service, tags]) => {
        Object.values(tags).forEach(tag => {
          const [clientId, reqId] = tag.tag_id.split('.')
          if (clientId === this.section.id) {
            acc[reqId] ||= []
            acc[reqId].push(service)
          }
        })
        return acc
      }, {})
    },
    editFormProps() {
      return {
        endpoint: this.endpoint,
        parentSectionId: this.section.id,
        onTestRequest: this.onTestRequest,
        parentTestDisabled: this.testDisabled
      }
    }
  },
  methods: {
    displayDatatype(dataType) {
      const tuple = this.convertDataTypesToTuples([dataType])
      return tuple ? tuple[0][1] : ''
    },
    displayFunction(func) {
      const funcOption = this.functionOptions.find(option => option[0] === func)
      return funcOption ? funcOption[1] : ''
    },
    testRequest(section) {
      const payload = {
        ...section,
        requestId: section.id,
        requestName: section.name
      }

      if (typeof this.onTestRequest === 'function') {
        return this.onTestRequest(payload)
      }

      this.$bus.emit('test-request', payload)
    },
    onAdd(section) {
      section.data_type = '16bit_int_hi_first'
      section.first_reg = '1'
      section.no_brackets = '0'
      section.broadcast = '0'
      section.store_on_change_only = '0'
      section.enabled = '0'
    },
    isRequestOverlapping(section) {
      const sourcedRegisters = this.formOptions().sourcedRegisters.filter(reg => reg.enabled === '1' && reg.tag_source === 'modbus_client')
      return this.isRequestOverlappingRegisters(section, { tags: sourcedRegisters })
    },
    isDisabled(row) {
      const missingParams = []
      if (!row.name) missingParams.push(this.$t('name'))
      if (!row.function) missingParams.push(this.$t('function'))
      if (!row.first_reg) missingParams.push(this.$t('first register number'))
      if (!row.reg_count) missingParams.push(this.$t('register count / values'))
      if (missingParams.length > 0) {
        return this.$t('Request is missing required parameters (%s). Please fill them in to enable it.').format(missingParams.join(', '))
      }
      return false
    },
    getRowActions(s) {
      return [
        'edit',
        'delete',
        {
          name: 'test',
          callback: () => this.testRequest(s),
          label: this.$t('Test'),
          buttonProps: { disabled: this.testDisabled || s.data_type === 'pdu' }
        }
      ]
    }
  }
}
</script>
