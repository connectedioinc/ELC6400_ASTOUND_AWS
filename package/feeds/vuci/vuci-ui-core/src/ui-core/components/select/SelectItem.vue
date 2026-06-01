<template>
  <SelectListboxItem
    :id="id"
    ref="option"
    role="option"
    :aria-selected="props.disabled ? undefined : isSelected"
    :aria-disabled="dataAttribute(props.disabled)"
    :data-disabled="dataAttribute(props.disabled)"
    :data-highlighted="dataAttribute(isHighlighted)"
    :data-selected="dataAttribute(isSelected)"
    @click="handleValueSelect"
    @keydown.enter.space.prevent="handleValueSelect"
    @mousemove.self="updateActiveDescendant"
  >
    <slot
      :selected="isSelected"
      :highlighted="isHighlighted"
    >
      {{ props.textContent }}
    </slot>
  </SelectListboxItem>
</template>

<script setup lang="ts" generic="T">
import { type SelectOption } from './use-select'
import { injectSelectContext } from './use-select-context'
import { computed, useId, useTemplateRef, watchEffect } from 'vue'
import { dataAttribute } from '@ui-core/utils/attributes'
import SelectListboxItem from './SelectListboxItem.vue'

type Props<T = any> = SelectOption<T>

const props = defineProps<Props<T>>()
const rootCtx = injectSelectContext()
const element = useTemplateRef('option')
const id = useId()
const { activeDescendant, registerOption, multiple } = rootCtx

const isSelected = computed(() => rootCtx.isSelected(props.value))
const isHighlighted = computed(() => activeDescendant.value && activeDescendant.value.id === id)

watchEffect(cleanup => {
  if (element.value) {
    const el = element.value.$el as HTMLElement
    const remove = registerOption(el, props)
    cleanup(remove)
  }
})

function updateActiveDescendant(e: MouseEvent) {
  if (e.target instanceof HTMLElement) {
    rootCtx.activeDescendant.value = e.target
  }
}

function handleValueSelect() {
  if (props.disabled || rootCtx.disabled.value || rootCtx.readonly.value) return

  rootCtx.onValueChange(props.value)

  if (!multiple.value) {
    rootCtx.close()
    rootCtx.focusTrigger()
  }
}
</script>

<style lang="" scoped></style>
