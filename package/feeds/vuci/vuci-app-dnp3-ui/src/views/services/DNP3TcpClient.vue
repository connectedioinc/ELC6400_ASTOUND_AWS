<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    :after-load="uciData => afterLoad(uciData, 'tcp')"
    config="dnp3_client"
  >
    <tlt-card
      :title="$t('General status')"
      :help="$t('This section displays DNP3 Client general status information.')"
      class="[&>div.card-content]:pb-4"
    >
      <tlt-form-model-item
        :help="$t('Displays the current status of the service. Shows whether the service is running and, if active, indicates the duration it has been running.')"
        :label="$t('Status')"
      >
        <tlt-dummy-value
          :value="isStatusGood ? $t('Up') : $t('Down')"
          :class="isStatusGood ? 'success' : 'error'"
        />
        <tlt-dummy-value
          v-if="isStatusGood"
          :value="displayUptime(dnp3StatusData.uptime)"
        />
      </tlt-form-model-item>
    </tlt-card>
    <vuci-typed-section
      type="tcp_client"
      :title="$t('TCP clients')"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'dnp3/tcp/config' }]"
      :uci-data="uciData"
      data-key="dnp3"
      :global-settings-form="dnp3Global"
      :after-delete="clearRequests"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          v-slot="{ props: { columns } }"
          :test-id="`rowCard-${s.id}`"
          class="mb-4 last:mb-0"
          :card-props="overviewColumns(s)"
        >
          <name-cell
            class="lg:w-[14%]"
            :index="index + 1"
            :value="s.name || '-'"
          />
          <card-cell
            v-for="(column, cIdx) in columns"
            :key="cIdx"
          >
            <cell-row
              v-for="(row, rIdx) in column"
              :key="rIdx"
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
            <vuci-form-item-switch
              class="lg:min-w-max mb-0"
              :uci-section="s"
              name="enabled"
              :readonly="!canToggleEnable(s)"
              :hints="getEnableHint(s)"
            />
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import { useMainStore } from '@/stores/main'
import { mapState } from 'pinia'
import EditForm from './DNP3TcpClientEdit.vue'
import dnp3Global from './DNP3Global.vue'
import commonFunctions from './Dnp3CommonFunctionsMixin.vue'

export default {
  mixins: [commonFunctions],
  provide() {
    return {
      formOptions: () => this.formOptions,
      form: () => this.globalEnabled
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      dnp3Global: markRaw(dnp3Global),
      formData: {},
      dnp3StatusData: {}
    }
  },
  computed: {
    ...mapState(useMainStore, ['modalOpen']),
    isStatusGood() {
      return this.dnp3StatusData.uptime !== undefined
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 3000, autostart: true, immediate: true })
  },
  methods: {
    canToggleEnable(section) {
      return section.name && section.ip && section.port && section.local_addr && section.remote_addr && section.integrity_period && section.timeout
    },
    getEnableHint(section) {
      return !this.canToggleEnable(section) ? [{ info: this.$t('Cannot enable instance when required values are missing. Navigate to edit modal to fill the missing values') }] : []
    },

    updateStatus() {
      return this.$axios
        .get('/api/dnp3/tcp/status')
        .then(({ data }) => {
          this.dnp3StatusData.uptime = data.uptime
          this.formData.dnp3.forEach(dnp => {
            dnp.content = data.clients?.find(s => s.id === dnp.id)
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status data'))
        })
    },
    overviewColumns(item) {
      const statusData = item.content || {}
      const isStatusGood = statusData?.connected

      const columns = [
        [
          {
            label: this.$t('Status'),
            value: isStatusGood ? this.$t('Up') : this.$t('Down'),
            class: isStatusGood ? 'success' : 'error'
          },
          { label: this.$t('IP'), value: this.displayInfo(item.ip) },
          { label: this.$t('Port'), value: this.displayInfo(item.port) }
        ],
        [
          { label: this.$t('Local Address'), value: this.displayInfo(item.local_addr) },
          { label: this.$t('Remote Address'), value: this.displayInfo(item.remote_addr) }
        ],
        [
          { label: this.$t('Successful requests'), value: this.displayNumber(statusData?.successful_request_count) },
          { label: this.$t('Failed requests'), value: this.displayNumber(statusData?.failed_request_count) }
        ]
      ]

      return { item, columns }
    },
    displayNumber(num) {
      return num ?? '-'
    },
    displayUptime(time) {
      return time || time === 0 ? '(%t)'.format(time) : ''
    },
    displayInfo(value) {
      return value || '-'
    }
  }
}
</script>
