<template>
  <tlt-multi-select
    v-if="multiple"
    :placeholder="placeholder"
    custom
    :model-value="multiValue"
    :allow-create="allowCreate"
    :data-source="convertedDataSource"
    fade-overflow
    :virtualized="false"
    @update:model-value="saveValue"
  >
    <template #option="{ option }">
      <zone-badge
        :key="option.key"
        class="wrap-zones"
        :name="option.value"
        :zone-networks="option.network"
        display-net
      />
    </template>
  </tlt-multi-select>
  <tlt-select
    v-else
    :placeholder="placeholder"
    :model-value="modelValue"
    :allow-create="allowCreate"
    :data-source="convertedDataSource"
    custom
    fade-overflow
    :virtualized="false"
    @update:model-value="saveValue"
  >
    <template #selectedOption="{ selected }">
      <zone-badge
        v-if="selected.network"
        :key="selected.key"
        :name="selected.value"
        display-net
        :zone-networks="selected.network"
      />
      <template v-else>
        {{ selected.value }}
      </template>
    </template>
    <template #option="{ option }">
      <div
        v-if="option.network"
        class="wrap-zones"
      >
        <zone-badge
          :key="option.key"
          :name="option.value"
          :zone-networks="option.network"
          display-net
        />
      </div>
      <template v-else>
        {{ option.value }}
      </template>
    </template>
  </tlt-select>
</template>
<script>
/** @typedef {import('@/types/firewallTypes').Zone} Zone */
/** @typedef {{key: string, value: string, network?: string[]}} ZoneOption */

export default {
  name: 'TltZoneSelect',
  props: {
    options: {
      /** @type {import('vue').PropType<Array<[string, string] | string | ZoneOption>>} */
      type: Array,
      default: () => []
    },
    multiple: {
      type: Boolean,
      default: false
    },
    allowCreate: {
      type: Boolean,
      default: false
    },
    zones: {
      /** @type {import('vue').PropType<Zone[]>} */
      type: Array,
      default: () => []
    },
    modelValue: {
      /** @type {import('vue').PropType<string | string[]>} */
      type: [String, Array],
      default: () => []
    },
    placeholder: {
      type: String,
      default: undefined
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {}
  },
  computed: {
    /** @returns {ZoneOption[]} */
    convertedDataSource() {
      /** @type {ZoneOption[]} */
      const options = []
      this.options.forEach(o => {
        if (typeof o === 'string') {
          options.push({
            key: o,
            value: o,
            network: this.zones.find(zone => zone.name === o)?.network
          })
        } else if (Array.isArray(o)) {
          options.push({
            key: o[0],
            value: o[1],
            network: this.zones.find(zone => zone.name === o[0])?.network
          })
        } else {
          options.push(o)
        }
      })
      return options
    },
    /** @returns {string[]} */
    multiValue() {
      if (!Array.isArray(this.modelValue)) {
        return this.modelValue.split(' ')
      }
      return this.modelValue
    }
  },
  methods: {
    /** @param {string} e */
    saveValue(e) {
      this.$emit('update:modelValue', e)
    }
  }
}
</script>
<style scoped>
@reference '@/theme.css';

.wrap-zones :deep(.zone-badge-list) {
  @apply flex flex-wrap;
}
</style>
