<template>
  <FieldRoot
    v-show="props.showOnDisabled ? true : !props.disabled"
    v-model="modelValue"
    :class="['form__item', props.smallControl && 'form__item--small', props.column ? 'form__item--column' : 'form__item--row']"
    v-bind="rootProps"
  >
    <div
      v-if="props.label"
      class="form__item__leading"
    >
      <FieldLabel
        ref="labelRef"
        class="form__item__label"
        v-bind="labelProps"
      >
        <slot name="label">
          {{ props.label }}
        </slot>
      </FieldLabel>
      <FieldHelp
        v-if="props.help || $slots.help"
        v-bind="helpProps"
        :target="isMobile ? undefined : labelRef?.$el"
      >
        <slot name="help">
          {{ props.help }}
        </slot>
      </FieldHelp>
    </div>
    <div class="form__item__trailing flex gap-1">
      <FieldControl
        ref="controlRef"
        :class="[props.dontControlWidth ? '' : 'grow max-w-xs']"
      >
        <slot />
      </FieldControl>
      <FieldMeta :target="controlEl" />
    </div>
  </FieldRoot>
</template>

<script setup lang="ts" generic="T extends AcceptableValue = any">
import { computed, useTemplateRef } from 'vue'
import { FieldRoot, FieldLabel, FieldHelp, FieldMeta } from '@components/field'
// intentionally imported separately, no intellisense is available if imported together with other parts
import FieldControl from '@components/field/FieldControl.vue'
import type { FieldRootProps, FieldHelpProps, FieldLabelProps, AcceptableValue } from '@components/field'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { getFieldHelpProps, getFieldLabelProps, getFieldRootProps } from './utils'

type Props = Omit<FieldRootProps<T>, 'as' | 'asChild'> &
  FieldHelpProps &
  FieldLabelProps & {
    /**
     * whether the field is in column layout (label stacked on top of control, rather than in row)
     * @default false
     */
    column?: boolean
    /**
     * label to be shown
     */
    label?: string
    /**
     * whether the field should be hidden when disabled
     */
    showOnDisabled?: boolean
    smallControl?: boolean
    /**
     * when true, controls width will not be constrained to max-width of 320px (vuci specific)
     */
    dontControlWidth?: boolean
  }
const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  showOnDisabled: false
})

if (props.label && props.srLabel) {
  throw new Error('[BaseField] Only "label" or "srLabel" can be provided at a time')
}

const modelValue = defineModel<any>()

const labelRef = useTemplateRef('labelRef')
const controlRef = useTemplateRef('controlRef')

const controlEl = computed<HTMLElement | undefined>(() => controlRef.value?.$el)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

const rootProps = computed(() => getFieldRootProps(props))
const labelProps = computed(() => getFieldLabelProps(props))
const helpProps = computed(() => getFieldHelpProps(props))
</script>
