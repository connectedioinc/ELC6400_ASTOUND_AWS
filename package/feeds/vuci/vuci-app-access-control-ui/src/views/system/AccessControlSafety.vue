<template>
  <tlt-table
    id="entry"
    ref="table"
    v-model:selected="checkedSections"
    :columns="blockedColumns"
    :bulk-actions="bulkActions"
    :per-page-text="$t('Entries per page')"
    :data-source="defaultDataLoader('/api/access_control/security/attempts/config')"
    :title="$t('Login attempts')"
    :table-actions="['refresh', 'column-list', { id: 'settings', label: $t('Settings'), buttonProps: { iconLeft: 'gear' }, callback: () => (showModal = true) }, 'search']"
    :row-actions="rowActions"
    @data-loaded-error="onError"
    @refresh="refresh"
  />
  <tlt-modal
    :open="showModal"
    :nav-bar="[$t('Settings')]"
    @close="closeModal"
  >
    <tlt-form
      ref="tltForm"
      :title="$t('IP block settings')"
      :model="form"
      sid="form"
    >
      <tlt-form-item-switch
        v-model="form.enabled"
        :label="$t('Enable')"
        :help="$t('Enable or disable blocking IP\'s if they have reached the set amount of failed times.')"
        true-value="1"
        false-value="0"
        prop="enable"
      />

      <tlt-form-item-radio-group
        v-model="form.enabled_time_based"
        :label="$t('Type')"
        :help="$t('You can choose an option of a blocking type.')"
        :disabled="$store.readOnlyPage"
        prop="blocking_type"
        :options="selectedType"
      />
      <tlt-form-item-input
        v-model="form.max_attempt_count"
        :label="$t('Fail count')"
        :help="$t('An amount of times IP can try to access via SSH or WebUI before being blocked.')"
        prop="max_attempt_count"
        placeholder="10"
        required
        :rules="v => [v.uinteger, v.range.bind(v, 1, 1000)]"
      />
      <tlt-form-item-switch
        v-model="form.reboot_clear"
        :label="$t('Clean after reboot')"
        true-value="1"
        false-value="0"
        prop="reboot_clear"
      />
    </tlt-form>
    <div class="flex justify-end list-layout--ignore">
      <tlt-button
        button-id="saveandapply"
        @click="saveModal"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </div>
  </tlt-modal>
</template>
<script>
import { defaultDataLoader } from '@ui-core/components/table'
import { isArray } from '@ui-core/utils/inspect'

