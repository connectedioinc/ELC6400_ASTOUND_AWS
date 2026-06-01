<template>
  <vuci-form
    :after-load="loadData"
    config="status"
  >
    <tlt-table
      id="services"
      :columns="serviceColumns"
      :data-source="services"
      :title="$t('Services')"
      :help="
        $t(
          'This section displays the status of the\
      router\'s services. Next to the name of each service\
      you will find a button called \'Change Settings\' which\
      redirects the user to the respective\
      service\'s configuration windows.'
        )
      "
      @refresh="loadData"
    >
      <template #service="{ record }">
        <tlt-form-model-item
          element-id="service"
          label=""
        >
          <tlt-dummy-value :value="$t(record.service)" />
        </tlt-form-model-item>
      </template>
      <template #enabled="{ record }">
        <tlt-form-model-item
          element-id="enabled"
          label=""
        >
          <tlt-dummy-value
            :class="parseEnabledColor(record.enabled)"
            :value="parseEnabledStatus(record.enabled)"
          />
        </tlt-form-model-item>
      </template>
      <template #status="{ record }">
        <tlt-form-model-item
          element-id="status"
          label=""
        >
          <tlt-dummy-value
            class="border rounded-full px-4 lg:pt-0 lg:pb-0"
            :class="parseStatusdColor(record.status)"
            :value="parseStatus(record.status)"
          />
        </tlt-form-model-item>
      </template>
      <template #path="{ record }">
        <div class="lg:flex lg:justify-end">
          <tlt-button
            button-id="settings"
            type="text"
            size="md"
            icon-left="external-link"
            @click="redirectToPage(record.path)"
          >
            {{ $t('Settings') }}
          </tlt-button>
        </div>
      </template>
    </tlt-table>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      serviceColumns: [
        { dataIndex: 'service', title: this.$t('Service'), actions: { sort: true, filter: { type: 'uniqueValues' } }, width: 'md' },
        { dataIndex: 'enabled', title: this.$t('State'), actions: { sort: true, filter: { type: 'uniqueValues' } }, displayFn: this.parseEnabledStatus, width: 'md' },
        { dataIndex: 'status', title: this.$t('Status'), actions: { sort: true, filter: { type: 'uniqueValues' } }, displayFn: this.parseStatus, width: 'md' },
        { dataIndex: 'path', title: this.$t('Actions'), width: 'w-16' }
      ],
      services: [],
      enabledCodes: {
        0: this.$t('Disabled'),
        1: this.$t('Enabled'),
        2: this.$t('Standby'),
        default: '-'
      },
      enabledColors: {
        0: 'text-theme-text-subtle',
        1: 'success',
        2: 'text-theme-text-warning',
        default: 'text-theme-text-subtle'
      },
      statusCode: {
        Running: this.$t('Running'),
        Disabled: this.$t('Disabled'),
        Standby: this.$t('Standby'),
        default: this.$t('Down')
      },
      statusColors: {
        Running: 'success border-theme-text-success',
        Disabled: 'disabled border-theme-text-secondary-subtle text-theme-text-secondary-subtle',
        Standby: 'border-theme-text-warning text-theme-text-warning',
        default: 'error border-theme-text-danger'
      }
    }
  },
  methods: {
    loadData() {
      this.$spin()
      return this.$axios
        .get('/api/services/status')
        .then(({ data }) => {
          this.services = data.sort((a, b) => {
            const aRunning = a.enabled === '1' && a.status === 'Running'
            const bRunning = b.enabled === '1' && b.status === 'Running'
            if (aRunning !== bRunning) return bRunning ? 1 : -1
            if (a.enabled !== b.enabled) return b.enabled === '1' ? 1 : -1
            return 0
          })
        })
        .catch(() => {
          this.$message.error('Failed to load services status')
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    redirectToPage(val) {
      return this.$router.push(val)
    },
    parseStatus(code) {
      return this.statusCode[code] || this.statusCode.default
    },
    parseStatusdColor(code) {
      return this.statusColors[code] || this.statusColors.default
    },
    parseEnabledStatus(code) {
      return this.enabledCodes[code] || this.enabledCodes.default
    },
    parseEnabledColor(code) {
      return this.enabledColors[code] || this.enabledColors.default
    }
  }
}
</script>
