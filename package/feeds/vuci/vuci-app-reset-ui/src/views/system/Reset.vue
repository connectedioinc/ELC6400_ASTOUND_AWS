<template>
  <tlt-card
    :title="$t('Reset settings')"
    sid="system_default_toggle"
  >
    <tlt-form-item-radio-group
      v-model="selectedFrom"
      :label="$t('Reset type')"
      prop="reset_type"
      :options="fromOptions"
    >
      <template #help>
        <strong> {{ $t('System settings') }} </strong> -
        {{
          !!$store.board?.hwinfo?.mobile
            ? $t('Resets all configuration except %s RMS data, logs and PIN code.').format($store.board?.hwinfo?.esim ? $t('eSIM profile,') : '')
            : $t('Resets all configuration except RMS data and logs.')
        }}<br />
        <strong> {{ $t('Factory defaults') }} </strong> - {{ $t('Resets device to factory configuration.') }}<br />
        <strong> {{ $t("User's default configuration") }} </strong> - {{ $t("Resets device to user's default configuration.") }}<br />
      </template>
    </tlt-form-item-radio-group>
    <tlt-form-model-item>
      <tlt-button
        button-id="reset"
        @click="restoreDefault"
      >
        {{ $t('Reset') }}
      </tlt-button>
    </tlt-form-model-item>
  </tlt-card>
  <tlt-card
    sid="default_configuration"
    :title="$t(`Create user's default configuration`)"
    :help="$t('Here you can create a new default configuration to which the device will reset.')"
  >
    <tlt-form-model-item
      element-id="created"
      :label="$t('Creation date')"
      :help="$t('Date when the configuration was created.')"
    >
      <tlt-dummy-value :value="$localDate(new Date(backupStatus?.date).getTime() / 1000, { timezoneConversion: false })" />
    </tlt-form-model-item>
    <tlt-form-model-item
      prop="defaults-buttons"
      :help="$t('Creates or removes user\'s default configuration.')"
    >
      <div
        id="defaults-buttons"
        class="flex gap-2"
      >
        <tlt-button
          button-id="create"
          @click="createDefaultConfiguration()"
        >
          {{ $t('Create') }}
        </tlt-button>
        <tlt-button
          :readonly="!userDefaultExist"
          button-id="remove"
          color="error"
          @click="removeDefaultConfiguration()"
        >
          {{ $t('Remove') }}
        </tlt-button>
      </div>
    </tlt-form-model-item>
    <tlt-inline-message
      id="configuration_info"
      type="info"
      :message="$t(`The configuration should only be created if you intend to reset the user's default configuration settings.`)"
      rawhtml
    />
  </tlt-card>
</template>

<script>
import { isArray } from '@ui-core/utils/inspect.ts'

export default {
  data() {
    return {
      selectedFrom: 'system',

      backupStatus: {},
      restoreStatus: {},
      uploadedBackup: null
    }
  },
  computed: {
    userDefaultExist() {
      return this.backupStatus.date !== '-'
    },
    fromOptions() {
      return [
        {
          name: this.$t('System settings'),
          value: 'system'
        },
        {
          name: this.$t('Factory defaults'),
          value: 'factory'
        },
        {
          name: this.$t("User's default configuration"),
          value: 'user',
          disabled: !this.userDefaultExist
        }
      ]
    }
  },
  created() {
    return this.getStatus()
  },
  methods: {
    getStatus() {
      this.$spin(this.$t('Loading'))
      return this.$axios
        .get('/api/backup/status')
        .then(({ data }) => {
          this.backupStatus = data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get backup status'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    beforeUpload(formData) {
      const { password, encrypt } = this.restoreStatus
      formData.append('password', password)
      formData.append('encrypt', encrypt)
    },
    createDefaultConfiguration() {
      this.$spin(this.$t('Creating default configuration'))
      return this.$axios
        .post('/api/backup/actions/create_default')
        .then(({ data }) => {
          this.backupStatus.date = data.date
          this.$message.success(this.$t("User's default configuration created successfully"))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to create default configuration'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    removeDefaultConfiguration() {
      this.$spin(this.$t('Removing default configuration'))
      return this.$axios
        .post('/api/backup/actions/remove_default')
        .then(() => {
          this.backupStatus.date = '-'
          this.$message.success(this.$t("User's default configuration removed successfully"))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to remove default configuration'))
        })
        .finally(() => {
          if (this.selectedFrom === 'user') this.selectedFrom = 'system'
          this.$spin(false)
        })
    },
    showErrorPrompt(msg) {
      this.$prompt.show({
        title: this.$t('Invalid backup'),
        content: msg,
        cancelText: this.$t('Close'),
        okDisplay: false
      })
    },
    restoreDefault() {
      this.$prompt.show({
        title: this.$t('Reset changes?'),
        content: this.promptMessage(),
        okText: this.$t('Reset'),
        cancelText: this.$t('Cancel'),
        onOk: () => this.onPromptOk()
      })
    },
    promptMessage() {
      return this.$t("This will reset all changes to '%s'.").format(this.fromOptions.find(x => x.value === this.selectedFrom).name)
    },
    getPort(portData) {
      return isArray(portData) ? portData.at(-1) : portData
    },
    onPromptOk() {
      if (this.selectedFrom === 'user') this.$spin('Applying settings...')
      return this.$axios
        .post('/api/backup/actions/reset_settings', { data: { type: this.selectedFrom } })
        .then(({ data }) => {
          const port = window.location.protocol === 'http:' ? this.getPort(data.http_port) : this.getPort(data?.https_port) || this.getPort(data?.http_port)
          const erased = this.selectedFrom === 'factory' || this.selectedFrom === 'system'
          this.$reconnect(this.$t('The system is erasing the configuration partition now and will reboot itself when finished.'), {
            address: data.lan_ip,
            port,
            eraseData: erased,
            messageDelay: erased ? 200 : 100
          })
        })
        .catch(() => {
          this.$message.error(this.$t('Reset request failed.'))
        })
        .finally(() => {
          if (this.selectedFrom === 'user') this.$spin(false)
        })
    }
  }
}
</script>
