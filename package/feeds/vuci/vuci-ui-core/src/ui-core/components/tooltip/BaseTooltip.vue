<template>
  <div
    role="tooltip"
    class="font-semibold md:w-max max-md:max-w-[280px] max-w-[90vw] block text-body-secondary bg-theme-bg-secondary-strong text-white rounded-md px-2 py-1 break-all"
  >
    <slot>
      {{ props.content }}
    </slot>
  </div>
</template>

<script setup lang="ts">
export type Props = {
  content?: string
}
const props = withDefaults(defineProps<Props>(), {
  content: '',
  arrow: false
})
</script>
