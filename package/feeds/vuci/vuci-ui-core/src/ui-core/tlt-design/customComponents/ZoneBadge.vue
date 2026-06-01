<template>
  <div class="badge-wrapper flex items-center">
    <div
      v-if="!displayNet"
      ref="zoneName"
      class="border px-1 py-0.5 rounded-sm"
      :style="{ borderColor: color }"
    >
      <span ref="name">{{ name }}</span>
    </div>
    <div
      v-else
      class="flex gap-1 items-center text-theme-text-on-secondary font-semibold zone-badge-list"
    >
      <div class="zone-name text-theme-text-secondary">{{ name }}:</div>
      <div
        v-for="net in $network.getInterfaceAndVpnName(interfaceStatus, zoneNetworks, 'name')"
        :key="net"
        class="rounded-full px-1.5 py-0.5 text-body-secondary"
        :style="{ backgroundColor: color }"
      >
        {{ net }}
      </div>
    </div>
    <tlt-tooltip
      v-if="!displayNet && zoneNetworks.length > 0"
      :target="() => $refs.name"
      placement="bottom-start"
      fallback-placements="auto"
    >
      <div class="flex flex-wrap gap-1">
        <span
          v-for="(networkItem, index) in $network.getInterfaceAndVpnName(interfaceStatus, zoneNetworks, 'name')"
          :key="index"
          class="px-1 py-0.5 rounded-sm bg-theme-bg-secondary-2"
          >{{ networkItem }}</span
        >
      </div>
    </tlt-tooltip>
  </div>
</template>

<script>
import { network } from '@/plugins/network'
export default {
  inject: { interfaceStatus: { from: network.statusContext.contextId, default: () => [] } },
  props: {
    name: {
      type: String,
      required: true
    },
    displayNet: {
      type: Boolean,
      default: false
    },
    zoneNetworks: {
      /** @type {import('vue').PropType<string[]>} */
      type: Array,
      default: () => []
    }
  },
  data() {
    return {}
  },
  computed: {
    /** @returns {string} */
    color() {
      const definedNames = this.$network.zoneNames()
      const namesUsedInBadges = Object.values(definedNames.actions).concat(Object.values(definedNames.other))
      if (namesUsedInBadges.includes(this.name)) return '#aaaaaa'
      return this.$utils.getNameColor(this.name)
    }
  },
  methods: {}
}
</script>

<style scoped>
.zone-badge {
  border: 1px solid;
  border-radius: 0.25rem;
  padding: 5px;
  &.small {
    padding: 3px;
    & > span {
      display: inline-block;
      min-width: 20px;
      text-align: center;
    }
  }
  width: max-content;
  .network-item {
    border: 1px solid var(--color-theme-border-base);
    padding: 3px;
    border-radius: 0.25rem;
  }
}

.zone-badge-list {
  .zone-networks {
    border: 1px solid;
    border-radius: 0.25rem;
    padding: 1px;
    margin-left: 2px;
    display: inline-block;
    width: max-content;
  }
}
</style>
