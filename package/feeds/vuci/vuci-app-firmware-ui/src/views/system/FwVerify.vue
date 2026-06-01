<template>
  <verify-modal
    id="fw-install"
    :open="open"
    :title="modalTitle"
    :message="$t('Click \'%s\' to start the installation process.').format($t('Proceed'))"
    @proceed="upgrade"
    @cancel="closeModal"
    @close="closeModal"
  >
    <status-row
      v-if="fwData.fwType === 'device'"
      :has-accordion="!matches"
      :header="$t('Configuration files will%sbe kept').format(keepSettingsValue ? ' ' : ` ${$t('not')} `)"
      :content="configuration"
      name="settings"
      :icon="keepSettingsValue ? 'files' : 'file-fail'"
      :status="keepSettingsValue ? 'success' : 'warning'"
    />
    <status-row
      :has-accordion="!matches"
      :header="validationHeader"
      :status="validationStatus"
      icon="validation"
      name="validation"
    >
      <template #content>
        {{ $t('Please compare checksums and the file size listed below with the original file to ensure data integrity.') }}
        <collapsable-list
          :items="checksumItems"
          :expand-text="$t('Show checksums')"
          :collapse-text="$t('Hide checksums')"
        />
      </template>
    </status-row>
    <div>
      <tlt-alert
        inline
        type="info"
      >
        {{ $t('After proceeding, the device will reboot and be temporarily unreachable.') }}
      </tlt-alert>
    </div>
  </verify-modal>
</template>

<script>
import { useMediaQuery } from '@vueuse/core'
import { findKey } from '@ui-core/plugins/helper'
import StatusRow from '@ui-core/tlt-design/customComponents/StatusRow.vue'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import VerifyModal from '@/components/VerifyModal.vue'
import CollapsableList from '@/components/CollapsableList.vue'

export default {
  components: {
    StatusRow,
    TltAlert,
    VerifyModal,
    CollapsableList
  },
  props: {
    open: {
      type: Boolean,
      default: false
    },
    fwData: {
      type: Object,
      default: () => ({})
    },
    keepSettings: {
      type: Boolean,
      default: false
    }
  },
  emits: ['cancel-upgrade'],
  setup() {
    const matches = useMediaQuery('(min-width: 1024px)')
    return { matches }
  },
  data() {
    return {
      loadingInfo: this.$t('Upgrading...'),
      canceled: false,
      errorMessages: {
        3: this.$t('Firmware download in progress'),
        defaultMessage: this.$t('Failed to upgrade firmware')
      }
    }
  },
  computed: {
    modalTitle() {
      return this.fwData.fwType === 'modem' ? this.$t('Flash new modem image') : this.$t("File '%s' was successfully uploaded").format(this.fwData.fw_version)
    },
    keepSettingsValue() {
      return this.fwData.fwType === 'device' && this.keepSettings && this.fwData.newer === '1'
    },
    configuration() {
      if (this.fwData.fwType === 'device') {
        let confString = this.$t('Files will be erased.')
        if (this.keepSettings && this.fwData.newer === '1') {
          confString = this.$t('Files will be kept.')
          if (this.fwData.packages && this.fwData.packages.length > 0) {
            confString = this.$t('%s%sInstalled packages from package manager will be redownloaded after installation.').format(confString, '<br>')
          }
        } else if (this.fwData.newer !== '1') {
          confString = this.$t('Files will be erased. Uploaded firmware image version is older than current firmware version.')
          if (this.fwData.packages && this.fwData.packages.length > 0) {
            confString = this.$t('%s%sInstalled packages from package manager will be deleted and will need to be downloaded manually.').format(confString, '<br>')
          }
        } else {
          if (this.fwData.packages && this.fwData.packages.length > 0) {
            confString = this.$t('%s%sInstalled packages from package manager will be deleted.').format(confString, '<br>')
          }
        }
        return confString
      } else {
        return this.$t('Files will be kept.')
      }
    },
    validationHeader() {
      return this.fwData.valid === '1' || this.fwData.fwType === 'modem' ? this.$t('Validation Succeeded') : this.$t('Validation Failed')
    },
    validationStatus() {
      return this.fwData.valid === '1' || this.fwData.fwType === 'modem' ? 'success' : 'error'
    },
    checksumItems() {
      const items = [
        { label: 'MD5', value: this.fwData.md5 },
        { label: 'SHA256', value: this.fwData.sha256 },
        { label: this.$t('Size'), value: this.fwData.size }
      ]
      if (this.fwData.fwType === 'device' && this.fwData.fw_version) {
        items.push({ label: this.$t('Firmware version'), value: this.fwData.fw_version })
      }
      return items
    }
  },
  unmounted() {
    if (this.canceled || !this.fwData.fwType) return
    const endpoint = this.fwData.fwType === 'device' ? '/api/firmware/actions/delete_device_firmware' : '/api/firmware/actions/delete_modem_firmware'
    return this.$axios.post(endpoint).catch(() => {
      console.error('failed to remove firmware file from device')
    })
  },
  methods: {
    closeModal() {
      this.$prompt.show({
        title: this.$t('Go back?'),
        content: this.$t('The firmware installation will be discarded, and you will need to re-upload the file.'),
        cancelText: this.$t('Close'),
        okText: this.$t('Discard'),
        onOk: () => this.cancelUpgrade()
      })
    },
    cancelUpgrade() {
      this.$spin()
      const endpoint = this.fwData.fwType === 'device' ? '/api/firmware/actions/delete_device_firmware' : '/api/firmware/actions/delete_modem_firmware'
      return this.$axios
        .post(endpoint)
        .finally(() => {
          this.$spin(false)
          this.canceled = true
          this.$emit('cancel-upgrade')
        })
        .catch(() => {
          console.error('failed to remove firmware file from device')
        })
    },
    upgrade() {
      if (this.fwData.fwType === 'device') this.upgradeFirmware()
      else this.upgradeModem()
    },
    upgradeModem() {
      this.$spin({ tip: this.loadingInfo, fullOpacity: true })
      return this.$axios
        .post('/api/firmware/actions/upgrade_modem')
        .then(() => {
          return this.$reconnect(this.$t('Upgrading...'))
        })
        .catch(() => {
          this.$spin(false)
          this.$message.error(this.$t('Failed to upgrade modem'))
        })
    },
    upgradeFirmware() {
      this.$spin({ tip: this.loadingInfo, fullOpacity: true })
      return this.$axios
        .post('/api/firmware/actions/upgrade', {
          data: {
            keep_settings: this.keepSettings && this.fwData.newer === '1' ? '1' : '0'
          }
        })
        .then(() => {
          localStorage.setItem('analyticsMessageShown', true)
          this.$store.showNewsletterNotification = true
          const defaultIp = findKey(this.$store.board.network, 'default_ip')
          const eraseData = !(this.keepSettings && this.fwData.newer === '1') && defaultIp
          return this.$reconnect(this.$t('Upgrading...'), { eraseData, messageDelay: eraseData ? 200 : 100 })
        })
        .catch(err => {
          this.$spin(false)
          const res = err?.response?.data?.errors[0]?.code
          return this.$message.error(this.errorMessages[res]) || this.$message.error(this.errorMessages.defaultMessage)
        })
    }
  }
}
</script>
