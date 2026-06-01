<template>
  <tlt-card
    :title="$t('Request configuration testing')"
    :help="$t('Here you can get information about your request configurations.')"
    :model="testForm"
    sid="testForm"
  >
    <tlt-form-item-select
      v-model="testForm.currentTest"
      :label="$t('Requests')"
      prop="currentTest"
      :help="$t('Current configurations that are not used in %s data sources.').format(tcpClient ? $t('Outstation') : $t('Serial Outstation'))"
      :options="requestOptions"
    />
    <tlt-form-model-item>
      <tlt-button @click="testRequest()">
        {{ $t('Test') }}
      </tlt-button>
    </tlt-form-model-item>
    <tlt-text-area
      custom-id="test-output"
      class="mt-2.5"
      rows="3"
      readonly
      :model-value="testResponse"
      :maxlength="null"
    />
  </tlt-card>
</template>

<script>
import { isRequestOverlappingRegisters } from './Dnp3CommonFunctionsMixin.vue'

export default {
  inject: ['formOptions'],
  props: {
    section: {
      type: Object,
      required: true
    },
    tcpClient: {
      type: Boolean,
      required: true
    },
    formData: {
      type: Object,
      required: true
    },
    formRef: {
      type: Object,
      default: () => ({})
    }
  },
  data() {
    return {
      testForm: {},
      testResponse: ''
    }
  },
  computed: {
    requestOptions() {
      const sourcedObjects = this.formOptions().sourcedObjects.filter(reg => reg.enabled === '1' && reg.tag_source === 'dnp3_client')
      return this.formData[this.section.id]
        ?.filter(request => {
          return !isRequestOverlappingRegisters(request, { tags: sourcedObjects })
        })
        .map(s => [s.id, s.name])
    },
    selectedTest() {
      return this.formData[this.section.id]?.find(s => s.id === this.testForm.currentTest) || {}
    }
  },
  methods: {
    async testRequest() {
      if (this.requestOptions.length === 0) {
        this.testResponse = this.$t('Test failed - %s').format(this.$t('There was no request to test'))
        return
      }
      if (!(await this.formRef.validate())) {
        this.testResponse = this.$t('Test failed - %s').format(this.$t('Some fields are invalid'))
        return
      }
      let data
      if (this.tcpClient) {
        data = {
          local_addr: this.section.local_addr,
          remote_addr: this.section.remote_addr,
          timeout: this.section.timeout,
          ip: this.section.ip,
          port: this.section.port,
          data_type: this.selectedTest.data_type,
          index: this.selectedTest.index,
          count: this.selectedTest.count
        }
      } else {
        data = {
          local_addr: this.section.local_addr,
          remote_addr: this.section.remote_addr,
          timeout: this.section.timeout,
          data_type: this.selectedTest.data_type,
          index: this.selectedTest.index,
          count: this.selectedTest.count,
          device: this.section.device,
          baudrate: this.section.baudrate,
          databits: this.section.databits,
          flowcontrol: this.section.flowcontrol,
          parity: this.section.parity,
          stopbits: this.section.stopbits,
          time_duration: this.section.time_duration
        }
      }
      this.$spin(this.$t('Loading'))
      return this.$axios
        .post(`/api/dnp3/${this.tcpClient ? 'tcp' : 'serial'}/actions/test_request`, { data })
        .then(resp => {
          this.testResponse = resp.data.response !== 'Tests failed' ? resp.data.data.join(' ') : this.$t('Test failed')
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$spin(false)
        })
    }
  }
}
</script>
