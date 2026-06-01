<template>
  <vuci-form
    v-slot="{ uciData }"
    config="nhrp"
    :after-load="afterLoad"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      name="general"
      :endpoints="[{ endpoint: 'nhrp/global' }]"
      data-key="nhrp"
      :title="$t('NHRP - global settings')"
    >
      <vuci-form-item-switch
        :uci-section="s"
        name="enabled"
        :label="$t('Enable service')"
        :help="$t('Enable service.')"
      />
      <vuci-form-item-switch
        :uci-section="s"
        name="debug"
        :label="$t('Enable logging')"
        :help="$t('Enable logging of NHRP.')"
      />
    </vuci-named-section>
    <vuci-typed-section
      :uci-data="uciData"
      type="nhrp_instance"
      :endpoints="[{ endpoint: 'nhrp/interface/config' }]"
      data-key="interface"
      :title="$t('Interfaces')"
      :table-actions="['column-list', 'search']"
      :help="$t('List of created interfaces.')"
      :columns="interfaces"
      :edit-form="protoNhrpInterfaceEdit"
      :row-actions="s => ['edit', { id: 'delete', buttonProps: { readonly: isChildOfDMVPN(s) }, hints: deleteHints(s) }]"
    >
      <template #id="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="id"
        />
      </template>
      <template #interface="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="interface"
          :display-value="getInterface"
        />
      </template>
      <template #proto_address="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="proto_address"
        />
      </template>
      <template #nbma_address="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="nbma_address"
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
          :label="$t('Name')"
          prop="id"
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
import protoNhrpInterfaceEdit from './ProtoNhrpInterfaceEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions
    }
  },
  data() {
    return {
      protoNhrpInterfaceEdit: markRaw(protoNhrpInterfaceEdit),
      interfaces: [
        { name: 'id', label: this.$t('Name'), help: this.$t('List of created interfaces.') },
        { name: 'interface', label: this.$t('Interface'), help: this.$t('Interface which will be using NHRP.') },
        { name: 'proto_address', label: this.$t('NHS'), help: this.$t('IP address of Next-Hop Server.') },
        { name: 'nbma_address', label: this.$t('NBMA'), help: this.$t('IP address of Next-Hop Server.') },
        { name: 'enabled', label: this.$t('Enabled') }
      ],
      ifaceInstance: [],
      /** @type {import('@/types/networkTypes').InterfaceStatus[]} */
      ifStatus: [],
      ipsecConfig: []
    }
  },
  methods: {
    getInterface(x) {
      const ifaces = this.$network.interfaceOptions(this.ifStatus)
      const iface = ifaces.find(v => v[0] === x)
      let gre
      if (!iface) {
        gre = this.ifStatus.find(i => i.proto === 'gre' && i.proto + '4-' + i.interface === x)
        gre = gre && gre.proto + '4-' + gre.interface + ' (gre)'
      }
      return gre || iface?.[1]
    },
    getFormOptions() {
      return { ipsecInstances: this.ipsecConfig, ifStatus: this.ifStatus }
    },
    isChildOfDMVPN(s) {
      return s.service?.includes('dmvpn')
    },
    deleteHints(s) {
      return this.isChildOfDMVPN(s) ? [{ info: this.$t("This instance can't be deleted because it is part of DMVPN configuration") }] : []
    },
    afterLoad(form) {
      return new Promise(resolve => {
        const nhrpMapping = form.interface.map(f => `/api/nhrp/interface/${f.id}/mapping/config`)
        const nhrpNhs = form.interface.map(f => `/api/nhrp/interface/${f.id}/nhs/config`)
        const nhrpRequests = nhrpMapping.concat(nhrpNhs)
        this.$axios
          .bulkGet(['/api/interfaces/status', { endpoint: '/api/ipsec/config', condition: this.$store.hasPackages('strongswan.control') }, ...nhrpRequests])
          .then(([status, ipsecConfig, ...nhrpRequests]) => {
            if (status.success) this.ifStatus = status.data
            else this.$message.error(this.$t('Failed to load interface status'))
            if (ipsecConfig.success) this.ipsecConfig = ipsecConfig.data
            else this.$message.error(this.$t('Failed to load ipsec configuration'))
            if (nhrpRequests.some(n => !n.success)) this.$message.error(this.$t('Failed to load nhrp configuration'))
            const sections = nhrpRequests.reduce((data, response) => {
              return data.concat(response.data)
            }, [])
            resolve({ mapping: sections, nhs: sections })
          })
          .catch(() => {
            this.$message.error(this.$t('An unexpected error occurred'))
          })
      })
    }
  }
}
</script>
