<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="pam;dropbear;rpcd"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="pam"
      :title="$t('PAM auth')"
      :columns="pamColumns"
      :uci-data="uciData"
      :edit-form="editModal"
      :endpoints="[{ endpoint: 'access_control/pam/config' }]"
      data-key="pamd"
      sortable
      sort-by="priority"
      :exception-options="['priority']"
    >
      <template #before>
        <div
          ref="help"
          class="w-fit"
        >
          <drag-hint :element-name="$t('instance')" />
        </div>
        <tlt-popover
          :target="() => $refs.help"
          placement="bottom"
        >
          {{ $t('Please note that only inner SSH and Web UI instances can switch priority order.') }}
        </tlt-popover></template
      >
      <template #service="{ s }">
        <vuci-form-item-dummy
          name="service"
          :uci-section="s"
          :display-value="val => serviceList[val]"
        />
      </template>
      <template #module="{ s }">
        <vuci-form-item-dummy
          name="module"
          :uci-section="s"
          :display-value="val => moduleList[val]"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          name="type"
          :uci-section="s"
          :display-value="val => typeList[val]"
        />
      </template>
      <template #server="{ s }">
        <vuci-form-item-dummy
          name="server"
          :uci-section="s"
          :display-value="val => val"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          name="enabled"
          :uci-section="s"
          @change="toggleEnabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.service"
          :label="$t('Service')"
          prop="service"
          :options="serviceOptions"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import EditForm from './PamdEdit'
import DragHint from '@/components/shared/DragHint.vue'

export default {
  components: {
    DragHint
  },
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      formData: {},
      formOptions: {
        modules: []
      },
      pamColumns: [
        { name: 'service', label: this.$t('Service') },
        { name: 'module', label: this.$t('Module') },
        { name: 'type', label: this.$t('Type') },
        { name: 'server', label: this.$t('Server') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      editModal: markRaw(EditForm),
      serviceOptions: [
        ['sshd', this.$t('SSH')],
        ['rpcd', this.$t('WebUI')]
      ],
      moduleList: {
        radius_auth: this.$t('Radius'),
        tacplus: this.$t('TACACS+'),
        unix: this.$t('Local')
      },
      serviceList: {
        sshd: this.$t('SSH'),
        rpcd: this.$t('WebUI')
      },
      typeList: {
        required: this.$t('Required'),
        requisite: this.$t('Requisite'),
        sufficient: this.$t('Sufficient'),
        optional: this.$t('Optional')
      }
    }
  },
  methods: {
    getFormOptions() {
      return this.formOptions
    },
    toggleEnabled(self) {
      const enabled = self.uciSection.enabled === '1'
      const requireMessageAuth = self.uciSection.require_message_auth === '0'
      const radiusModule = self.uciSection.module === 'radius_auth'
      const warningMsg = this.$t('RADIUS Protocol under RFC 2865 is susceptible to forgery attacks. We recommend switching Require Message-Authenticator option on.')
      if (enabled && requireMessageAuth && radiusModule) {
        this.$notification.info(warningMsg)
      } else {
        this.$notification.remove(warningMsg)
      }
    },
    loadData() {
      return this.$axios
        .get('/api/access_control/pam/options')
        .then(({ data: { modules } }) => {
          this.formOptions.modules = modules
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load modules'))
        })
    }
  }
}
</script>
