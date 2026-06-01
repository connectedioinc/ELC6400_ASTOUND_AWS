<template>
  <vuci-form
    v-model="formData"
    config="rs_overip"
    editing
    :after-load="() => afterEditLoad(section)"
    :before-save="() => validateEdit({ $serial, section, serialStatus, formData })"
    bulk-request
  >
    <template #default="{ uciData }">
      <over-ip-options
        :uci-data="uciData"
        :form-data="formData"
        :section="section"
        :certificates="certificates"
        :firewall-zones="firewallZones"
        :serial-status="serialStatus"
        :serial-devices="serialDevices"
      />
    </template>
    <template #form-buttons="{ save }">
      <div class="w-max ml-auto">
        <tlt-button
          button-id="saveandapply"
          :readonly="!anyDeviceExists"
          @click="save"
        >
          {{ $t('Save & Apply') }}
        </tlt-button>
      </div>
    </template>
  </vuci-form>
</template>

<script>
import OverIpOptions from './OverIPOptions.vue'
import useOveripUtils from './useOveripUtils.js'

export default {
  components: { OverIpOptions },
  props: {
    section: {
      type: Object,
      required: true
    },
    serialDevices: {
      type: Array,
      required: true
    },
    serialStatus: {
      type: Array,
      required: true
    },
    firewallZones: {
      type: Array,
      required: true
    },
    certificates: {
      type: Array,
      required: true
    }
  },
  data() {
    const { afterEditLoad, validateEdit } = useOveripUtils()

    return {
      validateEdit,
      afterEditLoad,
      formData: {}
    }
  },
  computed: {
    anyDeviceExists() {
      return !!this.$serial.listDeviceNames(this.serialDevices).length
    }
  }
}
</script>
