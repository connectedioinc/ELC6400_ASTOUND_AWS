<template>
  <backup-verify
    :open="showVerifyBackupPage"
    :data="uploadedBackup"
    @cancel="cancelBackup"
    @proceed="applyBackup"
  />
  <tlt-card
    sid="backup_generation"
    :title="$t('Create backup')"
    :help="$t('This section is used to create an archive which contains the device\'s current configuration.')"
  >
    <tlt-form-item-switch
      v-model="backupStatus.encrypt"
      :help="$t('Turn on AES 256 encryption and archive Backup file using zip format.')"
      :label="$t('Encrypt')"
      prop="encrypt"
      true-value="1"
      false-value="0"
    />
    <tlt-form-item-input
      ref="encrypt-password"
      v-model="backupStatus.password"
      :label="$t('Password')"
      :help="$t('Password that will be used to encrypt Backup file. It will have to be provided when extracting formatted zip archive to gain access to a tar file.')"
      prop="encrypt_password"
      password
      minlength="8"
      :rules="['root_password', 'defaulttype']"
      :depend="backupStatus.encrypt === '1'"
      :required="backupStatus.encrypt === '1'"
    />
    <tlt-form-model-item
      :label="$t('Backup archive')"
      :help="$t('Generates and downloads a configuration backup archive.')"
      element-id="download"
    >
      <tlt-button
        :readonly="!backupStatus.password && backupStatus.encrypt === '1'"
        type="text"
        size="md"
        @click="generateBackup"
      >
        {{ $t('Download') }}
      </tlt-button>
    </tlt-form-model-item>
    <tlt-form-model-item
      v-show="backupStatus.md5 !== '-'"
      element-id="md5"
      :label="$t('MD5')"
      :help="$t('MD5 checksum of latest downloaded backup archive from this device.')"
    >
      <tlt-dummy-value
        class="w-[260px]"
        :value="backupStatus.md5"
      />
      <tlt-hint
        :hints="[{ info: $t('Copied.') }]"
        show-on-click
      >
        <tlt-button
          type="icon"
          icon="copy"
          color="tertiary"
          @click="$copyToClipboard(backupStatus.md5)"
        />
      </tlt-hint>
    </tlt-form-model-item>
    <tlt-form-model-item
      v-show="backupStatus.sha256 !== '-'"
      element-id="sha256"
      :label="$t('SHA256')"
      :help="$t('SHA256 checksum of latest downloaded backup archive from this device.')"
    >
      <tlt-dummy-value
        class="w-[260px]"
        :value="backupStatus.sha256"
      />
      <tlt-hint
        :hints="[{ info: $t('Copied.') }]"
        show-on-click
      >
        <tlt-button
          type="icon"
          icon="copy"
          color="tertiary"
          @click="$copyToClipboard(backupStatus.sha256)"
        />
      </tlt-hint>
    </tlt-form-model-item>
  </tlt-card>
  <tlt-card
    sid="restore_configuration"
    :title="$t('Upload backup')"
    :help="
      $t(
        'This section is used to upload a configuration backup archive and apply its settings to this device. \
              Take note that a backup archive may be taken from a device with a different password. \
              You should be aware of the password before uploading the archive.'
      )
    "
  >
    <tlt-form-item-switch
      v-model="restoreStatus.encrypt"
      :help="$t('Turn on when Backup file is encrypted.')"
      :label="$t('Encrypted')"
      prop="encrypted"
      true-value="1"
      false-value="0"
    />
    <tlt-form-item-input
      ref="restore-password"
      v-model="restoreStatus.password"
      :label="$t('Password')"
      :help="$t('Password will be used when extracting formatted 7z or zip archive to gain access to a tar file.')"
      prop="restore_password"
      password
      rules="defaulttype"
      :depend="restoreStatus.encrypt === '1'"
      :required="restoreStatus.encrypt === '1'"
    />
    <tlt-form-model-item
      :label="$t('Restore from backup')"
      :help="$t('Select a configuration backup archive from your computer.')"
    >
      <tlt-upload
        ref="upload_backup"
        :readonly="!restoreStatus.password && restoreStatus.encrypt === '1'"
        name="backup_file"
        action="/api/backup/actions/upload"
        instant
        :errors="backupErrors"
        :before-upload="beforeUpload"
        @uploaded="onUploadSuccess"
      />
    </tlt-form-model-item>
    <tlt-inline-message
      id="configuration_info"
      type="info"
      :message="$t('Only configuration file from identical device with same or lower firmware version can be uploaded')"
    />
  </tlt-card>
</template>

<script>
import BackupVerify from './BackupVerify.vue'
import { isArray } from '@ui-core/utils/inspect.ts'

