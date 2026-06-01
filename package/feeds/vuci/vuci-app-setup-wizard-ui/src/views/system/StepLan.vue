<template>
  <vuci-form
    ref="form"
    v-model="formData"
    config="network"
    :after-load="parseDhcpData"
    :before-save="onBeforeSave"
    bulk-request
  >
    <template #default="{ uciData }">
      <tlt-card :title="$t('LAN configuration')">
        <vuci-named-section
          v-slot="{ s }"
          :uci-data="uciData"
          :endpoints="[{ endpoint: 'interfaces/config' }]"
          name="lan"
          data-key="networks"
        >
          <ip-fields
            :s="s"
            :wizard="isDifferentInitialIP"
          />
        </vuci-named-section>
        <vuci-named-section
          v-slot="{ s }"
          name="lan"
          :uci-data="uciData"
          :endpoints="[{ endpoint: 'dhcp/servers/ipv4/config' }]"
          data-key="dhcpv4"
          :exception-options="['.new_section']"
          :visible="interfaceSection.proto === 'static' && interfaceSection.area_type === 'lan'"
        >
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable DHCPv4 server')"
            name="enable_dhcpv4"
          >
            <template #help>
              <string-with-links :text="$t('More detailed configuration can be found in %s page.').format(formatLink(`/network/dhcp_servers/general/ipv4?edit=${s.id}`, $t('DHCPv4 server')))" />
            </template>
          </vuci-form-item-switch>
        </vuci-named-section>
        <vuci-named-section
          v-slot="{ s }"
          name="lan"
          :uci-data="uciData"
          :endpoints="[{ endpoint: 'dhcp/servers/ipv6/config' }]"
          data-key="dhcpv6"
          class="mt-4!"
          :visible="interfaceSection.proto === 'static' && interfaceSection.area_type === 'lan'"
          :exception-options="['ra', 'dhcpv6']"
        >
          <vuci-form-item-switch
            :uci-section="s"
            :label="$t('Enable DHCPv6 server')"
            name="enable_dhcpv6"
            @change="$network.validateDhcpV6Enable(s, true)"
          >
            <template #help>
              <string-with-links :text="$t('More detailed configuration can be found in %s page.').format(formatLink(`/network/dhcp_servers/general/ipv6?edit=${s.id}`, $t('DHCPv6 server')))" />
            </template>
          </vuci-form-item-switch>
        </vuci-named-section>
      </tlt-card>
    </template>
    <template #form-buttons="{ save }">
      <setup-wizard-steps
        :save="save"
        :back="{ reverse: true }"
      />
    </template>
  </vuci-form>
</template>
<script>
import IpFields from '@/components/network/IpFields.vue'
import SetupWizardSteps from '@/components/system/SetupWizardSteps.vue'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'

/** @typedef {import('@/types/networkTypes').Interface} Interface */
/** @typedef {import('@/types/dhcpTypes').DhcpV4Config} DhcpV4Config */
export default {
  components: { IpFields, SetupWizardSteps, StringWithLinks },
  data() {
    return {
      formatLink,
      formData: {
        /** @type {Interface[]} */
        networks: [],
        /** @type {DhcpV4Config[]} */
        dhcpv4: []
      },
      initialIp: ''
    }
  },
  computed: {
    section() {
      return this.formData.dhcpv4.find(d => d.id === 'lan') || {}
    },
    interfaceSection() {
      return this.formData.networks.find(d => d.id === 'lan') || {}
    },
    isDifferentInitialIP() {
      return this.interfaceSection.ipaddr !== this.initialIp
    }
  },
  methods: {
    parseDhcpData(form) {
      if (!form.dhcpv4.find(section => section.id === 'lan')) {
        form.dhcpv4.push({ id: 'lan', '.new_section': true })
        form.dhcpv6.push({ id: 'lan', ra: 'server', dhcpv6: 'server' })
      }

      const idx = form.networks.findIndex(n => n.id === 'lan')
      this.initialIp = form.networks[idx]?.ipaddr || '192.168.1.1'
      if (idx !== -1 && this.$store.lanIP) {
        form.networks[idx].ipaddr = this.$store.lanIP
      }
    },
    onBeforeSave() {
      if (this.isDifferentInitialIP) {
        this.$store.lanIP = this.interfaceSection.ipaddr
      }
      return Promise.resolve()
    }
  }
}
</script>
