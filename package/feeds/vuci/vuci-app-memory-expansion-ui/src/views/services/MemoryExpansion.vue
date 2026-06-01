<template>
  <tlt-form
    sid="memoryexpansion"
    :model="form"
    :title="$t('Memory expansion')"
    :help="$t('This section is used to configure router memory expansion.')"
  >
    <tlt-form-item-select
      v-show="!memexpStatus"
      v-model="form.storage"
      :label="$t('Storage')"
      :help="$t('Selected external storage device will be used for memory expansion.')"
      prop="storage"
      :options="expansionOptions"
      :readonly="memexpStatus"
      @change="invokeMessages"
    />
    <tlt-form-model-item
      :label="$t('Enable storage expansion')"
      :help="$t('Enables or disables the memory expansion. This can take up to a few minutes.')"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <tlt-form-item-switch
            v-model="form.storageExpansion"
            prop="memory_expansion_enable"
            :readonly="devices.length === 0 || devices.find(dev => dev.fs === form.storage && ['dlna', 'samba'].includes(dev.in_use))"
          />
        </div>
        <div
          ref="info"
          class="h-fit"
        >
          <tlt-icon
            icon="info"
            class="size-5 ml-1.5 text-theme-text-info"
          />
        </div>
        <tlt-popover
          :target="() => $refs.info"
          placement="bottom-start"
          :fallback-placements="['bottom-end', 'bottom', 'left']"
        >
          {{
            $t(
              'Do not remove the external storage device while the expansion is enabled. Installed packages and files will be lost. No important data on the external storage device as it will be wiped during Expansion setup'
            )
          }}
        </tlt-popover>
      </div>
    </tlt-form-model-item>
    <tlt-inline-message type="info">
      <p>
        {{
          $t(`Changes made to the device configuration while expansion was enabled will disappear after it is disabled. You can expand the memory of your router with a USB Mass Storage Device (MSD) or SD.
        You can use the extra memory to install additional software packages fitting your needs. To be eligible for router memory expansion, the MSD must qualify the following imposed restrictions:`)
        }}
      </p>
      <ul class="list-disc pl-4">
        <li>{{ $t('The MSD must be the last one inserted') }}</li>
        <li>{{ $t('If you are using a USB hub, the target MSD must be the last one attached to the hub.') }}</li>
      </ul>
    </tlt-inline-message>
    <template #applyButton>
      <tlt-button
        button-id="saveandapply"
        class="d-flex save"
        :readonly="readOnly"
        @click="invokePrompt()"
      >
        {{ $t('Save & Apply') }}
      </tlt-button>
    </template>
  </tlt-form>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'

export default {
  data() {
    return {
      memexpStatus: false,
      form: {
        storageExpansion: false,
        storage: ''
      },
      devices: [],
      expansionOptions: []
    }
  },
  computed: {
    ...mapState(useMainStore, ['device']),
    readOnly() {
      return this.form.storageExpansion === this.memexpStatus
    }
  },
  created() {
    this.loadDevices()
  },
  methods: {
    loadDevices() {
      this.$spin()
      return this.$axios
        .bulkGet(['/api/usb_tools/memory_expansion/status', '/api/usb_tools/mount/options'])
        .then(([mem, devices]) => {
          if (!mem.success) this.$message.error(this.$t('Failed to load storage device data'))
          else {
            this.form.storageExpansion = mem.data.expansion_enabled
            this.memexpStatus = mem.data.expansion_enabled
          }
          if (!devices.success) this.$message.error(this.$t('Failed to load storage device data'))
          else {
            this.expansionOptions = devices.data.map(device => {
              return [device.fs, `${device.type.toUpperCase()} - ${device.description}`]
            })
            this.devices = devices.data
          }
          this.invokeMessages()
        })
        .catch(() => {
          this.$message.error('An unexpected error occurred')
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    removeMessage(msg) {
      this.$notification.remove(msg)
    },
    returnMessage(sd, id) {
      const messages = [
        this.$t('No suitable storage device detected.'),
        this.$t('The target %s is used by Samba service.').format(sd ? this.$t('SD card') : this.$t('USB device')),
        this.$t('The target %s is used by DLNA service.').format(sd ? this.$t('SD card') : this.$t('USB device'))
      ]
      return messages[id]
    },
    invokeMessages(self) {
      if (this.devices.length === 0) {
        this.$notification.error(this.returnMessage(true, 0))
        return
      } else if (!self) return
      const device = this.devices.find(el => el.fs === self)
      const isSd = device.type === 'sd'
      for (let i = 0; i <= 2; i++) {
        this.removeMessage(this.returnMessage(!isSd, i))
      }
      if (device.in_use === 'samba') this.$notification.error(this.returnMessage(isSd, 1))
      else if (device.in_use === 'dlna') this.$notification.error(this.returnMessage(isSd, 2))
    },
    invokePrompt() {
      const title = this.form.storageExpansion ? this.$t('Expand router memory?') : this.$t('Disable memory expansion')
      const content = this.form.storageExpansion
        ? this.$t('This will wipe the external storage device contents and the router will reboot.')
        : this.$t('This will disable storage memory expansion and router will reboot.')
      this.$prompt.show({
        title,
        content,
        okText: this.$t('Continue'),
        cancelText: this.$t('Cancel'),
        onOk: this.onOk
      })
    },
    onOk() {
      return this.startExpansion()
    },
    startExpansion() {
      this.$spin({ tip: this.$t('Formatting...'), cancelButton: null })
      const data = this.form.storageExpansion ? { data: { storage: this.form.storage } } : { data: {} }
      const endpoint = '/api/usb_tools/memory_expansion/actions/%s'.format(this.form.storageExpansion ? 'enable_expansion' : 'disable_expansion')
      return this.$axios
        .post(endpoint, data)
        .then(() => {
          this.$reconnect(this.$t('Rebooting'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
          this.$spin(false)
        })
    }
  }
}
</script>
<style scoped>
.d-flex {
  display: flex;
}
.save {
  margin-left: auto;
}
</style>
