<template>
  <ConditionalWrapper
    :tag="hints ? TltHint : undefined"
    :hints="hints"
    :show-icon="false"
  >
    <TltButton
      ref="button"
      :button-id="`action-${id}`"
      class="max-lg:rounded-full max-lg:bg-theme-bg-secondary-subtle max-lg:hover:bg-theme-bg-secondary-subtle-hover max-lg:p-1.5! max-lg:max-h-8 relative justify-center items-center px-0!"
      :class="label || $slots.label || $slots.default ? 'gap-1!' : 'gap-0!'"
      :icon="icon"
      :icon-left="iconLeft || icon"
      :icon-right="iconRight"
      type="text"
      v-bind="{ ...$attrs, ...buttonProps }"
      @click="onClick"
    >
      <span
        v-if="$slots.default || $slots.label || label"
        class="flex items-center gap-2 max-lg:sr-only"
      >
        <slot :open>
          <slot name="label">
            <template v-if="label">{{ label }}</template>
          </slot>
          <TltIcon
            v-if="dropdownOptions"
            icon="chevron"
            class="size-4 max-lg:hidden"
            :class="open ? '-rotate-90' : 'rotate-90'"
          />
        </slot>
      </span>
      <TltIcon
        v-if="dropdownOptions"
        icon="more"
        class="size-5 lg:hidden"
      />
      <div
        v-if="bubble"
        class="absolute size-2 bg-theme-bg-info rounded-full top-0.5 right-0 lg:hidden"
      />
    </TltButton>
  </ConditionalWrapper>
  <TltDropdown
    v-if="_dropdownOptions"
    v-model:open="open"
    :target="() => button?.$el"
    :options="_dropdownOptions"
    :title="label"
    close-on-click
    size="big"
    border
    @outside-click="open = false"
    @option-click="executeCallback($event.callback)"
  />
</template>

<script setup lang="ts" generic="T extends AcceptableValue">
import { ref, computed, useTemplateRef } from 'vue'
import { usePrompt, type PromptOptions } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { isFunction } from '@ui-core/utils/inspect'
import { useTableRootContext, type TableRootContext } from './useTableRootContext'
import type { AcceptableValue, Action } from './types'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'

export interface Props<T extends AcceptableValue> extends Action<T[keyof T][]> {
  icon?: Icon
  iconLeft?: Icon
  iconRight?: Icon
  bubble?: boolean
  showPrompt?: boolean | 'mobile' | 'desktop'
}

const props = withDefaults(defineProps<Props<T>>(), {
  icon: undefined,
  iconLeft: undefined,
  iconRight: undefined,
  showPrompt: false,
  buttonProps: () => ({})
})

const emit = defineEmits<{
  click: [T[keyof T][]]
}>()

defineOptions({
  inheritAttrs: false
})

const { isMobile, selectedValues } = useTableRootContext<TableRootContext<T>>()

const $t = useTranslate()
const prompt = usePrompt()

const open = ref(false)

function promptOptionsFactory(callback: () => void): PromptOptions {
  const defaultOptions = {
    title: $t('%s (%s) selected?').format(props.label, selectedValues.value.length),
    content: $t('This process cannot be undone.'),
    okText: $t('Confirm'),
    cancelText: $t('Cancel'),
    onOk: callback
  }
  if (!props.prompt) return defaultOptions

  const options = isFunction(props.prompt) ? props.prompt(selectedValues.value) : props.prompt
  if (options.onOk) {
    const onOk = options.onOk
    options.onOk = () => {
      onOk()
      callback()
    }
  }

  return {
    ...defaultOptions,
    ...options
  }
}

async function executeCallback(callback = props.callback) {
  if (callback) await callback(selectedValues.value)

  emit('click', selectedValues.value)
}

function onClick() {
  if (props.dropdownOptions) return (open.value = !open.value)

  if (props.showPrompt === true || (props.showPrompt === 'mobile' && isMobile.value) || (props.showPrompt === 'desktop' && !isMobile.value)) {
    prompt.show(promptOptionsFactory(executeCallback))
  } else executeCallback()
}

const button = useTemplateRef('button')

const _dropdownOptions = computed(() =>
  props.dropdownOptions?.map(action => {
    return {
      class: 'text-theme-text-primary',
      ...action
    }
  })
)

defineExpose({
  button
})
</script>
