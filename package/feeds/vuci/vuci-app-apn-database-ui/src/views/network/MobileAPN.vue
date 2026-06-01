<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="simcard;operctl;overview"
    :after-load="afterLoad"
  >
    <vuci-typed-section
      ref="vuciSection"
      :uci-data="uciData"
      name="general"
      :title="$t('APN database')"
      :endpoints="[{ endpoint }]"
      data-key="apn"
      type="apn"
      :columns="apnColumns"
      :edit-form="editModal"
      :form-methods="['get', 'delete', 'create']"
      :table-actions="['column-list', 'search']"
      :exception-options="['id']"
      :add-title="$t('Add new entry')"
      pagination
      search
      @update:current-page="!loaded && $spin($t('Waiting for remaining data to be loaded'))"
    >
      <template #mcc="{ s }">
        <tlt-hint
          show-icon
          :hints="[{ info: s.country }]"
        >
          {{ s.mcc }}
        </tlt-hint>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.carrier"
          :label="$t('Carrier name')"
          :help="
            $t(
              'Carrier name - name of a company that sells wireless connectivity to customers for cellphone data and telephone calls. It may also be called a mobile network operator, a mobile carrier, cellular company or wireless service provider.'
            )
          "
          prop="carrier"
          rules="string"
          maxlength="32"
          required
        />
        <tlt-form-item-select
          v-model="addModel.mcc"
          :label="$t('Mobile country code')"
          :help="
            $t(
              'Mobile Country Code (MCC) - a mobile code consisting of three digits used to identify GSM networks. MCC is also used along with the International Mobile Subscriber Identity (IMSI) to identify the region from which mobile subscriber belongs.'
            )
          "
          :options="countries"
          prop="mcc"
          minlength="3"
          maxlength="3"
          rules="number_leading_zeros"
          allow-create
          required
        />
        <tlt-form-item-input
          v-model="addModel.mnc"
          :label="$t('Mobile network code')"
          :help="$t('Mobile Network Code (MNC) - a unique two or three-digit number used to identify a home Public Land Mobile Network (PLMN) to. MNC is allocated by the national regulator.')"
          prop="mnc"
          minlength="1"
          maxlength="3"
          rules="number_leading_zeros"
          required
        />
        <tlt-form-item-input
          v-model="addModel.apn"
          :label="$t('Access point name')"
          :help="$t('APN (Access Point Name) is configurable network identifier used by a mobile device when connecting to a carrier.')"
          prop="apn"
          rules="apn"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import EditForm from './MobileAPNEdit'

export default {
  provide() {
    return {
      countriesList: () => this.countries
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      apnColumns: [
        { name: 'carrier', label: this.$t('Carrier name'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
        {
          name: 'mcc',
          label: this.$t('Mobile country code'),
          displayFn: this.getReadableMcc,
          actions: { sort: true, filter: { type: 'uniqueValues' } }
        },
        { name: 'mnc', label: this.$t('Mobile network code'), actions: { sort: true } },
        { name: 'apn', label: this.$t('Access point name'), actions: { sort: true } },
        {
          name: 'pdptype',
          label: this.$t('PDP type'),
          displayFn: this.getReadablePdpType,
          actions: { sort: true, filter: { type: 'uniqueValues' } }
        },
        {
          name: 'authtype',
          label: this.$t('Authentication type'),
          displayFn: this.getReadableAuthType,
          actions: { sort: true, filter: { type: 'uniqueValues' } }
        }
      ],
      authTypeOptions: [
        ['0', this.$t('None')],
        ['1', 'PAP'],
        ['2', 'CHAP']
      ],
      pdpTypeOptions: [
        ['0', 'IPv4/IPv6'],
        ['1', 'IPv4'],
        ['2', 'IPv6']
      ],
      formData: { apn: [] },
      metadata: { total: 0, offset: 50 },
      loadingMessage: this.$t('Currently, only the first 50 APNs are displayed. The remaining APNs are being loaded in the background'),
      loaded: false,
      endpoint: 'apn_database/config?limit=50&offset=0',
      countries: []
    }
  },
  methods: {
    getReadableAuthType(s) {
      return this.authTypeOptions[s]?.[1] || ''
    },
    getReadablePdpType(s) {
      return this.pdpTypeOptions[s]?.[1] || ''
    },
    getReadableMcc(s, obj) {
      return '%s (%s)'.format(s, obj.country)
    },
    afterLoad() {
      return this.$axios
        .bulkGet(['/api/apn_database/config?limit=0&offset=0', '/api/modems/countries/status'])
        .then(([apns, countries]) => {
          if (countries.success) {
            this.countries = countries.data.map(country => [country.mcc, `${country.mcc} - ${country.country}`])
          } else {
            this.$message.error(this.$t('Failed to load country list'))
          }
          if (apns.success) {
            const emptyEntry = { '.type': 'apn', carrier: '-', mcc: '-', mnc: '-', apn: '-' }
            this.metadata.total = apns.metadata.total
            if (this.metadata.total > this.metadata.offset) {
              const emptyList = Array.from({ length: apns?.metadata?.total - this.metadata.offset }, () => emptyEntry)
              this.formData.apn = [...this.formData.apn, ...emptyList]
              this.$refs.vuciForm.updateUciData(this.formData.apn, 'apn')
              this.endpoint = 'apn_database/config'
              this.loadData(this.metadata.total - this.metadata.offset, this.metadata.offset)
            }
          } else {
            this.$message.error(this.$t('Failed to load APN data'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    loadData(limit, offset) {
      this.$notification.info(this.loadingMessage)
      return this.$axios
        .get(`/api/apn_database/config?limit=${limit}&offset=${offset}`)
        .then(res => {
          this.formData.apn.splice(offset, limit, ...res.data)
          this.metadata.offset = offset + limit
          this.$refs.vuciForm.updateUciData(this.formData.apn, 'apn')
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load APN data'))
        })
        .finally(() => {
          this.$notification.remove(this.loadingMessage)
          this.loaded = true
          this.$spin(false)
        })
    }
  }
}
</script>
