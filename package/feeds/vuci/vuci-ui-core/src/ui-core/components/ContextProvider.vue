<template>
  <slot />
</template>

<script setup lang="ts">
import { toCamelCase } from '@ui-core/plugins/helper'
import { provide, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
for (const [key, value] of Object.entries(attrs)) {
  provide(toCamelCase(key), value)
}
</script>
