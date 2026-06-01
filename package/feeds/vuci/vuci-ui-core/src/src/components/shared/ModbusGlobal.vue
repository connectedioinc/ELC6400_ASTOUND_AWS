<template>
  <vuci-form
    v-slot="{ uciData }"
    editing
    :after-load="initialLoad"
    config="modbus_client"
  >
    <vuci-named-section
      v-slot="{ s }"
      name="globals"
      :title="$t('Modbus client global settings')"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'modbus/client/global' }]"
      data-key="global"
      :after-save="afterSave"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enabled')"
        initial="0"
        :help="$t('Turn on/off Modbus client service.')"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Database location')"
        :help="$t('Select Modbus database location.')"
        name="db_path"
        :options="databaseOptions"
      />
      <tlt-form-model-item
        element-id="db_size"
        :help="$t('Current database size.')"
        :label="$t('Database size')"
      >
        <tlt-dummy-value :value="dbSize !== undefined ? `${dbSize} KiB` : '-'" />
      </tlt-form-model-item>
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Database size limit (KiB)')"
        :help="$t('Maximum amount of space that database will use. Will delete the oldest rows when the limit is reached. If 0 is used, the size will be unlimited.')"
        name="db_max_page_count"
        placeholder="1360"
        initial="1360"
        required
        :depend="s.db_path !== '/tmp/modbus_db'"
        :rules="validateDbSizeLimit"
        :load="loadDbSizeLimit"
        :save="saveDbSizeLimit"
      />
      <tlt-inline-message
        v-show="validateDbSizeLimit(s.db_max_page_count).isValid && dbSize && dbSize > s.db_max_page_count && s.db_max_page_count > 0"
        id="db-size-warning"
        type="warning"
        :message="$t('The new database size limit is smaller than the current size, so the oldest rows will be deleted.')"
      />
    </vuci-named-section>
  </vuci-form>
</template>

<script>
import { rules } from '@/validation-rules'

export default {
  inject: ['form', 'formOptions'],
  data() {
    return {
      pageSize: 4,
      globalSection: {}
    }
  },
  computed: {
    dbSize() {
      const dbPath = this.globalSection.db_path
      const dbSizeInPages = this.formOptions().dbSizesInPages[dbPath]
      if (dbSizeInPages === undefined) {
        return undefined
      }
      return Number(dbSizeInPages) * this.pageSize
    },
    databaseOptions() {
      const options = this.formOptions().mounts.map(device => {
        return [`${device.mountpoint}/modbus_db`, `${device.type.toUpperCase()} - ${device.description}`]
      })
      return [['/tmp/modbus_db', 'RAM'], ...options]
    }
  },
  methods: {
    initialLoad(form) {
      this.globalSection = form.global[0]

      if (this.globalSection.db_path === '/usr/local/share/modbus_db') {
        this.globalSection.db_path = '/tmp/modbus_db'
        this.globalSection.db_max_page_count = ''
      }

      // Removed this workaround after #23253 is resolved
      if (this.globalSection.db_path !== '/tmp/modbus_db' && !this.globalSection.db_max_page_count) {
        this.globalSection.db_max_page_count = '340'
      }
    },
    afterSave(_, form) {
      this.form().globalStatus = form.data.enabled === '1'
    },
    validateDbSizeLimit(value) {
      if (value === undefined) {
        return { isValue: true }
      }

      if (value !== '0') {
        const rangeResult = rules.irange(value, 16, 4000000)
        if (!rangeResult.isValid) {
          return rangeResult
        }
      }

      return {
        isValid: Number(value) % 4 == 0,
        message: this.$t('Must be divisible by 4')
      }
    },
    loadDbSizeLimit(self) {
      const section = self.uciSection
      if (section.db_max_page_count === '') return ''

      const amount = Number(section.db_max_page_count)
      return (amount * this.pageSize).toString()
    },
    saveDbSizeLimit(self) {
      const section = self.uciSection
      if (section.db_max_page_count === '') return ''

      const amount = Number(section.db_max_page_count)
      return Math.floor(amount / this.pageSize).toString()
    }
  }
}
</script>
