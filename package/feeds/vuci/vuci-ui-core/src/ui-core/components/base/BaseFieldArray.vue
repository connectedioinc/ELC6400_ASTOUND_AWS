<template>
  <FieldArray
    v-show="props.showOnDisabled ? true : !props.disabled"
    v-slot="{ rows }"
    class="form__item form__item--array"
    :class="[props.column ? 'form__item--column' : 'form__item--row']"
    v-bind="fieldArrayProps"
  >
    <div class="form__item__leading">
      <FieldLabel
        ref="labelRef"
        :class="['form__item__label', { 'sr-only': props.srOnly }]"
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
    <div class="form__item__trailing space-y-4">
      <div
        v-for="(key, index) in rows"
        :key="key"
        class="flex gap-2.5 items-center"
      >
        <slot
          :row="key"
          :index="index"
        >
        </slot>
        <div class="form__item__trailing__actions">
          <slot
            name="actions"
            :index="index"
            :total-items="rows.length"
            :max-allowed-items="maxAllowedItems"
          >
          </slot>
          <FieldArrayTriggerAdd
            v-if="index === rows.length - 1 && rows.length < maxAllowedItems"
            :index="index"
          >
          </FieldArrayTriggerAdd>
          <FieldArrayTriggerRemove
            v-if="rows.length > 1"
            :index="index"
          >
          </FieldArrayTriggerRemove>
        </div>
      </div>
    </div>
  </FieldArray>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { FieldArray, FieldArrayTriggerAdd, FieldArrayTriggerRemove, FieldHelp, FieldLabel } from '../field'
import type { FieldArrayProps, FieldHelpProps, FieldLabelProps } from '../field'
import { getFieldArrayProps, getFieldHelpProps, getFieldLabelProps } from './utils'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

type Props = Omit<FieldArrayProps, 'asChild' | 'as'> &
  FieldHelpProps &
  FieldLabelProps & {
    /**
     * whether the field is in column layout (label stacked on top of control, rather than in row)
     * @default false
     */
    column?: boolean
    label?: string
    srOnly?: boolean
    /**
     * whether the field should be hidden when disabled
     */
    showOnDisabled?: boolean
    smallControl?: boolean
    maxRows?: number
  }
const props = defineProps<Props>()

const maxAllowedItems = computed(() => {
  if (!props.maxRows || props.maxRows < 1) return Infinity
  return props.maxRows
})

const labelRef = useTemplateRef('labelRef')

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

const fieldArrayProps = computed(() => getFieldArrayProps(props))
const labelProps = computed(() => getFieldLabelProps(props))
const helpProps = computed(() => getFieldHelpProps(props))
</script>
