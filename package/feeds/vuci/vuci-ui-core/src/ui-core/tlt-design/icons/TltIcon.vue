<template>
  <component
    :is="componentProps.is"
    v-bind="componentProps"
  />
</template>

<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import type { Icon } from './icon-types'

export type Props = {
  icon: Icon
}

const props = defineProps<Props>()

const isPredefinedIcon = computed(() => {
  const componentName = toPascalCase(`icon-${props.icon}`)
  const instance = getCurrentInstance()
  return instance && !!instance.appContext.components[componentName]
})

const componentProps = computed(() => {
  return isPredefinedIcon.value
    ? {
        is: `icon-${props.icon}`,
        'aria-label': `icon ${props.icon}`
      }
    : {
        is: 'img',
        src: `/icons/${props.icon}`,
        alt: props.icon
      }
})

function toPascalCase(input: string) {
  const capitalize = (word: string) => word[0].toUpperCase() + word.slice(1)
  return input.split('-').map(capitalize).join('')
}
</script>
