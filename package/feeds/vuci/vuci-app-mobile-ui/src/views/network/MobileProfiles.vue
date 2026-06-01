<template>
  <vuci-form
    ref="vuciForm"
    v-slot="{ uciData }"
    v-model="formData"
    config="esim"
    :after-load="updateStatus"
  >
    <tlt-card :title="$t('Status')">
      <tlt-form-model-item
        label="eSIM ID:"
        element-id="id"
      >
        <tlt-dummy-value :value="currentStatus.eid" />
      </tlt-form-model-item>
      <tlt-form-model-item
        element-id="notifications"
        :label="$t('Pending notifications')"
      >
        <tlt-hint :hints="!parseNotifications.length ? $t('Currently no pending notifications available.') : ''">
          <tlt-button
            id="notifications"
            button-id="notifications"
            color="tertiary"
            :readonly="!parseNotifications.length"
            @click="showModal = true"
          >
            {{ $t('Show notifications') }}
          </tlt-button>
        </tlt-hint>
        <tlt-modal
          :open="showModal"
          :title="$t('Pending notifications')"
          size="small"
          @close="showModal = false"
        >
          <tlt-table
            id="pending_notifications"
            class="mb-8"
            :columns="notificationColumns"
            :data-source="parseNotifications"
            :no-value-text="$t('Currently no pending notifications available.')"
          />
          <template #actions>
            <div class="flex gap-8 justify-center lg:justify-end mx-1">
              <tlt-button
                button-id="cancel"
                color="secondary"
                @click="showModal = false"
              >
                {{ $t('Cancel') }}
              </tlt-button>
              <tlt-button
                button-id="process"
                @click="showPrompt"
              >
                {{ $t('Process notifications') }}
              </tlt-button>
            </div>
          </template>
        </tlt-modal>
      </tlt-form-model-item>
      <tlt-inline-message
        id="esim-msg"
        type="info"
      >
        <template v-if="eSimNotFound">
          {{ $t('eSIM is not selected as the active SIM.') }}
          <span class="flex-wrap">
            {{ $t('To set eSIM as the active SIM, go to') }}
            <link-to-page
              :path="generalPath"
              :custom-name="$t('General page')"
            />
          </span>
        </template>
        <template v-else>
          {{ $t("Most actions depend on an internet connection. Please check your connection if you're experiencing issues.") }}
        </template>
      </tlt-inline-message>
    </tlt-card>
    <vuci-typed-section
      type="profile"
      :uci-data="uciData"
      :title="$t('eSIM profiles')"
      :help="$t('eSIM profiles configuration.')"
      :endpoints="[{ endpoint: `esim/config?modem=${sectionModem}` }]"
      data-key="profile"
      :edit-form="MobileProfilesEdit"
      :form-methods="eSimNotFound ? ['get'] : ['get', 'delete']"
      :no-value-text="eSimNotFound ? $t('No eSIM detected') : $t('There are no eSIM profiles, add new profile')"
    >
      <template #custom-design="{ s, index, actions }">
        <tlt-horizontal-card
          :card-props="parseCard(s)"
          :index="index"
          class="mb-4 last:mb-0"
        >
          <name-cell
            :index="index + 1"
            :value="s.name || s.id"
          />
          <card-cell
            v-for="(column, cIdx) in parseCard(s, index + 1).columns"
            :key="cIdx"
            :columns="column"
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
              :label="$t('Profile enable')"
              class="xl:w-40 w-14"
            >
              <template #value>
                <span
                  v-if="s.enabled === '1'"
                  class="success"
                >
                  {{ $t('Enabled') }}
                </span>
                <template v-else>
                  <tlt-hint :hints="getHintMsg(s)">
                    <tlt-button
                      id="enabled"
                      button-id="enabled"
                      type="text"
                      :readonly="disableFields"
                      @click="enablePrompt(s)"
                    >
                      {{ $t('Enable') }}
                    </tlt-button>
                  </tlt-hint>
                </template>
              </template>
            </cell-row>
          </action-cell>
          <action-cell>
            <cell-row
              :label="$t('Actions')"
              only-mobile-label
            >
              <template #value>
                <vuci-form-edit-delete
                  :id="s.id"
                  :actions="actions"
                >
                  <template #edit="{ openEdit }">
                    <tlt-hint :hints="getHintMsg(s)">
                      <tlt-button
                        button-id="edit"
                        type="text"
                        icon-left="edit"
                        :readonly="disableFields"
                        @click="openEdit(s.id)"
                      >
                        {{ $t('Edit') }}
                      </tlt-button>
                    </tlt-hint>
                  </template>
                  <template #delete>
                    <tlt-hint :hints="getHintMsg(s, true)">
                      <tlt-button
                        button-id="delete"
                        type="text"
                        color="error"
                        :readonly="disableFields || bootstrapProfile(s)"
                        @click="showDeletePrompt = s.id"
                      >
                        {{ $t('Delete') }}
                      </tlt-button>
                    </tlt-hint>
                  </template>
                </vuci-form-edit-delete>
              </template>
            </cell-row>
          </action-cell>
        </tlt-horizontal-card>
      </template>
    </vuci-typed-section>
    <mobile-profile-download
      v-if="!eSimNotFound"
      :profiles="formData.profile || []"
      :download-btn="downloadStatus"
      :modem-id="sectionModem"
      @disable-download="disableDownload = true"
    />
    <tlt-modal
      :open="!!showDeletePrompt"
      size="small"
      :title="$t('Delete this eSIM profile?')"
      hide-navigation
      @close="showDeletePrompt = false"
    >
      <div class="mb-8 text-base">
        {{ deleteMsg }}
      </div>
      <template #actions>
        <div class="flex gap-8 justify-center lg:justify-end mx-1">
          <tlt-button
            button-id="cancel"
            color="secondary"
            @click="showDeletePrompt = false"
          >
            {{ $t('Cancel') }}
          </tlt-button>
          <tlt-button
            v-if="lastProfile"
            button-id="skip"
            @click="deleteProfile(showDeletePrompt, true)"
          >
            {{ $t('Delete & stay on eSIM') }}
          </tlt-button>
          <tlt-button
            button-id="ok"
            @click="deleteProfile(showDeletePrompt)"
          >
            {{ $t('Delete') }}
          </tlt-button>
        </div>
      </template>
    </tlt-modal>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import MobileProfilesEdit from './MobileProfilesEdit.vue'
