<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="network"
    :after-load="loadData"
  >
    <vuci-typed-section
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'interface_based_vlan/config' }]"
      data-key="device"
      type="device"
      :title="$t('Interface based VLAN')"
      :help="
        $t(
          'Q-in-Q VLAN tunnel enables a possibility to segregate the traffic of different users in their infrastructure, \
                  while still giving a full range of VLANs for their internal use by adding a second tag to an already tagged frame.'
        )
      "
      :columns="deviceColumns"
      :error-handlers="{ create: handleCreateErrors }"
      :edit-form="editModal"
      :after-delete="deleteQnQ"
      :table-actions="['column-list', 'search']"
    >
      <template #name="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="name"
        />
      </template>
      <template #vid="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="vid"
        />
      </template>
      <template #type="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="type"
          :display-value="displayType"
        />
      </template>
      <template #ifname="{ s }">
        <vuci-form-item-dummy
          :uci-section="s"
          name="ifname"
          :display-value="displayInterface"
        />
      </template>
      <template #addForm="{ addModel }">
        <tlt-form-item-input
          v-model="addModel['name']"
          :label="$t('New Device Name')"
          :help="$t('Name of the new VLAN device.')"
          prop="name"
          required
          :rules="v => [v.uciname, validateName]"
          maxlength="8"
        />
      </template>
    </vuci-typed-section>
  </vuci-form>
</template>

<script>
import { markRaw } from 'vue'
import EditForm from './VlanInterfaceEdit'

export default {
  provide() {
    return {
      formOptions: this.getFormOptions,
      validateName: value => this.validateName(value)
    }
  },
  data() {
    return {
      editModal: markRaw(EditForm),
      deviceColumns: [
        {
          name: 'name',
          label: this.$t('Device name'),
          help: this.$t('Name of the device. Used for easier tunnels management purpose only.')
        },
        { name: 'vid', label: this.$t('Tag'), help: this.$t('Device tag.') },
        { name: 'type', label: this.$t('Type'), help: this.$t('Device type.') },
        { name: 'ifname', label: this.$t('Interface'), help: this.$t('802.1ad tagged interface.') }
      ],
      typeValues: {
        '8021ad': '802.1AD',
        '8021q': '802.1Q'
      },
      formData: {},
      formOptions: {
        /** @type {import('@/types/networkDeviceTypes').DeviceStatus[]} */
        networkDevices: []
      }
    }
  },
  methods: {
    getFormOptions() {
      return this.formOptions
    },
    loadData(form) {
      const requests = [
        '/api/basic/network/devices/status?virtual=true',
        '/api/l2tpv3/config',
        {
          endpoint: '/api/port_based_vlan/config',
          condition: !!this.$menu.findMenuItem('/network/vlan/port_based')
        },
        ...form.device.map(section => `/api/interface_based_vlan/${section.id}/devices/config`)
      ]
      return this.$axios
        .bulkGet(requests)
        .then(([networkDevicesResponse, L2tpv3Response, portBasedVlans, ...vlanDeviceResponse]) => {
          if (!networkDevicesResponse.success) this.$message.error(this.$t('Failed to load network devices'))
          if (!L2tpv3Response.success) this.$message.error(this.$t('Failed to load L2tpv3 instances'))
          if (!portBasedVlans.success) this.$message.error(this.$t('Failed to load Port Based VLANs'))
          const qDevices = {}
          form.device.forEach((section, index) => {
            const response = vlanDeviceResponse[index]
            if (response.success) {
              qDevices[`${section.id}_qDevices`] = vlanDeviceResponse[index].data
            } else {
              this.$message.error(this.$t('Failed to load Q-in-Q device'))
            }
          })
          this.formOptions = {
            QinQDevices: [].concat(...Object.values(qDevices)),
            vlanDevices: form.device,
            networkDevices: networkDevicesResponse.success ? networkDevicesResponse.data : [],
            L2tpv3Data: L2tpv3Response.success ? L2tpv3Response.data : [],
            portBasedVlans: portBasedVlans.success ? portBasedVlans.data : []
          }
          return qDevices
        })
        .catch(() => {
          this.$message.error(this.$t('An unexpected error occurred'))
        })
    },
    displayType(value) {
      return this.typeValues[value] || '-'
    },
    displayInterface(value) {
      return value.replace('l2v3', 'L2TPv3')
    },
    validateName(input) {
      const networkDevices = this.formOptions.networkDevices.map(section => section.name)
      const allDevices = Object.keys(this.formData).reduce((res, val) => {
        return res.concat(this.formData[val])
      }, [])
      const deviceFound = allDevices.some(section => input === section.name)
      if (networkDevices.includes(input) || deviceFound) {
        return {
          isValid: false,
          message: this.$t("Name '%s' is already in use").format(input)
        }
      }
      if (!/[a-zA-Z]/.test(input)) {
        return {
          isValid: false,
          message: this.$t('Value must contain a single letter')
        }
      }
      return { isValid: true }
    },
    handleCreateErrors(e) {
      const messages = {
        106: this.$t("Can't create interface based VLAN. All parent interfaces are used"),
        default: this.$t('Failed to create configuration')
      }
      const { code } = e.data?.errors?.[0] || ''
      return messages[code] || messages.default
    },
    deleteQnQ(section) {
      this.formOptions.networkDevices = this.formOptions.networkDevices.filter(
        s => (s.type !== '8021q' || s.type !== '8021ad') && s.name !== section.name && !this.formData[`${section.id}_qDevices`]?.some(qdev => qdev?.name === s.name)
      )
      delete this.formData[`${section.id}_qDevices`]
    }
  }
}
</script>
