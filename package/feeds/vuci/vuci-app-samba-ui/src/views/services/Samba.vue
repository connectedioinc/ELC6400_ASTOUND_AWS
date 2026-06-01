<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="samba"
    :before-save="onBeforeSave"
    :after-load="loadData"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :title="$t('Samba')"
      :help="$t('Samba is a software solution for using the Server Message Block (SMB) networking protocol, which provides shared file access between nodes on a computer network.')"
      :endpoints="[{ endpoint: 'samba/global', sectionFilter: sections => sections[0] }]"
      data-key="samba"
    >
      <tlt-form-model-item
        :label="$t('Samba status:')"
        name="status"
      >
        <tlt-dummy-value
          :value="service.status ? $t('Up') : $t('Down')"
          :class="service.status ? 'success' : 'error'"
        />
      </tlt-form-model-item>
      <tlt-form-model-item
        :label="$t('Active sessions')"
        name="activeSessions"
      >
        <div class="flex items-center">
          <tlt-dummy-value :value="service.activeSessions ? service.activeSessions.length : '0'" />
          <tlt-hint
            break-words
            :hints="getStatusHints(service.activeSessions)"
          >
            <tlt-icon
              v-if="service.activeSessions.length"
              icon="info"
              class="ml-1 text-theme-text-info size-5"
            />
          </tlt-hint>
        </div>
      </tlt-form-model-item>
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Enable')"
        :help="$t('Toggles Samba ON or OFF.')"
        name="enabled"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Hostname')"
        :help="$t('Name of the Samba server.')"
        name="name"
        rules="string"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Description')"
        :help="$t('Short server description.')"
        name="description"
        rules="string"
      />
      <vuci-form-item-input
        :uci-section="s"
        :label="$t('Workgroup')"
        :help="$t('Name of the server\'s workgroup.')"
        name="workgroup"
      />
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Share home-directories')"
        :help="$t('Allow system users to reach their home directories via network shares.')"
        name="homes"
      />
      <vuci-form-item-select
        :uci-section="s"
        name="interface"
        :label="$t('Interfaces')"
        :help="$t('Bind samba server to specified interfaces.')"
        :options="networkOptions"
        multiple
        :placeholder="$t('-- Please select --')"
      />
      <vuci-form-item-list
        :uci-section="s"
        name="custom"
        :label="$t('Insert custom configuration to config')"
        :placeholder="$t('min receive file size = 16384')"
        prop="areaValue"
        :rules="validateCustom"
      />
      <tlt-form-model-item>
        <tlt-button
          button-class="btn tertiary-btn"
          @click="openConfig"
        >
          {{ $t('View config file') }}
        </tlt-button>
      </tlt-form-model-item>
      <tlt-logs-modal
        :title="$t('Config')"
        :help="$t('This is the content of the file \'/etc/samba/smb.conf.template\' from which your samba configuration will be generated.')"
        :logs="formatedConfig"
        :open="showModal"
        @close="closeModal"
      >
      </tlt-logs-modal>
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      type="sambashare"
      :title="$t('Shared directories')"
      :help="$t('Please add directories to share. Each directory refers to a folder on a mounted device.')"
      :columns="directoriesColumns"
      :endpoints="[{ endpoint: 'samba/shares/config' }]"
      :table-actions="['column-list', 'search']"
      data-key="shares"
      :error-handlers="{ edit: returnErrorMessage }"
    >
      <template #name="{ s }">
        <vuci-form-item-input
          :uci-section="s"
          name="name"
          rules="string"
          required
        />
      </template>
      <template #path="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="path"
          :options="mountpoints.concat(noMountPoint)"
          placeholder="/mnt/"
          allow-create
          required
        />
      </template>
      <template #users="{ s }">
        <vuci-form-item-select
          :uci-section="s"
          name="users"
          :options="usernames"
          :readonly="!userExist"
          multiple
          :placeholder="!userExist ? $t('No available users') : ''"
        />
      </template>
      <template #read_only="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="read_only"
        />
      </template>
      <template #browseable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="browseable"
        />
      </template>
      <template #guest_ok="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="guest_ok"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import tltLogsModal from '@ui-core/tlt-design/layout/TltLogsModal.vue'
