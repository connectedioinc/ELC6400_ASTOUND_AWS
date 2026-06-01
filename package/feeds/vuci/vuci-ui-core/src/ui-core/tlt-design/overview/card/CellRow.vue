<template>
  <div
    class="flex flex-col xs:flex-row max-w-full gap-x-1 min-w-0 xs:flex-wrap xs:items-center"
    :test-id="label"
  >
    <strong
      class="font-semibold text-theme-text-secondary sm:whitespace-normal"
      :class="onlyMobileLabel && 'lg:hidden'"
    >
      <slot name="label">{{ label }}:</slot>
    </strong>
    <component
      :is="truncate ? 'tlt-overflow-hint' : 'div'"
      class="text-theme-text-secondary-subtle xs:ml-auto lg:ml-0 flex-wrap max-w-full"
      :class="[onlyMobileLabel && 'lg:font-semibold lg:text-theme-text-secondary', valueClass]"
    >
      <slot name="value">
        {{ value }}
      </slot>
    </component>
  </div>
</template>

<script setup lang="ts">
export type Props = {
  onlyMobileLabel?: boolean
  label?: string
  value?: any
  truncate?: boolean
  valueClass?: string
}
withDefaults(defineProps<Props>(), {
  onlyMobileLabel: false,
  label: '',
  value: '-',
  truncate: true,
  valueClass: ''
})
</script>