export default {
  components: { BackupVerify },
  data() {
    return {
      selectedFrom: [
        {
          checked: true,
          name: this.$t('System settings'),
          value: 'system'
        },
        {
          checked: false,
          name: this.$t('Factory defaults'),
          value: 'factory'
        },
        {
          checked: false,
          name: this.$t("User's default configuration"),
          value: 'user'
        }
      ],
      backupStatus: {},
      restoreStatus: {},
      uploadedBackup: null,
      backupValidationErrors: {
        1: this.$t('The selected backup file is not compatible with this device, please choose another file.'),
        2: this.$t('The selected backup file was generated on a device with a newer firmware version, please choose a backup file with the same or older firmware version.'),
        4: this.$t('Selected backup file has memory expansion enabled.'),
        7: this.$t('7z Format Archiver package is needed to decrypt file. The package can be installed using the package manager.'),
        8: this.$t('Backup file is encrypted.'),
        9: this.$t('Backup file is not encrypted.'),
        10: this.$t('File extension is incorrect.'),
        120: this.$t('Invalid password provided.'),
        150: this.$t('Not enough free space in RAM.'),
        151: this.$t('Not enough memory available on device.'),
        default: this.$t('Failed to get backup validation.')
      }
    }
  },
  computed: {
    showVerifyBackupPage() {
      return !!this.uploadedBackup
    },
    archiver7zipExists() {
      return this.$store.hasPackages('7zip')
    }
  },
  created() {
    return this.getStatus()
  },
  methods: {
    backupErrors(code) {
      return this.showErrorPrompt(this.parseBackupValidationError(code))
    },
    beforeUpload(formData) {
      const { password, encrypt } = this.restoreStatus
      formData.append('password', password)
      formData.append('encrypt', encrypt)
    },
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
    generateBackup() {
      return this.$refs['encrypt-password'].validate().then(valid => {
        if (!valid) return this.$message.error(this.$t('Password is required'))
        this.$spin(this.$t('Generating file'))
        return this.$axios
          .post('/api/backup/actions/generate', {
            data: { encrypt: this.backupStatus.encrypt, password: this.backupStatus.password }
          })
          .then(({ data }) => {
            this.backupStatus = { ...this.backupStatus, ...data }
            return this.downloadBackup()
          })
          .catch(() => {
            this.$message.error(this.$t('Failed to generate file'))
          })
          .finally(() => {
            this.$spin(false)
          })
      })
    },
    downloadBackup() {
      const mimeType = this.backupStatus.encrypt === '1' ? 'application/x-zip-compressed' : 'application/x-tar'
      return this.$utils
        .downloadFileApi('/api/backup/actions/download', mimeType, 'POST')
        .then(() => {
          this.$message.success(this.$t('Backup download was successful'))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to download file'))
        })
    },
    onUploadSuccess(data) {
      return this.$refs['restore-password']
        .validate()
        .then(valid => {
          if (!valid) return this.$message.error(this.$t('Password is invalid'))
          this.uploadedBackup = data
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    parseBackupValidationError(errorCode) {
      return this.backupValidationErrors[errorCode] || this.backupValidationErrors.default
    },
    showErrorPrompt(msg) {
      this.$prompt.show({
        title: this.$t('Failed to upload backup file'),
        content: msg,
        icon: { name: 'error', class: 'text-theme-text-danger' },
        cancelText: this.$t('Close'),
        onCancel: () => this.$refs.upload_backup?.removeFile(),
        okDisplay: false
      })
    },
    cancelBackup() {
      this.$spin(this.$t('Removing backup'))
      return this.$axios
        .post('/api/backup/actions/delete')
        .catch(() => {
          this.$message.error(this.$t('Failed to remove backup'))
        })
        .finally(() => {
          this.uploadedBackup = null
          this.$spin(false)
        })
    },
    getPort(portData) {
      return isArray(portData) ? portData.at(-1) : portData
    },
    applyBackup() {
      this.$spin(this.$t('Applying backup'))
      return this.$axios
        .post('/api/backup/actions/apply', {
          data: { encrypt: this.restoreStatus.encrypt, password: this.restoreStatus.password }
        })
        .then(({ data }) => {
          const port = window.location.protocol === 'http:' ? this.getPort(data.http_port) : this.getPort(data?.https_port) || this.getPort(data?.http_port)
          this.$VuciValidator.value = window.location.hostname
          const resIp4addr = this.$VuciValidator.ip4addr()
          const ipAddrRedirect = resIp4addr.isValid ? (data?.lan_ipv4 ? data.lan_ipv4 : `[${data?.lan_ipv6}]`) : data?.lan_ipv6 ? `[${data.lan_ipv6}]` : data?.lan_ipv4
          this.$reconnect(this.$t('Applying backup'), { address: ipAddrRedirect, port, messageDelay: 100 })
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to apply backup'))
          this.$spin(false)
        })
    }
  }
}
</script>
