<template>
  <ConditionalWrapper
    :tag="hints ? TltHint : undefined"
    :hints="hints"
  >
    <TltButton
      ref="button"
      :button-id="id"
      class="px-0!"
      :icon-left="_icon"
      color="tertiary"
      v-bind="{ ...$attrs, ...(buttonProps || {}) }"
      @click="onClick"
    >
      <span class="flex items-center gap-2">
        <slot>
          <template v-if="label">{{ label }}</template>
        </slot>
      </span>
    </TltButton>
  </ConditionalWrapper>
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { computed, onMounted, onUnmounted, useTemplateRef } from 'vue'
import { useTableRowContext, type TableRowContext } from './useTableRowContext'
import type { AcceptableValue, Action } from './types'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import { useTableRowActionsContext } from './useTableRowActionsContext'
import TltHint from '@ui-core/tlt-design/widgets/TltHint.vue'

export interface Props<T extends AcceptableValue> extends Omit<Action<T>, 'options' | 'dropdownOptions' | 'prompt'> {
  icon?: Icon
}

const props = withDefaults(defineProps<Props<T>>(), {
  icon: undefined
})

const emit = defineEmits<{
  click: [T]
}>()

defineOptions({
  inheritAttrs: false
})

const button = useTemplateRef('button')

const { row } = useTableRowContext<TableRowContext<T>>()
const { registerAction, unregisterAction } = useTableRowActionsContext()

onMounted(() => {
  registerAction(props.id, () => button.value?.onClick(new MouseEvent('click')))
})

onUnmounted(() => {
  unregisterAction(props.id)
})

const _icon = computed(() => props.icon || props.buttonProps?.icon || props.buttonProps?.iconLeft || props.buttonProps?.iconRight)

async function onClick() {
  if (props.callback) await props.callback(row.value)

  emit('click', row.value)
}
</script>
