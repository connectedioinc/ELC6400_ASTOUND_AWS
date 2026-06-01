<template>
  <ToggleButton
    v-if="!props.target"
    ref="target"
    v-model="showHelp"
    class="text-theme-bg-secondary-1 focus:text-theme-bg-secondary-active focus-visible:focus-token rounded-full size-4 inline-block"
    @mouseenter="interacted = true"
    @focus="interacted = true"
  >
    <TltIcon
      icon="tooltip"
      class="size-4"
    />
  </ToggleButton>
  <TltPopover
    :target="props.target || targetEl?.$el"
    :force-show="showHelp"
    placement="bottom-end"
    fallback-placements="bottom-start"
    :title="label"
    :triggers="props.target ? undefined : []"
    v-bind="attrs.helpProps.value"
  >
    <slot>
      {{ props.help }}
    </slot>
  </TltPopover>
</template>

<script setup lang="ts">
import { useTemplateRef, ref } from 'vue'
import ToggleButton from '@components/ToggleButton.vue'
import { injectFieldMetaContext } from './use-field-context'
import TltPopover from '../tooltip/TltPopover.vue'
import { watch } from 'vue'

export type Props = {
  target?: HTMLElement
  help?: string
}
const props = defineProps<Props>()
const targetEl = useTemplateRef('target')

const { attrs, label } = injectFieldMetaContext()

watch(
  () => props.target,
  () => {
    showHelp.value = false
    if (targetEl.value) targetEl.value.$el.blur()
  }
)

/*
 * flag to move popover mount only when user interacts with the widget (for performance only).
 */
const interacted = ref(false)
const showHelp = ref(false)
</script>

<style lang="" scoped></style>
