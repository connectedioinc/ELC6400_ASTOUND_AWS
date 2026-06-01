<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="emailrelay"
  >
    <vuci-typed-section
      :title="$t('Email relay configuration')"
      :table-actions="['search', 'column-list']"
      :help="$t('This section displays Email relays that are currently configured on the router.')"
      :columns="emailColumns"
      :edit-form="editModal"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'email_relay/config', sectionFilter: s => s }]"
      data-key="emailrelay"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #mode="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="mode"
          :display-value="displayMode"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EmailRelayEdit from './EmailRelayEdit'

export default {
  provide() {
    return {
      validatePorts: this.validatePorts
    }
  },
  data() {
    return {
      editModal: markRaw(EmailRelayEdit),
      emailColumns: [
        { name: 'name', label: this.$t('Instance name'), help: this.$t('Name of the instace.') },
        { name: 'mode', label: this.$t('Mode'), help: this.$t('Instance mode.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      modeOptions: [
        ['server', this.$t('Server')],
        ['proxy', this.$t('Proxy')],
        ['cmdline', this.$t('Command line')]
      ],
      formData: {}
    }
  },
  methods: {
    displayMode(value) {
      return this.modeOptions[this.modeOptions.findIndex(mode => mode[0] === value)][1]
    },
    validatePorts(val, self) {
      const sectionValues = self.uciSection
      if (this.formData.emailrelay.some(instance => instance.id !== sectionValues.id && (instance.smtp_port === val || instance.pop_port === val))) {
        return { isValid: false, message: this.$t('Port is used in another instance') }
      }
      if (sectionValues.smtp_port === sectionValues.pop_port) {
        return { isValid: false, message: this.$t('Port is used in another field') }
      }
      return { isValid: true }
    },
    validateEnable(self) {
      const sectionValues = self.uciSection
      if (sectionValues.mode !== 'cmdline' && !sectionValues.smtp_port && !sectionValues.pop_port) {
        self.model = self.initialValue
        this.$message.error(this.$t('Instance cannot be enabled without SMTP and POP ports'))
      }
    }
  }
}
</script>