export default {
  components: { tltLogsModal },
  data() {
    return {
      directoriesColumns: [
        {
          name: 'name',
          label: this.$t('Name'),
          help: this.$t('Name of the shared directory.'),
          width: 'base'
        },
        {
          name: 'path',
          label: this.$t('Path'),
          help: this.$t('Path to the shared directory. To share an entire drive, choose an automatically generated path from this drop-down box.'),
          width: 'base'
        },
        {
          name: 'users',
          label: this.$t('Allowed users'),
          help: this.$t('Defines which users can access the shared directory. Users can be created from the User tab.'),
          width: 'base'
        },
        {
          name: 'read_only',
          label: this.$t('Read-only'),
          help: this.$t('Makes the directory read-only, which means the shared directory can only be accessed to view and read files.')
        },
        {
          name: 'browseable',
          label: this.$t('Browseable'),
          help: this.$t('This controls whether this share is seen in the list of available shares in a net view and in the browse list.')
        },
        {
          name: 'guest_ok',
          label: this.$t('Allow guests'),
          help: this.$t('Enables guest access, which allows anonymous connections to the shared directory. If at least one user is selected this option will not work.')
        }
      ],
      areaValue: [],
      users: [],
      devices: [],
      formData: {},
      showModal: false,
      networks: [],
      samba: {
        status: false,
        activeSessions: []
      },
      noMountPoint: [['', this.$t('No mount point')]]
    }
  },
  computed: {
    usernames() {
      return this.users.map(user => user.username)
    },
    mountpoints() {
      const array = this.devices.map(device => device.mountpoint)
      return array.filter(i => i)
    },
    userExist() {
      return this.usernames.length > 0
    },
    networkOptions() {
      return this.networks.filter(n => n.area_type === 'lan').map(this.$network.getName)
    },
    formatedConfig() {
      return this.areaValue.join('\n')
    },
    service() {
      return this.samba
    }
  },
  mounted() {
    this.$timer.start({ method: this.updateStatus, time: 5000, autostart: false, immediate: true })
  },
  methods: {
    loadData() {
      const requests = ['/usb_tools/mount/options', '/samba/users/config', '/samba/status/', '/api/interfaces/config']
      return this.$axios
        .bulkGet(requests)
        .then(([mounts, users, status, networks]) => {
          if (!mounts.success) this.$message.error(this.$t('Failed to load mount data'))
          if (!users.success) this.$message.error(this.$t('Failed to load user data'))
          if (!status.success) this.$message.error(this.$t('Failed to load status data'))
          if (!networks.success) this.$message.error(this.$t('Failed to load networks data'))

          this.users = users.success ? users.data : []
          this.devices = mounts.success ? mounts.data : []
          this.samba.status = !!status.data.running
          this.areaValue = status.success ? status.data.config_file : []
          this.samba.activeSessions = status.success ? status.data.active_sessions : []
          this.networks = networks.data
        })
        .catch(() => {
          this.$message.error(this.$t('Unexpected error'))
        })
        .finally(() => {
          this.$timer.start(this.updateStatus)
        })
    },
    updateStatus() {
      this.$axios
        .get('/api/samba/status')
        .then(({ data }) => {
          this.samba.status = data.running
          this.samba.activeSessions = data.active_sessions
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load status'))
        })
    },
    getStatusHints(data) {
      return data.map(item => {
        return { info: item }
      })
    },
    validateCustom(val) {
      if (!/^[a-zA-Z0-9 ]+=[^?]*$/g.test(val)) {
        return {
          isValid: false,
          message: this.$t('Following format is accepted: [a-Z0-9] = [all characters are allowed except ?]')
        }
      }
      const blacklist = ['netbios name', 'display charset', 'interfaces', 'server string', 'unix charset', 'workgroup']
      const foundBlacklistedValue = blacklist.find(value => new RegExp(`^ *${value.replaceAll(' ', ' +')} *=`).test(val))
      if (foundBlacklistedValue) {
        return {
          isValid: false,
          message: this.$t("Custom value '%s' is not allowed").format(foundBlacklistedValue)
        }
      }
      return { isValid: true }
    },
    openConfig() {
      this.showModal = true
      this.$spin()
      const timer = setInterval(() => {
        return this.$axios
          .get('/api/samba/status')
          .then(({ data }) => {
            if (data.config_file.length) {
              clearInterval(timer)
              this.areaValue = data.config_file
              this.$spin(false)
            }
          })
          .catch(() => {
            this.$message.error(this.$t('An unexpected error occurred'))
          })
      }, 500)
    },
    closeModal() {
      this.showModal = false
    },
    onBeforeSave() {
      return new Promise((resolve, reject) => {
        const nameAlreadyExists = this.formData.shares.some(instance => this.formData.shares.some(share => share.name === instance.name && share.id !== instance.id))
        if (nameAlreadyExists) return reject(this.$t('Instance with the same name already exists'))
        resolve()
      })
    },
    returnErrorMessage(errors) {
      const pathNotValid = errors.payload.some(errors => errors.errors.some(error => error.code === 2))
      const pathNotDirectory = errors.payload.some(errors => errors.errors.some(error => error.code === 1))
      if (pathNotValid) return this.$t('Selected USB drive path does not exist')
      if (pathNotDirectory) return this.$t('Selected USB drive path is not a directory')
      else return this.$t('Unexpected error')
    }
  }
}
</script>
