<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="ddns"
    config="ddns"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="service"
      :uci-data="uciData"
      :edit-form="dynamicDNSEditModal"
      :title="$t('Dynamic DNS overview')"
      :help="
        $t(
          'This section displays a list of existing DDNS instances.\
        If you wish to edit the settings of an instance,\
        click the button that looks like a pencil next to it.'
        )
      "
      data-key="service"
      :endpoints="[{ endpoint: 'ddns/config' }]"
      :error-handlers="{
        edit: handleEditErrors
      }"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          :card-props="overviewColumns(s)"
          class="mb-4 last:mb-0"
        >
          <name-cell
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
                <span :class="row.class">{{ row.value }}</span>
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
            <cell-row
              :label="$t('Enable')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-item-switch
                  class="xl:min-w-max"
                  :uci-section="s"
                  name="enabled"
                  @change="rebindProtectionWarning(s.enabled === '1')"
                />
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('DDNS name')"
          :help="$t('Name of the new DDNS.')"
          prop="id"
          :rules="v => [v.uciname, instanceExists]"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import dynamicDNSEdit from './DynamicDNSEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      dynamicDNSEditModal: markRaw(dynamicDNSEdit),
      dateTranslations: {
        _runonce_: this.$t('Run once'),
        _disabled_: this.$t('Disabled'),
        _stopped_: this.$t('Stopped'),
        _never_: this.$t('Never'),
        _neverupdated_: '-'
      },
      ddns: {},
      statuses: {},
      formOptions: {
        interfaceData: [],
        openVpnData: [],
        rebindProtection: false,
        hasSsl: false,
        providerData: {},
        providerDataIPv6: {}
      }
    }
  },
  methods: {
    rebindProtectionWarning(enabled) {
      if (enabled && this.formOptions.rebindProtection) {
        this.$notification.warning({
          id: 'rebind-enabled-warning',
          title: this.$t('Rebind protection enabled'),
          text: this.$t('It is recommended to disable rebind protection when using DDNS in a private network.'),
          action: {
            text: this.$t('Go to DNS'),
            to: '/network/dns/general'
          }
        })
      } else this.$notification.remove({ id: 'rebind-enabled-warning' })
    },
    overviewColumns(item) {
      const data = this.statuses[item.id]
      return {
        item,
        columns: [
          [
            { label: this.$t('Status'), value: this.getStatus(data), class: data?.is_up ? 'success' : 'error' },
            { label: this.$t('Hostname'), value: data?.lookup || '-' },
            { label: this.$t('IP'), value: data?.reg_ip || '-' }
          ],
          [
            { label: this.$t('Last Update'), value: this.getDateTranslation(item.id, 'datelast') },
            { label: this.$t('Next Update'), value: this.getDateTranslation(item.id, 'datenext') }
          ],
          [
            { label: this.$t('Check Interval'), value: data?.check || '-' },
            { label: this.$t('Force Interval'), value: data?.force || '-' }
          ]
        ]
      }
    },
    getDateTranslation(name, field) {
      const status = this.statuses[name]
      if (!status) return '-'
      return this.dateTranslations[status[field]] || status[field]
    },
    getStatus(section) {
      return section?.is_up ? this.$t('Up') : this.$t('Down')
    },
    getFormOptions() {
      return this.formOptions
    },
    loadData() {
      const endpoints = ['/api/interfaces/config', '/api/ddns/options', '/api/openvpn/config', '/api/dns/config']
      return this.$axios
        .bulkGet(endpoints)
        .then(([iRes, dRes, openVpnRes, dnsConfigRes]) => {
          this.formOptions = {
            rebindProtection: dnsConfigRes.success ? dnsConfigRes.data?.[0]?.rebind_protection === '1' : this.formOptions.rebindProtection,
            openVpnData: openVpnRes.success ? openVpnRes.data : this.formOptions.openVpnData,
            interfaceData: iRes.success ? iRes.data : this.formOptions.interfaceData,
            hasSsl: dRes.success ? dRes.data.env_info.has_ssl : this.formOptions.hasSsl,
            providerData: dRes.success ? dRes.data.service_providers : this.formOptions.providerData,
            providerDataIPv6: dRes.success ? dRes.data.service_providers_ipv6 : this.formOptions.providerDataIPv6
          }
          this.rebindProtectionWarning(true)
          return {}
        })
        .finally(() => {
          this.$timer.start({ method: this.getDdnsStatuses, time: 5000, autostart: true, immediate: false })
        })
    },
    getDdnsStatuses() {
      return this.$axios
        .get('/api/ddns/status')
        .then(({ data }) => {
          this.statuses = {}
          data.forEach(s => {
            this.statuses[s.section] = s
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get DDNS instances status'))
        })
    },
    instanceExists(val) {
      if (this.ddns.service.some(o => o.id === val)) {
        return { isValid: false, message: this.$t("Instance '%s' already exists").format(val) }
      }
      return { isValid: true }
    },
    handleEditErrors(response) {
      const failedConfiguration = response.payload[0].errors[0].section
      return this.$t("Saving failed: DDNS instance '%s' cannot be enabled due to invalid configuration").format(failedConfiguration)
    }
  }
}
</script>
