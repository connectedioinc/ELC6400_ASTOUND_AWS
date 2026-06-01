<template>
  <vuci-form-item-zone-select
    :uci-section="uciSection"
    :label="$t('Create / Assign firewall-zone')"
    name="fwzone"
    :options="zoneOptions"
    allow-create
    :help="
      $t(
        'Choose the firewall zone you want to assign to this interface. \
      Select \'Unspecified\' to remove the interface from the associated zone or \
      define a new zone and attach the interface to it.'
      )
    "
    rules="uciname"
    maxlength="11"
    :zones="zones"
  />
  <!-- Commented because of #3774 issue. Uncomment for #3909 issue -->
  <!--
    @vue:destroyed="teardownZone"
  -->
</template>
<script>
/** @typedef {import('@/types/firewallTypes').Zone} Zone */

export default {
  name: 'Zone',
  inject: ['initialForm'],
  props: {
    uciSection: {
      type: Object,
      default: () => ({})
    },
    protocol: {
      type: String,
      default: ''
    },
    zones: {
      /** @type {import('vue').PropType<Zone[]>} */
      type: Array,
      default: () => []
    }
  },
  emits: ['updateZone'],
  data() {
    return {}
  },
  computed: {
    /** @returns {boolean | undefined} */
    isInitial() {
      if (this.initialForm().length === 0) return
      const filteredSection = this.initialForm().interfaces.filter(section => section.id === this.uciSection.id)
      return !filteredSection[0].fwzone
    },
    /** @returns {Array<[string, string] | string>} */
    zoneOptions() {
      return [['', this.$t('Unspecified')], ...this.zones.map(s => s.name)]
    }
  },
  watch: {
    protocol() {
      this.setupZone()
    }
  },
  methods: {
    // Remove for #3909 issue
    setupZone() {
      if (!this.isInitial && this.uciSection.protocol !== 'none') return
      if (this.protocol && this.protocol === 'static' && this.zoneOptions.includes('lan')) {
        this.$emit('updateZone', 'lan')
      } else if (this.zoneOptions.includes('wan')) {
        this.$emit('updateZone', 'wan')
      } else {
        this.$emit('updateZone', '')
      }
    }

    // Commented because of #3774 issue. Uncomment for #3909 issue

    // setupZone () {
    //   this.$refs.zone.vuciSection.$on('change-proto', this.setZoneByProto)
    //   this.$refs.zone.vuciSection.$on('change-ifname', this.setZoneByIfname)
    // },

    // setZoneByProto (proto) {
    //   if (proto.model === 'static' || proto.model === 'none') {
    //     const fwzone = this.$firewall.findZoneByName('lan')
    //     if (fwzone) this.$refs.zone.model = 'lan'
    //   } else {
    //     const fwzone = this.$firewall.findZoneByName('wan')
    //     if (fwzone) this.$refs.zone.model = 'wan'
    //   }
    // },

    // setZoneByIfname (ifname, newVal, oldVal) {
    //   if ((newVal == null || newVal === '') && ((oldVal == null || oldVal === ''))) return
    //   const device = this.uciSection.ifname
    //   let value = ifname.model
    //   if (device?.type && (device.type === '8021q' || device.type === '8021ad')) {
    //     value = device.parent
    //   }
    //   if ((value.includes(this.$store.board.network.lan.device) || value.includes('rndis0'))) {
    //     const zone = this.$firewall.findZoneByName('lan')
    //     if (zone) this.$refs.zone.model = 'lan'
    //     return
    //   } else if (value.includes('br-') || (Array.isArray(value) && value.find(v => v.startsWith('br-')))) {
    //     const zone = this.$firewall.findZoneByName('lan')
    //     let values
    //     if (Array.isArray(value)) {
    //       values = value
    //     } else {
    //       values = [value]
    //     }
    //     for (const iface of values) {
    //       if (!iface.startsWith('br-')) continue
    //       const sid = iface.replace('br-', '')
    //       if ((brIfname?.includes(this.$store.board.network.lan.device) || brIfname?.includes('rndis0')) && zone) {
    //         this.$refs.zone.model = 'lan'
    //         return
    //       }
    //     }
    //   }
    //   const zone = this.$firewall.findZoneByName('wan')
    //   if (zone) this.$refs.zone.model = 'wan'
    // },

    // teardownZone () {
    //   this.$refs.zone.vuciSection.$off('change-ifname', this.setZoneByIfname)
    //   this.$refs.zone.vuciSection.$off('change-proto', this.setZoneByProto)
    // }
  }
}
</script>
