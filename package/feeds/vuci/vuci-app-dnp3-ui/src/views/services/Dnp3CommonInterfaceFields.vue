<template>
  <vuci-typed-section
    type="instance"
    :title="$utils.getModalTitle($t('requests'))"
    :table-actions="['column-list', 'search']"
    :uci-data="uciData"
    :data-key="section.id"
    :endpoints="[{ endpoint: `dnp3/${tcpClient ? 'tcp' : 'serial'}/${section.id}/requests/config` }]"
    :columns="requestColumns"
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
    <template #index="{ s }">
      <vuci-form-item-input
        :uci-section="s"
        name="index"
        rules="irange(0,65535)"
        initial="0"
        placeholder="0"
        required
        @change="updateCountValidations"
      />
    </template>
    <template #count="{ s }">
      <vuci-form-item-input
        :uci-section="s"
        name="count"
        initial="0"
        placeholder="0"
        :rules="['irange(0,65535)', validateCount]"
        required
      />
    </template>
    <template #data_type="{ s }">
      <vuci-form-item-select
        :uci-section="s"
        name="data_type"
        :options="dataOptions"
        required
      />
    </template>
    <template #enabled="{ s }">
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
      />
    </template>
    <template #addForm="{ addModel }">
      <tlt-form-item-input
        v-model="addModel.name"
        :label="$t('New configuration name')"
        prop="name"
        rules="uciname"
        required
      />
    </template>
  </vuci-typed-section>
</template>

<script>
import DataSourceHint from '@/components/shared/UniversalGatewayUtilities/DataSourceHint.vue'
import { isRequestOverlappingRegisters } from './Dnp3CommonFunctionsMixin.vue'

export default {
  components: { DataSourceHint },
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    },
    uciData: {
      type: Object,
      required: true
    },
    tcpClient: {
      type: Boolean,
      required: true
    }
  },
  data() {
    return {
      formData: {},
      dataOptions: [
        ['1', this.$t('Binary')],
        ['3', this.$t('Double Binary')],
        ['20', this.$t('Counter')],
        ['21', this.$t('Frozen Counter')],
        ['30', this.$t('Analog')],
        ['110', this.$t('Octet String')],
        ['40', this.$t('Analog Output Status')],
        ['10', this.$t('Binary Output Status')]
      ],
      requestColumns: [
        { name: 'name', label: this.$t('Name'), help: this.$t('Name of the instance.') },
        { name: 'index', label: this.$t('Start Index'), help: this.$t('Start index of the data subarray.') },
        { name: 'count', label: this.$t('End Index'), help: this.$t('End index of the data subarray.') },
        { name: 'data_type', label: this.$t('Data type'), help: this.$t('Data type.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ]
    }
  },
  computed: {
    tagConsumersByRequestId() {
      const requestIdsByTagId = this.uciData[this.section.id].reduce((acc, req) => {
        acc[`${this.section.id}.${req.id}`] = req.id
        return acc
      }, {})
      return Object.entries(this.formOptions().tagStatus).reduce((acc, [service, tags]) => {
        Object.values(tags).forEach(tag => {
          const reqId = requestIdsByTagId[tag.tag_id]
          if (reqId) {
            acc[reqId] ||= []
            acc[reqId].push(service)
          }
        })
        return acc
      }, {})
    }
  },
  methods: {
    updateCountValidations(self) {
      self.vuciSection.validate()
    },
    validateCount(value, self) {
      const index = Number(self.uciSection.index)
      if (isNaN(index) || index > value) {
        return { isValid: false, message: this.$t('End of the index must be greater or equal to the start.') }
      } else {
        return { isValid: true }
      }
    },
    isRequestOverlapping(section) {
      const sourcedObjects = this.formOptions().sourcedObjects.filter(reg => reg.enabled === '1' && reg.tag_source === 'dnp3_client')
      return isRequestOverlappingRegisters(section, { tags: sourcedObjects })
    }
  }
}
</script>
