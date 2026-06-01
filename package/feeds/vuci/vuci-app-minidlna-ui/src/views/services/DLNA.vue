<template>
  <vuci-form
    v-slot="{ uciData }"
    config="minidlna,network"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('DLNA settings')"
      :help="$t('MiniDLNA is server software with the aim of being fully compliant with DLNA/UPnP-AV clients.')"
      :endpoints="[{ endpoint: 'minidlna/config' }]"
      name="general"
      data-key="minidlna"
      :error-handlers="{
        edit: handleError
      }"
    >
      <tlt-tabs :tabs="tabs">
        <template #general>
          <vuci-form-item-dummy
            :uci-section="s"
            :label="$t('MiniDLNA status')"
            name="_"
            :display-value="getDLNAStatus"
          />
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable')"
            :rmempty="false"
            name="enabled"
          />
          <vuci-form-item-input
            :uci-section="s"
            :label="$t('Port')"
            :help="$t('Port for HTTP (descriptions, SOAP, media transfer) traffic.')"
            rules="port"
            required
            name="port"
          />
          <vuci-form-item-input
            :uci-section="s"
            name="friendly_name"
            :label="$t('Friendly name')"
            :help="$t('Set this if you want to customize the name that shows up on your clients.')"
            rmempty
            rules="string"
            maxlength="256"
            :placeholder="$t('%s DLNA Server').format($brand('companyShort'))"
          />
          <vuci-form-item-select
            :uci-section="s"
            name="root_container"
            :label="$t('Root container')"
            :options="rootContainerOpts"
          />
          <vuci-form-item-list
            :uci-section="s"
            name="media_dir"
            type="tlt-select"
            :label="$t('Media directories')"
            :help="
              $t(
                'Set this to the directory you want scanned. If you want to restrict the directory \
              to a specific content type, you can prepend the type (\'A\' for audio, \'V\' for video, \'P\' for \
              images), followed by a comma, to the directory (eg. A,/mnt/media/Music). Multiple directories can be specified'
              )
            "
            allow-create
            :options="mediaOptions"
            required
          />
          <vuci-form-item-list
            :uci-section="s"
            name="album_art_names"
            :label="$t('Album art names')"
            :help="$t('This is a list of file names to check for when searching for album art.')"
            :rules="albumValidation"
            maxlength="256"
            rmempty
            allow-create
            :placeholder="$t('Cover.jpg')"
          />
        </template>
        <template #advanced>
          <vuci-form-item-select
            :uci-section="s"
            :label="$t('Interfaces')"
            :help="$t('Network interfaces to serve.')"
            :options="ifaces"
            multiple
            name="interface"
            :required="s.enabled === '1'"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="inotify"
            :label="$t('Enable inotify')"
            :help="$t('Set this to enable inotify monitoring to automatically discover new files.')"
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="enable_tivo"
            :label="$t('Enable TIVO')"
            :help="$t('Set this to enable support for streaming .jpg and .mp3 files to a TiVo supporting HMO.')"
            rmempty
          />
          <vuci-form-item-switch
            :uci-section="s"
            name="strict_dlna"
            :label="$t('Strict to DLNA standard')"
            :help="
              $t(
                'Set this to strictly adhere to DLNA standards. This will allow server-side downscaling of very large JPEG images, which may hurt JPEG serving performance on (at least) Sony DLNA products'
              )
            "
            rmempty
          />
          <vuci-form-item-input
            :uci-section="s"
            name="notify_interval"
            :label="$t('Notify interval')"
            :help="$t('Notify interval in seconds.')"
            rules="uinteger"
            placeholder="900"
          />
        </template>
      </tlt-tabs>
    </vuci-named-section>
  </vuci-form>
</template>
<script>
export default {
  data() {
    return {
      tabs: [
        { name: 'general', title: this.$t('General Settings') },
        { name: 'advanced', title: this.$t('Advanced Settings') }
      ],
      loadedData: {
        mounts: [],
        /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
        devices: []
      },
      ifaces: [],
      DLNAStatus: this.$t('Collecting data...'),
      interfaces: [],
      rootContainerOpts: [
        ['.', this.$t('Standard Container')],
        ['B', this.$t('Browse Directory')],
        ['M', this.$t('Music')],
        ['V', this.$t('Video')],
        ['P', this.$t('Pictures')]
      ]
    }
  },
  timers: {
    loadDLNAStatus: { time: 5000, autostart: true, immediate: true, repeat: true }
  },
  computed: {
    mediaOptions() {
      const pathArray = this.loadedData.mounts.map(device => device.mountpoint)
      return pathArray.filter(i => i).concat('/mnt')
    }
  },
  methods: {
    loadData() {
      const requests = ['/api/minidlna/options', '/api/usb_tools/mount/options']
      return this.$axios
        .bulkGet(requests)
        .then(([ifaces, mounts]) => {
          this.ifaces = ifaces.success ? ifaces.data.available_interfaces : []
          this.loadedData = {
            mounts: mounts.success ? mounts.data : []
          }
          if (!ifaces.success) this.$message.error(this.$t('Failed to load interfaces status'))
          if (!mounts.success) this.$message.error(this.$t('Failed to load mounts data'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    getDLNAStatus() {
      return this.DLNAStatus
    },
    loadDLNAStatus() {
      return this.$axios
        .get('/api/minidlna/status')
        .then(({ data }) => {
          this.DLNAStatus = data.running
            ? this.$t('The miniDLNA service is active, serving %d audio, %d video and %d image files').format(data.audio, data.video, data.images)
            : this.$t('The miniDLNA service is not running')
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to get DLNA status'))
        })
    },
    albumValidation(val) {
      const pattern = /(\/)/
      if (!val.match(pattern)) return { isValid: true }
      return { isValid: false, message: this.$t("Character '/' is not allowed.") }
    },
    handleError(err) {
      const errCode = err.data.errors[0].code
      const errors = {
        103: this.$t("Media directory doesn't exist"),
        default: this.$t('Unexpected error occurred')
      }
      return errors[errCode] || errors.default
    }
  }
}
</script>
