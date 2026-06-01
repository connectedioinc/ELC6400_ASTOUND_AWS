<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="sms_gateway"
    :after-load="afterLoad"
  >
    <modem-full-control-message />
    <vuci-typed-section
      v-slot="{ dataSource }"
      :uci-data="uciData"
      type="simman"
      :endpoints="[{ endpoint: 'messages/storage/config' }]"
      data-key="sms_storage"
      :title="defaultTitle"
      :after-save="onAfterSave"
      :before-save="onBeforeSave"
      :form-methods="['edit', 'get']"
    >
      <ListLayout bordered>
        <tlt-card
          v-for="s in dataSource"
          :key="s.id"
          :section-name="s.id"
          :title="getTitle(s)"
        >
          <vuci-form-item-select
            :uci-section="s"
            name="msg_storage"
            :label="$t('Save messages to')"
            :help="$t('Specify location where to save messages.')"
            :options="saveLocations"
            :readonly="getSmsStorageStatus(s).sim_inserted !== '1' || storageReadonly(s)"
            @change="validate"
          >
            <template
              v-if="getSmsStorageStatus(s).sim_inserted !== '1' || storageReadonly(s)"
              #after-content="{ controlRef }"
            >
              <tlt-tooltip
                :target="() => controlRef"
                placement="bottom-start"
                fallback-placements="top-start"
                :content="$t('Only sections with inserted and unlocked SIM cards can be edited.')"
              />
            </template>
          </vuci-form-item-select>
          <vuci-form-item-dummy
            :uci-section="s"
            name="memory"
            :label="$t('Memory')"
            :help="$t('Information about used/available memory.')"
            :display-value="loadSimStorage"
            no-write
          />
          <vuci-form-item-input
            :uci-section="s"
            name="free"
            :label="$t('Leave free space')"
            :help="$t('How much memory (number of messages) should be left free.')"
            placeholder="5"
            initial="1"
            :readonly="getSmsStorageStatus(s).sim_inserted !== '1' || getSmsStorageStatus(s).total === 0"
            :rules="getSmsStorageStatus(s).sim_inserted === '1' ? 'irange(1,%s)'.format(getSmsStorageStatus(s).total) : 'uinteger'"
          >
            <template
              v-if="getSmsStorageStatus(s).sim_inserted !== '1' || getSmsStorageStatus(s).total === 0"
              #after-content="{ controlRef }"
            >
              <tlt-tooltip
                :target="() => controlRef"
                placement="bottom-start"
                fallback-placements="top-start"
                :content="$t('Only sections with inserted and unlocked SIM cards can be edited.')"
              />
            </template>
          </vuci-form-item-input>
        </tlt-card>
      </ListLayout>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import ModemFullControlMessage from '@/components/shared/ModemFullControlMessage'
