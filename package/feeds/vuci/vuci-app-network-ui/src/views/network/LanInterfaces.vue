<template>
  <interface-section
    v-bind="sectionOptions"
    ref="interfaceSection"
    page-type="lan"
  >
    <template #enable="{ s }">
      <cell-row
        class="lg:min-w-max"
        only-mobile-label
        :label="$t('Enable')"
      >
        <template #value>
          <vuci-form-item-switch
            :uci-section="s"
            name="enabled"
          />
        </template>
      </cell-row>
    </template>
  </interface-section>
</template>

<script>
import InterfaceSection from './InterfaceSection'
export default {
  components: { InterfaceSection },
  data() {
    return {
      sectionOptions: {
        sectionConfig: {
          title: this.$t('LAN interfaces'),
          afterDelete: this.afterDelete
        }
      }
    }
  },
  methods: {
    afterDelete(section) {
      const formData = this.$refs.interfaceSection.formData
      if (section.proto === 'static') {
        formData.dhcpv4 = formData.dhcpv4.filter(dhcpSection => dhcpSection.id !== section.id)
        formData.dhcpv6 = formData.dhcpv6.filter(dhcpSection => dhcpSection.id !== section.id)
      }
      if (section.bridge === '1') {
        this.removeUsedBridgeDevice(section)
        this.updateNetworkDevices()
      }
    },
    removeUsedBridgeDevice(section) {
      const formData = this.$refs.interfaceSection.formData
      formData.interfaces.forEach(s => {
        if (s.ifname && s.ifname.includes(`br-${section.id}`)) {
          s.ifname = ''
        }
      })
    },
    updateNetworkDevices() {
      return this.$axios
        .get('/api/basic/network/devices/status')
        .then(res => {
          this.$refs.interfaceSection.formOptions.networkDevices = res.data
        })
        .catch(() => {
          this.$message.error(this.$t('Failed to update network devices data.'))
        })
    }
  }
}
</script>
