<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="chilli"
    :after-load="loadData"
  >
    <vuci-typed-section
      type="chilli"
      :uci-data="uciData"
      :title="$t('Hotspot instances')"
      :table-actions="['search', 'column-list']"
      :columns="columns"
      :edit-form="HotspotEdit"
      :endpoints="[{ endpoint: 'hotspot/config' }]"
      data-key="general"
      :error-handlers="{
        edit: handleEditError,
        create: handleCreateErrors
      }"
    >
      <template #auth_mode="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="mode"
          :display-value="loadMode"
        />
      </template>
      <template #ip="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="uamlisten"
        />
      </template>
      <template #ifaces="{ s }">
        <ul>
          <li
            v-for="iface in network(s)"
            :key="iface"
          >
            {{ iface }}
          </li>
        </ul>
      </template>
      <template #enable="{ s }">
        <vuci-form-item-switch
          :uci-section="s"
          name="enabled"
          @change="validateEnable"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-select
          v-model="addModel.network"
          required
          :label="$t('Interface')"
          prop="network"
          :options="interfaceList()"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>
<script>
import { markRaw } from 'vue'
import HotspotEdit from './HotspotEdit'
import { useCertificatesStore } from '@/stores/certificates'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions,
      handleEditError: this.handleEditError
    }
  },
  data() {
    return {
      formData: {},
      columns: [
        { name: 'auth_mode', label: this.$t('Auth mode') },
        { name: 'ip', label: this.$t('IP') },
        { name: 'ifaces', label: this.$t('Interfaces') },
        { name: 'enable', label: this.$t('Enabled') }
      ],
      modeDisplayValues: {
        radius: this.$t('External RADIUS'),
        local: this.$t('Local users'),
        sms_otp: this.$t('SMS OTP'),
        mac_auth: this.$t('MAC Auth'),
        sso: this.$t('Single sign-on')
      },
      profiles: {
        hotspotsystems: this.$t('Hotspot systems'),
        default: this.$t('Default'),
        cloud4wi: this.$t('Cloud4wi'),
        purple: this.$t('Purple portal')
      },
      HotspotEdit: markRaw(HotspotEdit),
      /** @type {import('@/types/networkTypes').InterfaceStatus[]} */
      ifaceStatuses: [],
      formOptions: {
        wifiDevices: [],
        modems: [],
        users: [],
        hotspotGroups: [],
        ifaceList: this.interfaceList,
        certificates: [],
        system: {},
        profiles: { options: [], data: [] },
        dhcp: [],
        systemUsers: [],
        wirelessDevice: []
      },
      editErrors: {
        1: this.$t('Hotspot network subnet is already being used by network interface'),
        default: this.$t('An unexpected error occurred')
      },
      createErrors: {
        5: this.$t('Maximum amount of instances has been reached'),
        default: this.$t('Failed to create new instance')
      }
    }
  },
  computed: {
    certificatesStore() {
      return useCertificatesStore()
    }
  },
  methods: {
    getFormOptions() {
      return {
        ...this.formOptions,
        certificates: this.certificatesStore.generatedCertificates
      }
    },
    usedNetworks() {
      const usedNetworks = new Set(
        this.formData.general?.flatMap(item => {
          const networks = [item.network]
          if (item.moreif && Array.isArray(item.moreif)) {
            networks.push(...item.moreif)
          }
          return networks
        })
      )
      return usedNetworks
    },
    interfaceList() {
      const ifaceOptions = this.ifaceStatuses
        .filter(iface => iface.interface && iface.device && iface.interface !== 'loopback' && iface.area_type === 'lan')
        .map(iface => [this.$network.getName(iface), `${this.$network.getName(iface)} (${iface.device})`])
      const wifiDevices = this.formOptions.wifiDevices
        .filter(dev => !dev.disabled && !this.usedNetworks().has(dev.wifi_id))
        .map(device => [device.wifi_id, `${device.ssid}${device.ifname ? ` (${device.ifname})` : ''}`])
      return ifaceOptions.concat(wifiDevices)
    },
    loadMode(self) {
      return this.modeDisplayValues[self] || '-'
    },
    displayErrorMessage(type) {
      const errors = {
        interfaces: this.$t('Failed to load interface data'),
        interfaceStatus: this.$t('Failed to load interface statuses'),
        users: this.$t('Failed to load hotspot user data'),
        groups: this.$t('Failed to load hotspot group data'),
        wireless: this.$t('Failed to load wireless data'),
        profiles: this.$t('Failed to load profile data'),
        system: this.$t('Failed to load system data'),
        modem: this.$t('Failed to load modem data'),
        dhcp: this.$t('Failed to load dhcp data'),
        susers: this.$t('Failed to load system user data'),
        sgroups: this.$t('Failed to load system group data')
      }
      this.$message.error(errors[type])
      return []
    },
    loadData() {
      const requests = [
        '/api/hotspot/users/config',
        '/api/interfaces/basic/status',
        '/api/hotspot/groups/config',
        '/api/hotspot/options',
        '/api/system/device/status',
        { endpoint: '/api/modems/status', condition: 'mobifd.control' },
        { endpoint: '/api/wireless/interfaces/basic/status', condition: 'vuci-app-wireless-api.control' },
        '/api/dhcp/servers/ipv4/config',
        '/api/users/config',
        { endpoint: '/api/wireless/interfaces/config', condition: 'vuci-app-wireless-api.control' }
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([users, ifaceStatus, groups, prof, system, modem, basic, dhcp, systemUsers, wireless]) => {
          this.formOptions.dhcp = dhcp.success ? dhcp.data : this.displayErrorMessage('dhcp')
          this.ifaceStatuses = ifaceStatus.success ? ifaceStatus.data : this.displayErrorMessage('interfaceStatus')
          this.formOptions.users = users.success ? users.data : this.displayErrorMessage('users')
          this.formOptions.hotspotGroups = groups.success ? groups.data : this.displayErrorMessage('groups')
          this.formOptions.modems = modem.success ? this.$mobile.modemsOptions(modem.data) : this.displayErrorMessage('modem')
          this.formOptions.profiles = prof.success ? this.mapProfiles(prof.data) : this.displayErrorMessage('profiles')
          this.formOptions.system = system.success ? system.data.static : this.displayErrorMessage('system')
          this.formOptions.systemUsers = systemUsers.success ? systemUsers.data : this.displayErrorMessage('susers')
          this.formOptions.wifiDevices = basic.success ? basic.data : this.displayErrorMessage('wireless')
          this.formOptions.wirelessDevice = wireless.success ? wireless.data : this.displayErrorMessage('wireless')
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    mapProfiles(profileList) {
      return { options: profileList.map(prof => [prof.id, this.profiles[prof.id]]), data: profileList }
    },
    network(instance) {
      const ifaces = instance?.moreif ? [...instance.moreif] : []
      if (instance?.network && !ifaces.includes(instance.network)) {
        ifaces.push(instance?.network)
      }
      return ifaces.map(iface => {
        if (iface.match(/wifi\d+/g)) {
          const filteredWifi = this.formOptions.wifiDevices.find(device => device.wifi_id === iface)
          return `${filteredWifi?.ssid ?? '-'}` + (filteredWifi?.ifname ? ` (${filteredWifi.ifname})` : '')
        }
        return iface
      })
    },
    validateEnable(self) {
      const instance = self.uciSection
      const iface = this.formOptions.wifiDevices.find(i => i.wifi_id === instance.network)
      if (iface && iface.status === '0' && instance.enabled === '1') {
        self.model = '0'
        return this.$notification.info({
          id: 'disabled_interface',
          title: this.$t('Configure wireless'),
          text: this.$t(`Wireless interface '%s' must be enabled before activating hotspot.`).format(iface.ssid),
          action: {
            text: this.$t('Update settings'),
            to: `/network/wireless/ssids?edit=${iface.id}`,
            type: 'button'
          }
        })
      }
      const warningMsg = this.$t('RADIUS Protocol under RFC 2865 is susceptible to forgery attacks. We recommend enabling Require Message-Authenticator option in Radius settings.')
      if (instance.mode === 'radius' && instance.enabled === '1' && instance.radiusrequiremessageauth === '0') {
        this.$notification.info(warningMsg)
      } else {
        this.$notification.remove(warningMsg)
      }
      const mode = instance.mode === 'local'
      if (mode && this.formOptions.users.length === 0) {
        this.$message.error(this.$t('To enable the Hotspot please create at least one user where authentication is set to "Local users".'))
        self.model = '0'
      }
    },
    handleCreateErrors(response) {
      const { code } = response?.data?.errors?.[0] || ''
      return this.createErrors[code] || this.createErrors.default
    },
    handleEditError(response) {
      const errorCode = response?.payload ? response?.payload[0]?.errors[0]?.code : response?.data.errors[0].code
      return this.editErrors[errorCode] || this.editErrors.default
    }
  }
}
</script>