import MobileProfileDownload from '../../components/network/MobileProfileDownload'
import LinkToPage from '@/components/shared/LinkToPage.vue'

export default {
  components: {
    LinkToPage,
    MobileProfileDownload
  },
  data() {
    return {
      MobileProfilesEdit: markRaw(MobileProfilesEdit),
      formData: {},
      statuses: [],
      events: {
        0: this.$t('Install profile'),
        1: this.$t('Enable profile'),
        2: this.$t('Disable profile'),
        3: this.$t('Delete profile'),
        default: this.$t('Unknown')
      },
      notificationErrors: {
        1: this.$t('Failed to process notifications'),
        6: this.$t('Failed to process notifications'),
        11: this.$t('Failed to process notifications, no connection to the server'),
        default: this.$t('Device has no pending notifications')
      },
      notificationColumns: [
        { dataIndex: 'event', title: this.$t('Event'), help: this.$t('Pending notification type.') },
        { dataIndex: 'address', title: this.$t('Address'), help: this.$t('Server address of pending notification.') },
        { dataIndex: 'iccid', title: 'ICCID', help: this.$t('ICCID of pending notification eSIM.') }
      ],
      showModal: false,
      showDeletePrompt: false,
      disableDownload: false,
      disableDownloadMsg: this.$t('Profile download is in progress'),
      bootstrapMsg: this.$t(
        'This eSIM profile is specifically designated to enable initial connectivity. Due to its critical function, it cannot be manually removed. Please note, once a new eSIM profile is successfully downloaded and activated, this bootstrap profile will be automatically removed.'
      )
    }
  },
  computed: {
    sectionModem() {
      return this.$route.path.substring(this.$route.path.lastIndexOf('/') + 1)
    },
    eSimNotFound() {
      const status = this.statuses?.find(s => s.id === this.sectionModem)
      return !status || status.eid === 'N/A'
    },
    currentStatus() {
      return this.statuses.find(s => s.id === this.sectionModem) || {}
    },
    parseNotifications() {
      return this.currentStatus.pending_notifications?.map(n => ({ event: this.events[n.event] || this.events.default, address: n.address, iccid: n.iccid })) || []
    },
    disableFields() {
      return this.disableDownload || this.eSimNotFound
    },
    disableFieldsMsg() {
      return this.disableDownload ? this.disableDownloadMsg : this.$t('eSIM is not selected as the active SIM')
    },
    generalPath() {
      return `/network/mobile/general/${this.sectionModem}`
    },
    lastProfile() {
      return this.formData.profile && this.formData.profile.length === 1
    },
    deleteMsg() {
      const msg = this.$t(
        'Once you delete an eSIM profile, the process cannot be undone. Additionally, for some eSIM profiles, reactivation using the same activation code may not be possible, so proceed with caution. Furthermore, all configurations related to the eSIM profile, including interface settings, SIM switching, and more, will also be deleted.'
      )
      if (!this.lastProfile) return msg
      return '%s %s'.format(this.$t('By default, after deleting the last eSIM profile, the default SIM will be switched to a regular SIM.'), msg)
    },
    downloadStatus() {
      if (this.disableDownload) {
        return { text: this.$t('Downloading'), hint: '', disabled: true, loading: true }
      }
      return { text: this.$t('Download'), hint: '', disabled: false, loading: false }
    }
  },
  mounted() {
    this.$bus.on('esim_profile_status', this.profileEvent)
  },
  beforeUnmount() {
    this.$bus.off('esim_profile_status', this.profileEvent)
  },
  methods: {
    profileEvent(data) {
      if (data.modem_id === this.sectionModem) {
        switch (data.event_id) {
          case 6: {
            if (data.status === 14 && !this.disableDownload) return
            this.disableDownload = false
            if (data.status === 0) return this.$message.success(this.$t('eSIM profile added'))
            return this.$message.error(this.$mobile.getFailedEsimMessage(data.status))
          }
          case 8:
            this.updateConfig()
            break
          case 9:
            this.updateStatus()
            break
        }
      }
    },
    parseCard(s, idx) {
      const columns = [
        [
          { label: this.$t('State'), value: s.profile_set === '1' ? this.$t('Active') : this.$t('Inactive'), class: s.profile_set === '1' ? 'success' : 'error' },
          { label: 'ID', value: 'eSIM%s%s'.format(idx, this.bootstrapProfile(s) ? ` (${this.$t('bootstrap')})` : '') }
        ],
        [
          { label: this.$t('Provider'), value: s.provider },
          { label: 'ICCID', value: s.id }
        ]
      ]
      return { item: s, columns }
    },
    updateConfig(showSpinner) {
      if (showSpinner) this.$spin(true)
      return this.$axios
        .get(`/api/esim/config?modem=${this.sectionModem}`)
        .then(res => {
          this.formData = res.data
          this.$refs.vuciForm.updateUciData(res.data, 'profile')
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to update data'))
        })
        .finally(() => {
          if (showSpinner) this.$spin(false)
        })
    },
    processNotify() {
      this.$spin(this.$t('Processing notifications'))
      return this.$axios
        .post('/api/esim/actions/process_notifications', { data: { modem: this.sectionModem } })
        .then(() => {
          this.$message.success(this.$t('Notifications processed'))
          this.updateStatus()
        })
        .catch(e => {
          this.$message.error(this.notificationErrors[e?.response?.data?.errors?.[0].code] || this.notificationErrors.default)
        })
        .finally(() => {
          this.showModal = false
          this.$spin(false)
        })
    },
    showPrompt() {
      return this.$prompt.show({
        title: this.$t('Process pending notifications?'),
        content: this.$t('An internet connection is required to process notifications. This process cannot be undone.'),
        okText: this.$t('Process'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.processNotify()
        }
      })
    },
    updateStatus() {
      return this.$axios
        .get('/api/esim/status')
        .then(res => {
          this.statuses = res.data
          if (this.parseNotifications.length > 0) this.$message.info(this.$t('There are pending notifications available'))
          if (this.currentStatus.pending_jobs?.includes('DOWNLOAD')) {
            this.disableDownload = true
            this.$message.info(this.$t('eSIM profile download in progress'))
          }
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load eSIM profiles statuses'))
        })
    },
    deleteProfile(id, skipSwitch) {
      this.showDeletePrompt = false
      this.$spin(this.$t('Deleting eSIM profile'))
      return this.$axios
        .delete(`/api/esim/config/${id}?skip_switch=${skipSwitch ? '1' : '0'}`)
        .then(() => {
          this.$message.success(this.$t('eSIM profile has been deleted'))
          this.updateConfig(true).then(() => {
            this.updateStatus()
          })
        })
        .catch(() => this.$message.error(this.$t('Failed to delete eSIM profile')))
        .finally(() => {
          this.$spin(false)
        })
    },
    enablePrompt(section) {
      return this.$prompt.show({
        title: this.$t('Enable profile?'),
        content: this.$t('Are you sure you want to enable "%s" eSIM profile?').format(section.name || section.id),
        okText: this.$t('Enable'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          this.enableProfile(section.id)
        }
      })
    },
    enableProfile(id) {
      this.$spin(this.$t('Enabling eSIM profile'))
      return this.$axios
        .put(`/api/esim/config/${id}`, { data: { enabled: '1' } })
        .then(() => {
          this.$message.success(this.$t('eSIM profile has been enabled'))
          this.updateConfig(true).then(() => {
            this.updateStatus()
          })
        })
        .catch(() => this.$message.error(this.$t('Failed to enable eSIM profile')))
        .finally(() => {
          this.$spin(false)
        })
    },
    bootstrapProfile(s) {
      return s.bootstrap === '1'
    },
    getHintMsg(s, bootstrap) {
      if (bootstrap && this.bootstrapProfile(s)) return [{ info: this.bootstrapMsg }]
      if (this.disableFields) return [{ info: this.disableFieldsMsg }]
      return []
    }
  }
}
</script>