export default {
  data() {
    return {
      showModal: false,
      form: {},
      checkedSections: [],
      blockedColumns: [
        { dataIndex: 'destination_ip', title: this.$t('Destination address'), displayFn: (_, dataRow) => dataRow.destination_ip ?? '-', actions: { sort: true } },
        { dataIndex: 'ip', title: this.$t('Source address'), displayFn: (_, dataRow) => this.getSourceMAC(dataRow), actions: { sort: true } },
        { dataIndex: 'mac', title: this.$t('MAC address'), displayFn: (_, dataRow) => dataRow.mac ?? '-', actions: { sort: true } },
        { dataIndex: 'port', title: this.$t('Device  port'), displayFn: (_, dataRow) => this.getPortProtocol(dataRow), actions: { sort: true } },
        { dataIndex: 'proto', title: this.$t('Protocol'), actions: { sort: true, filter: { type: 'uniqueValues' } } },
        { dataIndex: 'counter', title: this.$t('Failed attempts'), actions: { sort: true } },
        { dataIndex: 'status', title: this.$t('Status'), displayFn: (_, dataRow) => this.getStatusText(dataRow) }
      ],
      ready: false,
      routerTime: 0,
      selectedType: [
        {
          name: this.$t('Timed blocking'),
          value: '1'
        },
        {
          name: this.$t('Permanent blocking'),
          value: '0'
        }
      ],
      bulkActions: [{ id: 'delete', label: this.$t('Unblock selected'), buttonProps: { iconLeft: 'unblock' }, callback: this.onUnblockClick }]
    }
  },
  created() {
    this.getRouterData()
  },
  methods: {
    onError() {
      this.$message.error(this.$t('Failed to load login attempts data'))
    },
    saveModal() {
      return this.$refs.tltForm.validate().then(validationResult => {
        if (!validationResult.valid) return this.$message.error(this.$t('Some fields are invalid'))
        this.$spin()
        return this.$axios
          .put('/api/access_control/security/config', { data: [this.form] })
          .then(res => {
            this.form = res.data[0]
            this.$message.success(this.$t('Configuration has been applied'))
          })
          .catch(() => this.$message.error(this.$t('Failed to edit configuration')))
          .finally(() => {
            this.$refs.table.loadLazyData()
            this.showModal = false
            this.$spin(false)
          })
      })
    },
    getRouterData() {
      this.$spin()
      return this.$axios
        .bulkGet(['/api/system/device/usage/status?exclude=loadavg', '/api/access_control/security/config'])
        .then(([systemRes, securityData]) => {
          if (!systemRes.success) this.$message.error(this.$t("Failed to load device's time"))
          else this.routerTime = systemRes.data.localtime
          if (!securityData.success) this.$message.error(this.$t('Failed to load security data'))
          else {
            this.form = securityData.data[0]
            this.ready = true
            this.$refs.table.loadLazyData()
          }
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    /**
     * @param {Object} record - The record object.
     * @returns {string} - The status text.
     */
    getStatusText(record) {
      if (!this.ready) return '-'
      const maxAttemptCount = this.form.max_attempt_count
      const timeStamp = parseInt(record?.blocked_time) * 1000
      const timeNow = parseInt(this.routerTime) * 1000
      const timeDifference = timeNow - timeStamp
      const minutesBlocked = Math.floor(timeDifference / (1000 * 60)) + 1
      const blockedTimeOptions = { 1: 10, 2: 30, 3: 60 }
      const blockedTime = blockedTimeOptions[record?.iteration_count] || 0
      const isBlocked = parseInt(record?.counter) < parseInt(maxAttemptCount)
      if (isBlocked && isNaN(minutesBlocked) && isNaN(timeStamp)) return `Attempt count ${record?.counter} / ${maxAttemptCount}`
      if (record?.iteration_count === '0') return this.$t('Blocked permanently')
      const timeLeft = blockedTime - minutesBlocked
      const minutes = timeLeft === 1 ? this.$t('minute') : timeLeft < 1 ? this.$t('less than a minute') : this.$t('minutes')
      if (isNaN(timeLeft)) return '-'
      return timeLeft < 1 ? this.$t('Unblocked in %s').format(minutes) : this.$t('Unblocked in %s %s').format(timeLeft, minutes)
    },
    getSourceMAC(record) {
      return record.ip ?? record.phone ?? '-'
    },
    getPortProtocol(record) {
      if (!record.port && !record.proto) {
        return '-'
      }
      if (!record.proto) {
        return `${record.port ?? ''}`
      }
      return `${record.port} (${record.proto})`
    },
    rowActions() {
      return [{ id: 'remove', label: this.$t('Remove'), buttonProps: { color: 'error' }, callback: this.onUnblockClick }]
    },
    onUnblockClick(data) {
      const isMultiple = isArray(data)
      const title = data.length > 1 ? this.$t('Unblock selected login attempts list records?') : this.$t('Unblock selected login attempts list record?')
      const endpoint = `/api/access_control/security/attempts/config${isMultiple ? '' : '/' + data.id}`
      const dataToDelete = isMultiple ? { data: { data: isMultiple ? [...this.checkedSections] : data.id } } : null
      this.$prompt.show({
        title,
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Unblock'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.$spin()
          this.$axios
            .delete(endpoint, dataToDelete)
            .then(() => {
              this.$message.success(this.$t('Selected addresses cleared'))
            })
            .catch(() => {
              this.$message.error(this.$t('Failed to clear blocked IP list'))
            })
            .finally(() => {
              this.$refs.table.loadLazyData()
              this.$spin(false)
            })
        }
      })
    },
    refresh() {
      this.getRouterData()
      this.$refs.table.loadLazyData()
    },
    closeModal() {
      this.$prompt.show({
        title: this.$t('Go back?'),
        content: this.$t('Unsaved changes will be discarded'),
        okText: this.$t('Discard'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.showModal = false
        }
      })
    },
    defaultDataLoader
  }
}
</script>
