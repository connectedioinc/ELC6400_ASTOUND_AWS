<template>
  <tlt-content-box
    v-model:open="open"
    :placement="placement"
    class="py-1"
    @click.stop
  >
    <span
      v-if="title"
      class="px-4 pt-3 pb-2 font-bold"
    >
      {{ title }}
    </span>
    <tlt-option-group
      v-slot="{ option }"
      :options="options"
      class="px-1"
      :class="{ '*:border-b *:border-b-theme-border-base *:last:border-b-0': border }"
    >
      <ConditionalWrapper
        :tag="option.hints ? TltHint : undefined"
        :hints="option.hints"
        expand-to="left"
        class="w-full"
      >
        <button
          ref="button"
          type="button"
          class="px-4 py-2 w-full rounded-lg flex flex-row items-center justify-between gap-2"
          :class="[option.class, OptionClasses(option), { 'cursor-default text-theme-text-secondary-subtle/50': option.disabled }]"
          :test-id="`option-${option.id || option.label}`"
          @click="onClick(option)"
        >
          <slot
            :name="option.slotName"
            :option="option"
          >
            <div class="flex items-center gap-2">
              <tlt-icon
                v-if="option.icon"
                :icon="option.icon"
                class="size-5"
              />
              <span class="wrap-anywhere break-normal">
                {{ option.label }}
              </span>
            </div>
            <tlt-icon
              v-if="option.options"
              icon="chevron"
              class="size-5 -rotate-90"
            />
          </slot>
        </button>
      </ConditionalWrapper>
      <tlt-dropdown
        v-if="option.options"
        v-bind="getProperties(option)"
        :target="() => $refs.button"
        placement="right-start"
        :distance="8"
        :size="$attrs.size"
        :open="expanded === option.label && open"
        @update:open="expanded = null"
      />
    </tlt-option-group>
  </tlt-content-box>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { type Hint } from '@ui-core/tlt-design/widgets/TltHint.vue'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import { type Props as ContentBoxProps } from './TltContentBox.vue'

export interface DropdownOption<T = any> {
  label: string
  icon?: Icon
  /**
   * Custom test-id suffix. Label will be used if none provided.
   */
  id?: string
  slotName?: string
  active?: boolean | (() => boolean)
  disabled?: boolean
  options?: DropdownOption[]
  placement?: ContentBoxProps['placement']
  class?: string | Record<string, boolean>
  variant?: 'info' | 'success' | 'error' | 'warning'
  hints?: Hint | Hint[]
  callback?: (items: T) => any | Promise<any>
}

export interface Props {
  onOptionClick?: (option: DropdownOption) => void
  placement?: ContentBoxProps['placement']
  options: (DropdownOption | DropdownOption[])[]
  closeOnClick?: boolean
  title?: string
  border?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom-end',
  closeOnClick: true,
  onOptionClick: () => {},
  title: undefined
})

const emit = defineEmits<{
  'outside-click': []
  'option-click': [DropdownOption]
}>()

const open = defineModel<boolean>('open', { required: true })

const expanded = ref<string | null>(null)
watch(open, val => {
  if (!val) expanded.value = null
})

function isOptionActive(option: DropdownOption) {
  if (option.options) return expanded.value === option.label
  if (!option.active) return false
  return typeof option.active === 'boolean' ? option.active : option.active()
}

function handleActionClick(option: DropdownOption) {
  if (option.disabled) return
  if (props.onOptionClick) props.onOptionClick(option)
  else emit('option-click', option)
  if (props.closeOnClick) emit('outside-click')
}

function getProperties(option: DropdownOption) {
  // options of original property 'options' gets overriden
  const passableProps = Object.assign({}, props, {
    options: option.options,
    onOptionClick: handleActionClick,
    title: props.title ? option.label : undefined
  })
  return passableProps
}

function onClick(option: DropdownOption) {
  if (option.disabled) return
  if (option.options) expanded.value = expanded.value === option.label ? null : option.label
  else handleActionClick(option)
}

function OptionClasses(option: DropdownOption) {
  switch (option.variant) {
    case 'info':
      return {
        'text-theme-text-primary hover:bg-theme-bg-hover': !option.disabled,
        'bg-theme-bg-hover font-semibold': isOptionActive(option)
      }
    case 'success':
      return {
        'text-theme-text-success hover:bg-theme-bg-success-subtle': !option.disabled,
        'bg-theme-bg-success-subtle font-semibold': isOptionActive(option)
      }
    case 'error':
      return {
        'text-theme-text-danger hover:bg-theme-bg-danger-subtle': !option.disabled,
        'bg-theme-bg-danger-subtle font-semibold': isOptionActive(option)
      }
    case 'warning':
      return {
        'text-theme-text-warning hover:bg-theme-bg-warning-subtle': !option.disabled,
        'bg-theme-bg-warning-subtle font-semibold': isOptionActive(option)
      }
    default:
      return {
        'hover:bg-theme-bg-hover': !option.disabled,
        'bg-theme-bg-hover font-semibold': isOptionActive(option)
      }
  }
}
</script>