export default {
  components: { ModemFullControlMessage },
  data() {
    return {
      saveLocations: [
        ['sm', this.$t('SIM Card')],
        ['me', this.$t('Modem storage')]
      ],
      saveLocationsID: {
        sm: 1,
        me: 2
      },
      formData: { sms_storage: [] },
      smsStorageStatus: [],
      smsStorageNames: [],
      isStatusLoading: false,
      modemNames: {
        'Primary modem': this.$t('Primary modem'),
        'Secondary modem': this.$t('Secondary modem'),
        'External modem': this.$t('External modem'),
        'Internal modem': this.$t('Internal modem'),
        'Unknown modem': this.$t('Unknown modem')
      }
    }
  },
  computed: {
    defaultTitle() {
      if (this.formData?.sms_storage.length > 0) return ''
      return this.$t('SIM configuration')
    }
  },
  watch: {
    smsStorageStatus: {
      handler: function (newVal, oldVal) {
        this.ivokeSmsStorageStatus(newVal, oldVal)
      },
      deep: true
    }
  },
  created() {
    this.$notification.info(this.$t('Only sections with inserted and unlocked SIM cards can be edited.'))
  },
  timers: {
    loadSmsStorageStatus: { time: 3000, autostart: false, immediate: false, repeat: true }
  },
  methods: {
    onBeforeSave([typedSectionRequests]) {
      typedSectionRequests.data.forEach(section => {
        const sectionData = this.formData.sms_storage.find(s => s.id === section.id)
        if (this.getSmsStorageStatus(sectionData).sim_inserted !== '1') {
          delete section.msg_storage
          delete section.free
        }
      })
    },
    applyNames() {
      this.smsStorageNames = this.smsStorageStatus
    },
    ivokeSmsStorageStatus(newVal, oldVal) {
      this.formData.sms_storage.forEach(modem => {
        const newStatus = this.getSmsStorageStatus(modem, newVal)
        const oldStatus = this.getSmsStorageStatus(modem, oldVal)
        if (oldStatus.sim_inserted === '') return
        if (newStatus.sim_inserted !== oldStatus.sim_inserted) {
          this.invokeSimWarningMessage(newStatus, newStatus.sim_inserted === '1')
        }
      })
    },
    afterLoad() {
      return this.loadSmsStorageStatus().then(() => {
        this.$timer.start('loadSmsStorageStatus')
        this.applyNames()
      })
    },
    loadSmsStorageStatus() {
      if (this.isStatusLoading) return Promise.resolve()
      else this.isStatusLoading = true
      return this.$axios
        .get('/api/messages/storage/status')
        .then(({ data }) => {
          this.smsStorageStatus = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get sms storage data'))
        })
        .finally(() => {
          this.isStatusLoading = false
        })
    },
    loadSimStorage(_, { uciSection }) {
      const status = this.getSmsStorageStatus(uciSection)
      if (status.sim_inserted !== '1') return this.$t('N/A')
      return this.$t('Used: %s Available: %s').format(status.used, status.total)
    },
    onAfterSave(_, [saveRes], allInstances) {
      if (!saveRes.messages) return allInstances
      const removableModems = saveRes.messages.filter(m => m.code === 1).map(m => m.source)
      // Throws warning messages to non present modem instances
      const nonExistantInstances = this.formData.sms_storage.filter(s => removableModems.includes(s.id))
      nonExistantInstances.forEach(n => this.invokeLostModemMessage(n))
      // Filters non present modem instances from uciData
      const existantInstances = allInstances.filter(s => !removableModems.includes(s.id))
      this.formData.sms_storage = existantInstances
      this.applyNames()
      return existantInstances
    },
    getTitle(section) {
      const name = this.getModemName(section)
      return this.$t('%s SIM configuration').format(name)
    },
    invokeLostModemMessage(section) {
      const name = this.getModemName(section)
      return this.$message.info(this.$t('Lost connection to %s').format(name))
    },
    invokeSimWarningMessage(status, connected) {
      const name = this.getModemName(status)
      if (connected) this.$message.success(this.$t('%s SIM card detected').format(name))
      else this.$message.error(this.$t('Lost connection to %s SIM card').format(name))
    },
    getModemName(section) {
      const nameStatus = this.getSmsStorageStatus(section, this.smsStorageNames)
      // Reuse translations
      const modemName = this.modemNames[`${nameStatus.modem_type} modem`]
      if (nameStatus.modem_type === 'External') {
        return `${modemName} ${nameStatus.modem_index}`
      }
      return modemName
    },
    getSmsStorageStatus(modem, status = this.smsStorageStatus) {
      const storageStatus = status.find(e => e.modem_id === modem.modem_id)
      const storageID = this.saveLocationsID[modem.msg_storage]
      if (!storageStatus || !storageID || ![storageStatus.storage_id, storageStatus.alt_storage_id].includes(storageID)) {
        return {
          used: this.$t('N/A'),
          total: this.$t('N/A'),
          sim_inserted: '',
          modem_type: storageStatus?.modem_type || this.$t('Unknown')
        }
      }
      const isAlt = storageStatus.alt_storage_id === storageID
      return {
        used: isAlt ? storageStatus.alt_used : storageStatus.used,
        total: isAlt ? storageStatus.alt_total : storageStatus.total,
        sim_inserted: storageStatus.sim_inserted,
        modem_type: storageStatus.modem_type
      }
    },
    storageReadonly(modem) {
      const storageStatus = this.smsStorageStatus.find(e => e.modem_id === modem.modem_id) || {}
      return storageStatus.total === 0 || storageStatus.alt_total === 0
    },
    validate(self) {
      self.vuciSection.validate()
    }
  }
}
</script>
