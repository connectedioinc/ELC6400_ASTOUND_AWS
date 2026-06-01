<template>
  <vuci-form
    v-slot="{ uciData }"
    config="profiles;system"
    :after-load="afterLoad"
    :no-apply="true"
  >
    <vuci-typed-section
      ref="section"
      :title="$t('Configuration profiles')"
      :uci-data="uciData"
      :help="
        $t(
          'This section displays user defined configuration profiles. Configuration profiles provide a way to create multiple distinct router configuration sets and apply them to the router based on current user requirements. The \'Apply\' button applies the selected configuration on the router.'
        )
      "
      type="profile"
      :columns="profilesColumns"
      :add-title="$t('Add new profile')"
      :table-actions="['search', 'column-list']"
      :endpoints="[{ endpoint: 'profiles/config' }]"
      data-key="profile"
      :form-methods="['get', 'create', 'delete']"
      :add-validate="onAdd"
      :after-add="afterAdd"
      :error-handlers="{
        create: handleError
      }"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #updated="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="updated"
          :display-value="loadDate"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          :label="$t('Name')"
          prop="id"
          required
          rules="uciname"
          maxlength="20"
        />

        <tlt-form-item-switch
          v-model="addModel.from_current_profile"
          :label="$t('Profile from current configuration')"
          true-value="1"
          false-value="0"
          prop="from_current_profile"
        />
      </template>
      <template #delete="{ s, actions }">
        <div class="flex items-center gap-2 w-full">
          <tlt-button
            :readonly="!canApply(s)"
            button-id="apply"
            type="text"
            @click="applyProfilePrompt(s.id)"
          >
            {{ !canApply(s) ? $t('Applied') : $t('Apply') }}
          </tlt-button>
          <tlt-hint :hints="deleteHint(s)">
            <tlt-button
              button-id="delete"
              type="text"
              color="error"
              :readonly="deleteHint(s).length > 0"
              @click="actions.delete(s.id)"
              >{{ $t('Delete') }}</tlt-button
            >
          </tlt-hint>
        </div>
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
export default {
  data() {
    return {
      profilesColumns: [
        { name: 'name', label: this.$t('Profile Name'), help: this.$t('Name for easier management.') },
        {
          name: 'updated',
          label: this.$t('Created / Updated'),
          help: this.$t('Exact date when profile was created or updated.')
        }
      ],
      profileErrors: {
        1: this.$t('Unable to apply profile. Scheduler is enabled.'),
        2: this.$t('Cannot switch profile while modem is in use.'),
        3: this.$t('Modem is unreachable.'),
        4: this.$t('Failed to restart modem(s).'),
        5: this.$t('Current profile configuration not found.'),
        default: this.$t('An unexpected error occurred')
      },
      appliedProfile: 'default',
      scheduler: []
    }
  },
  methods: {
    afterLoad() {
      return this.$axios
        .bulkGet(['/api/profiles/status', '/api/profiles/scheduler/config'])
        .then(([profilesData, schedulerData]) => {
          if (profilesData.success) this.appliedProfile = profilesData.data.current_profile
          else this.$message.error(this.$t('Failed to load profile status'))
          if (schedulerData.success) this.scheduler = schedulerData.data
          else this.$message.error(this.$t('Failed to load profile scheduler'))
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    canApply(s) {
      return s.id !== this.appliedProfile
    },
    deleteHint(s) {
      if (s.id === 'default') return [{ info: this.$t('Default profile cannot be deleted') }]
      else if (s.id === this.appliedProfile) return [{ info: this.$t('This profile cannot be deleted because it is currently applied') }]
      else if (this.scheduler.some(scheduler => scheduler.profile_id === s.profile_id)) return [{ info: this.$t('This profile cannot be deleted because it is used by the scheduler') }]
      else return []
    },
    loadDate(timestamp) {
      return this.$localDate(timestamp)
    },
    applyProfile(profile) {
      this.$spin(this.$t('Applying profile %s').format(profile))
      return this.$axios
        .post('/api/profiles/actions/apply_profile', {
          data: {
            name: profile
          }
        })
        .then(({ data }) => {
          this.$message.success(this.$t('Profile applied'))
          this.appliedProfile = profile
          this.$store.profile = profile
          const port = window.location.protocol === 'http:' ? (data?.http_port ? data.http_port : data.https_port) : data.https_port
          this.$VuciValidator.value = window.location.hostname
          const resIp4addr = this.$VuciValidator.ip4addr()
          const ipAddrRedirect = resIp4addr.isValid ? (data?.lan_ipv4 ? data.lan_ipv4 : `[${data?.lan_ipv6}]`) : data?.lan_ipv6 ? `[${data.lan_ipv6}]` : data?.lan_ipv4
          this.$reconnect(this.$t('Applying profile'), { address: ipAddrRedirect, port })
        })
        .catch(error => {
          this.$message.error(this.profileErrors[error?.response?.data?.errors?.[0].code] || this.profileErrors.default)
          this.$spin(false)
        })
    },
    onAdd(_, dataSource) {
      if (dataSource.filter(source => source['.type'] === 'profile').length > 9) {
        return { valid: false, message: this.$t("Can't create more instances. Only 10 profile instances are allowed") }
      }
      return { valid: true }
    },
    afterAdd(form, data) {
      if (form.from_current_profile !== '1') return
      data.uciData.profile.find(profile => profile.id === this.appliedProfile).updated = data.newSection.updated
    },
    handleError(error) {
      return this.profileErrors[error?.data?.errors?.[0].code] || this.profileErrors.default
    },
    applyProfilePrompt(profile) {
      return this.$prompt.show({
        title: this.$t('Change profile?'),
        content: this.$t('Are you sure you want to change profile to "%s"?').format(profile),
        okText: this.$t('Confirm'),
        cancelText: this.$t('Cancel'),
        onOk: () => {
          return this.applyProfile(profile)
        }
      })
    }
  }
}
</script>
