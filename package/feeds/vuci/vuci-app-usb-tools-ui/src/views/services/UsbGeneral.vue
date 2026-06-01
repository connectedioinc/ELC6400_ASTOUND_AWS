<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="fstab"
    :after-load="afterLoad"
    :before-save="beforeSave"
    @applied="onApply"
  >
    <vuci-named-section
      v-slot="{ s }"
      :title="$t('USB mount settings')"
      :uci-data="uciData"
      data-key="usbTools"
      :exception-options="['mount_flags_nosuid', 'mount_flags_nodev', 'mount_flags_noexec']"
      :endpoints="[{ endpoint: 'usb_tools/config', sectionFilter: filterSections }]"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Synchronous write')"
        :help="$t('Enables that all changes to the according filesystem are immediately flushed to disk. This will drastically lower the life expectancy of your USB device.')"
        name="auto_sync"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Mount automatically')"
        :help="$t('Mount file system automatically when plugged in.')"
        name="auto_mount"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Mount flags')"
        :help="$t('Enable specified features on the mounted filesystem.')"
        name="mount_flags"
        no-write
        :options="mountFlagOptions"
        :placeholder="$t('None')"
        multiple
      />
    </vuci-named-section>
    <tlt-table
      id="devices"
      :data-source="deviceData"
      :columns="deviceColumns"
      :title="$t('Mounted file systems')"
      @refresh="loadMounts"
    >
      <template #mountpoint="{ record }">
        {{ record.mountpoint || '-' }}
      </template>
      <template #available="{ record }">
        {{ record.available || '-' }}
      </template>
      <template #used="{ record }">
        {{ record.percent || '0%' }}
        {{ record.used ? `(${record.used})` : '' }}
      </template>
      <template #unmount="{ record }">
        <table-action
          id="unmount"
          icon-left="usb-eject"
          @click="unmountPrompt(record)"
        />
        <tlt-hint
          v-if="record.system_format === 'ntfs'"
          class="ml-1.5"
          align-right
          :hints="record.system_format === 'ntfs' ? [{ info: $t('NTFS partitions are only supported in read-only mode, please use exFAT or Ext4.') }] : []"
        >
          <tlt-icon
            icon="error"
            class="text-theme-text-danger size-5"
          />
        </tlt-hint>
      </template>
      <template #format="{ record }">
        <tlt-hint
          align-right
          :hints="record.in_use !== '-' ? [{ info: $t('Device is in use and cannot be formatted.') }] : []"
        >
          <tlt-button
            :readonly="record.in_use !== '-'"
            button-id="format"
            class="gap-1!"
            type="text"
            @click="formatPrompt(record)"
          >
            {{ $t('Format') }}
          </tlt-button>
        </tlt-hint>
      </template>
    </tlt-table>
  </vuci-form>
</template>

