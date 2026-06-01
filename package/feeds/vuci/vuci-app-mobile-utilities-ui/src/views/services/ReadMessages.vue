<template>
  <modem-full-control-message />
  <tlt-card
    v-show="modemOptions.length > 1"
    sid="modem_messages"
    :title="$t('Modem')"
  >
    <tlt-form-item-select
      v-model="modem"
      prop="modem"
      :label="$t('Modem')"
      :help="$t('Select modem from which the messages are read.')"
      :options="modemOptions"
    />
  </tlt-card>
  <tlt-table
    id="messages"
    ref="readMessages"
    :columns="smsColumns"
    :data-source="showingMessages"
    :no-value-text="$t('There are no messages')"
    :per-page-text="$t('SMS per page')"
    pagination
    sid="read_messages"
    :title="$t('SMS messages')"
    :help="
      $t(
        'This section displays a list of SMS messages stored in the router\'s SIM card. Click on \'SMS per page\' \
            dropdown menu to view more entries at a time or on column names in order to filter messages based on date received, \
            sender\'s number, status or message text.'
      )
    "
    :bulk-actions="[{ id: 'delete', label: $t('Delete'), buttonProps: { iconLeft: 'delete' }, callback: deletePrompt }]"
    :row-actions="record => [{ id: 'delete', label: $t('Delete'), buttonProps: { color: 'error' }, callback: () => deletePrompt([record.id]) }]"
    :table-actions="[
      {
        id: 'refresh',
        callback: () => loadMessages(),
        buttonProps: { disabled: areMessagesLoading && !formLoading, iconLeft: 'refresh' },
        label: $t('Refresh')
      },
      'column-list',
      'search'
    ]"
  >
    <template
      v-if="areMessagesLoading && !formLoading"
      #emptySection
    >
      <div class="flex flex-col items-center">
        <tlt-icon
          icon="spinner"
          class="text-theme-text-primary items-center mt-4 size-16"
          animate
        />
        <span class="font-bold">{{ $t('Loading messages...') }}</span>
      </div>
    </template>
  </tlt-table>
</template>
<script>
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
import { useMainStore } from '@/stores/main'
import { mapState } from 'pinia'
export default {
  components: { ModemFullControlMessage },
  data() {
    return {
      modem: '',
      smsColumns: [
        { dataIndex: 'date', title: this.$t('Date'), actions: { sort: true } },
        { dataIndex: 'sender', title: this.$t('Sender'), actions: { sort: true } },
        { dataIndex: 'status', title: this.$t('Status'), actions: { sort: true } },
        { dataIndex: 'message', title: this.$t('Message'), width: 'lg', actions: { sort: true } }
      ],
      allMessages: [],
      modems: [],
      areMessagesLoading: false
    }
  },
  computed: {
    ...mapState(useMainStore, ['formLoading']),
    modemOptions() {
      return this.$mobile.modemsOptions(this.modems)
    },
    selectedModem() {
      const modemId = this.modemOptions[0] ? this.modemOptions[0][0] : ''
      return this.modemOptions.length > 1 ? this.modem : modemId
    },
    showingMessages() {
      return this.allMessages.filter(msg => msg.modemID === this.selectedModem)
    }
  },
  async created() {
    await this.loadData()
    await this.loadMessages()
    this.$bus.on('received_sms', this.loadMessages)
  },
  beforeUnmount() {
    this.$bus.off('received_sms', this.loadMessages)
  },
  methods: {
    loadData() {
      this.$spin()
      return this.$axios
        .get('/api/modems/status')
        .then(({ data }) => {
          this.modems = this.$mobile.parseModems(data)
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modem data'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    loadMessages() {
      this.areMessagesLoading = true
      this.allMessages = []
      return this.$axios
        .get('/api/messages/status')
        .then(({ data }) => {
          this.allMessages = data.map(msg => ({
            date: msg.date,
            timestamp: new Date(msg.date).getTime(),
            sender: msg.sender,
            status: msg.status,
            message: msg.message,
            id: msg.id,
            modemID: msg.modem_id,
            checked: false
          }))
        })
        .catch(err => {
          if (err?.response?.data?.errors[0]?.code === 10) {
            this.$message.error(this.$t('Failed to load SMS messages. Modem is blocked or disabled'))
          } else {
            this.$message.error(this.$t('Failed to load SMS messages'))
          }
        })
        .finally(() => {
          this.areMessagesLoading = false
        })
    },
    deletePrompt(selected) {
      this.$prompt.show({
        title: selected.length === this.showingMessages.length ? this.$t('Delete all messages?') : this.$t('Delete selected messages?'),
        content: this.$t('This process cannot be undone.'),
        okText: this.$t('Delete'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.deleteMessages(selected)
      })
    },
    deleteMessages(selected) {
      if (this.showingMessages.length === 0) {
        return this.$message.error(this.$t('There are no messages to delete'))
      }
      const spinMessage = selected.length === this.showingMessages.length ? this.$t('Deleting all messages...') : this.$t('Deleting selected messages...')
      if (selected.length === 0) {
        return this.$message.error(this.$t('Please select messages to delete'))
      }
      this.$spin(spinMessage)
      return this.$axios
        .post(`/api/messages/actions/remove_messages`, {
          data: { modem_id: this.selectedModem, sms_id: selected }
        })
        .then(() => {
          this.$message.success(this.$t('Message(s) deleted successfully'))
          return this.loadMessages()
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
<style scoped>
.button-positioning {
  display: flex;
  justify-content: flex-end;
  padding: 10px 0;
}
</style>
