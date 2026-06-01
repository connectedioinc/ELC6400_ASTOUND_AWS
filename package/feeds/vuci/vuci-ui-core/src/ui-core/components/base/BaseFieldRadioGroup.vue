<template>
  <FieldRoot
    v-show="props.showOnDisabled ? true : !props.disabled"
    v-model="modelValue"
    :class="['form__item', 'form__item--small', props.column ? 'form__item--column' : 'form__item--row']"
    v-bind="rootProps"
    role="radiogroup"
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
    <div class="form__item__trailing flex flex-wrap gap-4 flex-col md:flex-row md:gap-y-2">
      <FieldControl>
        <RadioGroup>
          <slot />
        </RadioGroup>
      </FieldControl>
    </div>
  </FieldRoot>
</template>

<script setup lang="ts" generic="T extends AcceptableValue = any">
import { computed, useTemplateRef } from 'vue'
import { FieldRoot, FieldLabel, FieldHelp } from '@components/field'
// intentionally imported separately, no intellisense is available if imported together with other parts
import FieldControl from '@components/field/FieldControl.vue'
import type { FieldRootProps, FieldHelpProps, FieldLabelProps, AcceptableValue } from '@components/field'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { getFieldHelpProps, getFieldLabelProps, getFieldRootProps } from './utils'
import { RadioGroup } from '../radio'

type Props = Omit<FieldRootProps<T>, 'as' | 'asChild' | 'rules'> &
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
  }
const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  showOnDisabled: false
})

if (props.label && props.srLabel) {
  throw new Error('[BaseFieldRadioGroup] Only "label" or "srLabel" can be provided at a time')
}

const modelValue = defineModel<any>()

const labelRef = useTemplateRef('labelRef')

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

const rootProps = computed(() => getFieldRootProps(props))
const labelProps = computed(() => getFieldLabelProps(props))
const helpProps = computed(() => getFieldHelpProps(props))
</script>