<script>
export default {
  data() {
    return {
      deviceColumns: [
        { dataIndex: 'fs', title: this.$t('Device') },
        { dataIndex: 'mountpoint', title: this.$t('Mount Point') },
        { dataIndex: 'available', title: this.$t('Available') },
        { dataIndex: 'used', title: this.$t('Used') },
        { dataIndex: 'in_use', title: this.$t('In use') },
        { dataIndex: 'format', title: this.$t('Format') },
        { dataIndex: 'unmount' }
      ],

      // These flags don't need translations.
      // Because as an example a german man page for "mount(8)" also doesn't translate them.
      // https://manpages.debian.org/testing/util-linux-locales/mount.8.de.html
      mountFlagOptions: ['nosuid', 'nodev', 'noexec'],
      deviceData: [],
      formData: {}
    }
  },
  methods: {
    filterSections(sections) {
      return sections.find(section => section['.type'] === 'global')
    },
    onApply() {
      this.$notification.info(this.$t('In order for USB mount setting changes to take effect, re-add the flash devices.'))
    },
    loadMounts() {
      this.$spin()
      return this.$axios
        .get('/api/usb_tools/mount/options')
        .then(mounts => {
          this.deviceData = mounts.data
        })
        .catch(() => {
          this.$message.error(this.$t('Error while loading data'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    afterLoad(loadedData) {
      const globalSection = loadedData.usbTools.find(section => section.id === 'general')
      if (globalSection) {
        globalSection.mount_flags = []

        if (globalSection.mount_flags_nosuid === '1') {
          globalSection.mount_flags.push('nosuid')
        }
        if (globalSection.mount_flags_nodev === '1') {
          globalSection.mount_flags.push('nodev')
        }
        if (globalSection.mount_flags_noexec === '1') {
          globalSection.mount_flags.push('noexec')
        }
      }

      return this.loadMounts()
    },
    beforeSave() {
      const globalSection = this.formData.usbTools.find(section => section.id === 'general')
      if (globalSection) {
        const mountFlags = globalSection.mount_flags
        globalSection.mount_flags_nosuid = mountFlags.includes('nosuid') ? '1' : '0'
        globalSection.mount_flags_nodev = mountFlags.includes('nodev') ? '1' : '0'
        globalSection.mount_flags_noexec = mountFlags.includes('noexec') ? '1' : '0'
      }

      return Promise.resolve(true)
    },
    formatPrompt(device) {
      const isSd = device.type === 'sd'
      return this.$prompt.show({
        title: isSd ? this.$t('Format SD card?') : this.$t('Format USB drive?'),
        content: this.$t('All files will be deleted from the device permanently'),
        okText: this.$t('Format'),
        cancelText: this.$t('Cancel'),
        onOk: async () => await this.format(device)
      })
    },
    unmountPrompt(device) {
      const data = this.getPromptData(device)
      return this.$prompt.show({
        title: data.title,
        content: data.content,
        okText: this.$t('Unmount'),
        cancelText: this.$t('Cancel'),
        onOk: async () => await this.unmount(device, data.memexp)
      })
    },
    getPromptData(device) {
      const data = {
        title: '-',
        content: '-',
        memexp: false
      }
      const isSd = device.type === 'sd'
      const unmountTitle = isSd ? this.$t('Unmount SD card?') : this.$t('Unmount USB drive?')
      switch (device.in_use) {
        case 'samba':
        case 'dlna':
          data.title = unmountTitle
          data.content = this.$t('This %s is currently in use by "%s" service.').format(isSd ? this.$t('SD card') : this.$t('USB drive'), device.in_use.toUpperCase())
          break
        case 'memexp':
          data.title = this.$t('Reboot router?')
          data.content = this.$t('Router memory expansion will be deactivated and configuration restored to the state before memory expansion was performed.')
          data.memexp = true
          break
        case '-':
          data.title = unmountTitle
          if (isSd) data.content = this.$t('To unmount the SD card, remove it from the device and restart the router manually')
          else data.content = this.$t('This USB drive will be safely removed')
          break
        default:
          data.title = unmountTitle
          data.content = this.$t('This %s is currently in use.').format(isSd ? this.$t('SD card') : this.$t('USB drive'))
      }
      return data
    },
    unmount(device, memexp) {
      this.$spin(this.$t('Safe removing...'))
      return this.$axios
        .post('/api/usb_tools/actions/safe_remove', { data: { fs: device.fs } })
        .then(() => {
          return memexp ? this.callReboot() : this.loadMounts()
        })
        .catch(() => {
          this.$message.error(this.$t('Safe remove unsuccessful'))
        })
        .finally(() => {
          this.$spin(false)
        })
    },
    callReboot() {
      return this.$axios
        .post('/api/system/actions/reboot')
        .then(() => this.$reconnect(this.$t('Rebooting')))
        .catch(() => this.$message.error(this.$t('Failed to reboot')))
    },
    format(device) {
      this.$spin(this.$t('Formatting MSD...'))
      return this.$axios
        .post('/api/usb_tools/actions/format', { data: { fs: device.fs } })
        .then(() => {
          this.$message.success(this.$t('Successfully formatted'))
        })
        .catch(() => {
          this.$message.error(this.$t('Formatting unsuccessful or no MSD detected'))
        })
        .finally(() => {
          this.$spin(false)
          return this.loadMounts()
        })
    }
  }
}
</script>
