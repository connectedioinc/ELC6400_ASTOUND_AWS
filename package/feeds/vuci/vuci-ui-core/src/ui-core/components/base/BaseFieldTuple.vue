<template>
  <FieldArray
    class="form__item form__item--array"
    :class="[props.column ? 'form__item--column' : 'form__item--row']"
    v-bind="fieldArrayProps"
  >
    <div class="form__item__leading">
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
        v-bind="helpProps"
        :target="isMobile ? undefined : labelRef?.$el"
      >
        <slot name="help">
          {{ props.help }}
        </slot>
      </FieldHelp>
    </div>
    <div class="form__item__trailing">
      <slot />
    </div>
  </FieldArray>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { FieldArray, FieldHelp, FieldLabel } from '../field'
import type { FieldArrayProps, FieldHelpProps, FieldLabelProps } from '../field'
import { getFieldArrayProps, getFieldHelpProps, getFieldLabelProps } from './utils'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

type Props = Omit<FieldArrayProps, 'as' | 'asChild'> &
  FieldHelpProps &
  FieldLabelProps & {
    /**
     * whether the field is in column layout (label stacked on top of control, rather than in row)
     * @default false
     */
    column?: boolean
    label?: string
    /**
     * whether the field should be hidden when disabled
     */
    showOnDisabled?: boolean
    smallControl?: boolean
  }
const props = defineProps<Props>()

const labelRef = useTemplateRef('labelRef')

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

const fieldArrayProps = computed(() => getFieldArrayProps(props))
const labelProps = computed(() => getFieldLabelProps(props))
const helpProps = computed(() => getFieldHelpProps(props))
</script>
