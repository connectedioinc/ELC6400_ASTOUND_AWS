<template>
  <Component
    :is="componentTag === 'template' ? Slot : componentTag"
    v-bind="attrs"
  >
    <slot v-if="!SELF_CLOSING_TAGS.includes(componentTag as string)" />
  </Component>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { Slot } from './Slot'
import { ref, watch, useAttrs } from 'vue'

export type AsTag = 'a' | 'button' | 'div' | 'form' | 'h2' | 'h3' | 'img' | 'input' | 'label' | 'li' | 'nav' | 'ol' | 'p' | 'span' | 'svg' | 'ul' | 'template' | ({} & string) // any other string

defineOptions({
  inheritAttrs: false
})
// For self closing tags, don't provide default slots because of hydration issue
const SELF_CLOSING_TAGS = ['area', 'img', 'input']

export interface PrimitiveProps {
  /**
   * Change the default rendered element for the one passed as a child, merging their props and behavior.
   * @default false
   */
  asChild?: boolean
  /**
   * The element or component this component should render as. Can be overwritten by `asChild`.
   * @defaultValue "div"
   */
  as?: AsTag | Component
}

const props = withDefaults(defineProps<PrimitiveProps>(), {
  as: 'div'
})

const attrs = useAttrs()

const componentTag = ref(props.asChild ? 'template' : props.as)

watch(
  () => props,
  ({ as, asChild }) => {
    componentTag.value = asChild ? 'template' : as
  }
)
</script>
