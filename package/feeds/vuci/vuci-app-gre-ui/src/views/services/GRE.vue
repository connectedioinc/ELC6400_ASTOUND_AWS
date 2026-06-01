<template>
  <vuci-form
    v-slot="{ uciData }"
    :after-load="loadRoutes"
    config="network"
  >
    <vuci-typed-section
      :uci-data="uciData"
      data-key="gre"
      :endpoints="[{ endpoint: 'gre/config' }]"
      type="interface"
      :title="$t('GRE configuration')"
      :table-actions="['search', 'column-list']"
      :help="$t('This section displays GRE Tunnel instances currently existing on the router.')"
      :columns="deviceColumns"
      :edit-form="editModal"
      :after-delete="onAfterDelete"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: isChildOf(s) }, hints: deleteHints(s) }]"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #peeraddr="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="peeraddr"
        />
      </template>
      <template #enabled="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel.id"
          prop="id"
          :label="$t('New configuration name')"
          :help="
            $t(
              'Name of the new GRE configuration. \
             Used for easier configurations management purpose only'
            )
          "
          rules="uciname"
          maxlength="8"
          required
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './GREEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },

  data() {
    return {
      editModal: markRaw(EditForm),
      greConfig: [],
      deviceColumns: [
        {
          name: 'name',
          label: this.$t('Tunnel name'),
          help: this.$t('Name of the tunnel. Used for easier tunnels management purpose only.')
        },
        { name: '_tunlink', label: this.$t('Tunnel source'), displayFn: (_, record) => this.getGreConfigField(record.id, '_tunlink') },
        { name: 'peeraddr', label: this.$t('Remote endpoint IP address') },
        { name: '_tun_net', label: this.$t('Tunnel IPv4 network'), displayFn: (_, record) => this.getGreConfigField(record.id, '_tun_net') },
        { name: 'tun_ip6addr', label: this.$t('Tunnel IPv6 network'), displayFn: (_, record) => this.getGreConfigField(record.id, 'tun_ip6addr') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      formOptions: {
        interfaceData: []
      }
    }
  },
  timers: {
    getGreConfig: { time: 10000, autostart: true, immediate: true, repeat: true }
  },
  methods: {
    getGreConfig() {
      return this.$axios
        .get('/api/gre/config')
        .then(({ data }) => {
          this.greConfig = Object.fromEntries(data.map(i => [i.id, i]))
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to load GRE status data'))
        })
    },
    getGreConfigField(id, field) {
      return this.greConfig[id]?.[field] || '-'
    },
    isChildOf(s) {
      if (s.services?.includes('dmvpn') && s.services?.includes('ipsec')) return this.$t('DMVPN and IPSEC')
      if (s.services?.includes('dmvpn')) return 'DMVPN'
      if (s.services?.includes('ipsec')) return 'IPSEC'
      return false
    },
    deleteHints(s) {
      return this.isChildOf(s) ? [{ info: this.$t("This instance can't be deleted because it is part of %s configuration").format(this.isChildOf(s)) }] : []
    },
    getFormOptions() {
      return this.formOptions
    },
    /**
     * @description Function goes through all gre sections in form, and collects routes for each section
     * @param {object} form - form with gre section in it.
     * @return {Promise<Object>}
     */
    loadRoutes(form) {
      const routes4Requests = form.gre.map(s => `/api/gre/${s.id}/routes/config`)
      const routes6Requests = form.gre.map(s => `/api/gre/${s.id}/routes6/config`)
      const requests = ['/api/interfaces/config', ...routes4Requests, ...routes6Requests]
      return this.$axios
        .bulkGet(requests)
        .then(res => {
          const uciData = {}
          const interfacesResponse = res.shift()
          const routes4 = res.slice(0, res.length / 2)
          const routes6 = res.slice(res.length / 2)
          if (interfacesResponse.success) {
            this.formOptions = {
              interfaceData: interfacesResponse.data
            }
          } else {
            this.$message.error(this.$t('Failed to load network interfaces'))
          }
          routes4.forEach((response, index) => {
            const sectionName = form.gre[index].id
            if (response.success) uciData[`${sectionName}routes4`] = response.data
            else this.$message.error(this.$t('Failed to load GRE IPv4 routes for %s instance.').format(sectionName))
          })
          routes6.forEach((response, index) => {
            const sectionName = form.gre[index].id
            if (response.success) uciData[`${sectionName}routes6`] = response.data
            else this.$message.error(this.$t('Failed to load GRE IPv6 routes for %s instance.').format(sectionName))
          })
          return uciData
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    onAfterDelete(section, uciData) {
      uciData[`${section.id}routes4`] = []
      uciData[`${section.id}routes6`] = []
    }
  }
}
</script>
