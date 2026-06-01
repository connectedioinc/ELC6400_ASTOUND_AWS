<template>
  <div>
    <div
      ref="container"
      class="flex mb-1.5 gap-1"
    >
      <component
        :is="hasClickEventListener ? 'button' : 'div'"
        v-for="(entry, _index) in vData"
        :key="_index"
        class="transition-colors py-2 graph-item"
        :style="{ width: entry.width }"
        @click="$emit('click', entry.key)"
      >
        <div
          class="h-2.5"
          :class="entry.disabled ? 'bg-theme-bg-secondary-subtle' : entry.color"
        />
      </component>
    </div>
    <ul class="flex flex-wrap">
      <li
        v-for="(entry, _index) in vData"
        :key="_index"
        class="mr-10 last:mr-0"
        @click="emit('click', entry.key)"
      >
        <component
          :is="hasClickEventListener ? 'button' : 'div'"
          class="flex items-center"
        >
          <div
            class="rounded-xs size-4 mr-2"
            :class="entry.disabled ? 'bg-theme-bg-secondary-subtle' : entry.color"
          />
          {{ entry.name }}
          <span class="text-theme-text-subtle mx-1">{{ entry.count }}</span>
        </component>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
type DistributionCount = { [valueName: string]: { count: number; name?: string } }
type Values = {
  all: Record<string, DistributionCount>
  shown: Record<string, DistributionCount>
}
type Props = {
  values: Values
  /**
   * Object property name.
   */
  index: string
  /**
   * where property key is value of entry like 'Available', and value is number index of defined 8 color array OR available color string.
   * ```js
   * const colorMap = {
   *  Available: 'bg-theme-bg-info-subtle',
   *  Installed: 'bg-theme-bg-success',
   *  Error: 'bg-theme-bg-danger',
   * }
   * ```
   */
  colorMap?: Record<string, (typeof colors)[number] | (string & {})>
  // (typeof colors)[number] | (string & {}) gives correct autocomplete on defined colors and allows any string to be passed.
}
const emit = defineEmits<{ click: [key: string] }>()
const props = defineProps<Props>()
const colors = [
  'bg-theme-bg-info',
  'bg-theme-bg-warning-subtle',
  'bg-theme-bg-success',
  'bg-yellow-300',
  'bg-purple-300',
  'bg-theme-bg-warning',
  'bg-theme-bg-danger',
  'bg-theme-bg-success-subtle'
] as const

const getColor = initColorGetter(props.colorMap)
const vData = computed(() => {
  const all: DistributionCount = props.values.all[props.index] || {}
  const shown: DistributionCount = props.values.shown[props.index] || {}
  const total = all
    ? Object.values(all).reduce<number>((sum, v) => {
        sum += v.count
        return sum
      }, 0)
    : 0
  const dataArray = Object.entries(all).map(([key, val]) => ({
    disabled: !shown[key] || shown[key].count === 0,
    key,
    name: val.name || key,
    count: val.count,
    width: `${(val.count / total) * 100}%`,
    color: getColor(key)
  }))
  return dataArray
})

function initColorGetter(initialMap: Props['colorMap'] = {}) {
  const cache: Record<string, number> = {}
  let nextIndex = 0
  return (key: string) => {
    if (initialMap[key]) return initialMap[key]
    if (!(key in cache)) {
      cache[key] = nextIndex % colors.length
      nextIndex++
    }
    return colors[cache[key]]
  }
}

const hasClickEventListener = computed(() => !!getCurrentInstance()?.vnode.props?.onClick)
</script>

<style scoped>
.graph-item {
  &:first-child > * {
    border-top-left-radius: 0.5rem;
    border-bottom-left-radius: 0.5rem;
  }
  &:last-child > * {
    border-top-right-radius: 0.5rem;
    border-bottom-right-radius: 0.5rem;
  }
}
</style>
