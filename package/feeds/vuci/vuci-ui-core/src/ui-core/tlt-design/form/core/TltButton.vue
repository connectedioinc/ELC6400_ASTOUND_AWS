<template>
  <button
    :test-id="`button-${buttonId ?? elementId}`"
    :aria-disabled="loading || disabled"
    :class="[
      {
        'disabled:bg-theme-bg-secondary-subtle gap-2': type === 'button',
        'disabled:bg-transparent': type === 'text' || color === 'tertiary',
        'gap-2': type === 'button' || ['md', 'lg'].includes(size),
        'gap-1': type === 'text' && size === 'sm',
        'w-full! justify-center flex': block,
        'w-max inline-flex align-text-bottom': !block
      },
      buttonColor,
      buttonBox
    ]"
    class="font-semibold rounded-sm aria-disabled:cursor-default transition-colors disabled:text-theme-text-subtle/50 items-center font-sans shrink-0 h-max focus-visible:outline-2 focus-visible:outline-theme-border-primary outline-offset-2"
    :type="buttonType"
    :disabled="isReadonly"
    @click="onClick"
  >
    <tlt-icon
      v-if="iconLeft"
      :icon="iconLeft"
      :class="iconClass"
      class="text-inherit"
    />
    <slot v-if="!loading || type !== 'icon'">
      <tlt-icon
        v-if="icon"
        :class="iconClass"
        :icon="icon"
      />
    </slot>
    <tlt-icon
      v-if="iconRight && !loading"
      :icon="iconRight"
      :class="iconClass"
      class="text-inherit"
    />
    <tlt-icon
      v-if="loading"
      icon="spinner"
      :class="iconClass"
      class="text-inherit"
      animate
    />
  </button>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useMainStore } from '@/stores/main'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import { useCommonInjects } from './_shared/useCommonInjects'

export type ButtonType = 'button' | 'text' | 'icon'
export type Color = 'primary' | 'secondary' | 'tertiary' | 'error' | 'warning' | 'success'
export type Size = 'sm' | 'md' | 'lg'

export interface Props {
  block?: boolean
  loading?: boolean
  iconLeft?: Icon
  iconRight?: Icon
  icon?: Icon
  disabled?: boolean
  readonly?: boolean
  size?: Size
  color?: Color
  type?: ButtonType
  buttonId?: string
  buttonType?: 'reset' | 'submit' | 'button' | undefined
}

const props = withDefaults(defineProps<Props>(), {
  block: false,
  loading: false,
  readonly: undefined,
  type: 'button',
  size: 'sm',
  color: 'primary',
  buttonType: 'button',
  icon: undefined,
  iconLeft: undefined,
  iconRight: undefined,
  buttonId: undefined,
  disabled: undefined
})
const emit = defineEmits<{
  click: [MouseEvent]
}>()

const { elementId } = useCommonInjects()

const store = useMainStore()

onMounted(() => {
  if (props.readonly !== undefined && props.disabled !== undefined) {
    console.warn('Disabled and readonly props should not be used together. Disabled prop overrides readonly.')
  }
})

const isReadonly = computed(() => {
  return props.disabled ?? (store.readOnlyPage || props.readonly)
})
const buttonBox = computed(() => {
  const textSizes = {
    sm: 'text-body-caption',
    lg: 'text-body-main',
    md: 'text-body-secondary'
  }
  if (props.type === 'text') return props.size === 'sm' ? textSizes.md : textSizes[props.size] // textbuttons does not have sm size
  if (props.type === 'icon') {
    const sizes = {
      sm: 'p-1',
      md: 'p-2',
      lg: 'p-4'
    }
    return `${sizes[props.size]} ${textSizes[props.size]}`
  }
  const sizes = {
    sm: 'py-1.5 text-body-secondary',
    md: 'py-2.5 text-body-secondary',
    lg: 'py-4 text-body-main'
  }
  return sizes[props.size] + ' px-4'
})
const buttonColor = computed(() => {
  if (['button', 'icon'].includes(props.type)) {
    const colors = {
      primary: ['text-theme-text-on-primary', props.loading ? 'bg-theme-bg-primary-1/80' : 'bg-theme-bg-primary-1', 'hover:bg-theme-bg-primary-hover active:bg-theme-bg-primary-active'],
      secondary: [
        'text-theme-text-primary',
        props.loading ? 'bg-theme-bg-primary-subtle/80' : 'bg-theme-bg-primary-subtle',
        'hover:bg-theme-bg-primary-subtle-hover active:bg-theme-bg-primary-subtle-active'
      ],
      tertiary: ['text-theme-text-primary', 'bg-transparent', 'hover:bg-theme-bg-hover active:bg-theme-bg-active'],
      error: ['text-theme-text-on-danger', props.loading ? 'bg-theme-bg-danger/80' : 'bg-theme-bg-danger', 'hover:bg-theme-bg-danger-hover active:bg-theme-bg-danger-active'],
      warning: ['text-theme-text-on-warning', props.loading ? 'bg-theme-bg-warning/80' : 'bg-theme-bg-warning', 'hover:bg-theme-bg-warning-hover active:bg-theme-bg-warning-active'],
      success: ['text-theme-text-on-success', props.loading ? 'bg-theme-bg-success/80' : 'bg-theme-bg-success', 'hover:bg-theme-bg-success-hover active:bg-theme-bg-success-active ']
    }
    const __color = props.loading ? colors[props.color].slice(0, 2) : colors[props.color]
    return __color.join(' ')
  }
  const colors = {
    primary: 'text-theme-text-primary hover:text-theme-text-primary-hover',
    secondary: 'text-theme-text-secondary-subtle hover:text-theme-text-secondary-hover',
    error: 'text-theme-text-danger hover:text-theme-text-danger-hover',
    warning: 'text-theme-text-warning hover:text-theme-text-warning-hover',
    success: 'text-theme-text-success hover:text-theme-text-success-hover'
  }
  return colors[props.color as keyof typeof colors]
})
const iconClass = computed(() => {
  const sizes = {
    lg: 'size-6',
    md: 'size-5',
    sm: props.type === 'text' ? 'size-5' : 'size-4'
  }
  return props.type === 'button' ? sizes.md : sizes[props.size]
})

function onClick(event: MouseEvent) {
  if (isReadonly.value || props.loading) return

  emit('click', event)
}

defineExpose({
  onClick
})
</script>
