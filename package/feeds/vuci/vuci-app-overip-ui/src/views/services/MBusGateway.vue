<template>
  <vuci-form
    v-slot="{ uciData }"
    v-model="formData"
    config="rs_overip"
    :after-load="loadData"
    :before-save="() => validateEdit({ $serial, section, serialStatus, formData })"
    bulk-request
  >
    <over-ip-options
      v-if="section"
      :uci-data="uciData"
      :form-data="formData"
      :section="section"
      :certificates="certificates"
      :firewall-zones="firewallZones"
      :serial-status="serialStatus"
      :serial-devices="serialDevices"
      hide-name
      hide-device
      hide-databits
      hide-flow-control
      @after-save="res => afterEditLoad(res.data)"
    />
  </vuci-form>
</template>

<script>
import OverIpOptions from './OverIPOptions.vue'
import useOveripUtils from './useOveripUtils.js'

export default {
  components: { OverIpOptions },
  data() {
    const { loadDataForEdit, afterEditLoad, validateEdit } = useOveripUtils()

    return {
      loadDataForEdit,
      afterEditLoad,
      validateEdit,

      section: undefined,

      certificates: [],
      firewallZones: [],
      serialStatus: [],
      serialDevices: [],

      formData: {}
    }
  },
  methods: {
    hasOveripAccess(permissionType) {
      return this.$session.hasAccess('services/serial_utilities/overip', permissionType)
    },
    async getMBusSection() {
      if (this.hasOveripAccess('read')) {
        const overipResponse = await this.$axios.get('/api/overip/config')
        if (!overipResponse.success) {
          this.$message.error(this.$t('Failed to load M-Bus gateway configuration'))
          return
        }

        for (const section of overipResponse.data) {
          if (section.device === '/dev/mbus') {
            return section
          }
        }
      } else {
        this.$message.error(this.$t('No OverIP read access'))
      }

      if (this.hasOveripAccess('write')) {
        const createResponse = await this.$axios.post('/api/overip/config', {
          data: {
            name: 'M-Bus_gateway',
            device: '/dev/mbus',
            enabled: '0',
            // TODO: Use default serial settings from board json
            baudrate: '2400',
            stopbits: '1',
            parity: 'even',
            databits: '8',
            flowcontrol: 'none'
          }
        })
        if (!createResponse.success) {
          this.$message.error(this.$t('Failed to initialize M-Bus gateway configuration'))
          return
        }
        return createResponse.data
      } else {
        this.$message.error(this.$t('No OverIP write access'))
      }
    },
    async loadData(form) {
      form.overip = []

      const section = (await this.getMBusSection()) || { device: '/dev/mbus' }
      this.section = section
      this.afterEditLoad(this.section)
      form.overip.push(section)

      const sectionIds = form.overip.map(section => section.id)
      const { certificates, firewallZones, serialStatus, uciData, serialDevices } = await this.loadDataForEdit(this.$axios, sectionIds)

      this.certificates = certificates
      this.firewallZones = firewallZones
      this.serialStatus = serialStatus
      this.serialDevices = serialDevices

      return uciData
    }
  }
}
</script>
