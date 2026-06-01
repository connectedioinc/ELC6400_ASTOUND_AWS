<template>
  <FieldRoot
    v-show="props.showOnDisabled ? true : !props.disabled"
    v-model="modelValue"
    class="form__item form__item--row"
    :class="{ 'form__item--small': props.smallControl }"
    v-bind="rootProps"
  >
    <div class="form__item__leading">
      <FieldLabel
        :class="['form__item__label', { 'sr-only': props.srOnly }]"
        v-bind="labelProps"
      >
        <slot name="label">
          {{ props.label }}
        </slot>
      </FieldLabel>
      <FieldHelp v-bind="helpProps">
        <slot name="help">
          {{ props.help }}
        </slot>
      </FieldHelp>
    </div>
    <div class="form__item__trailing flex gap-1">
      <FieldControl class="grow">
        <slot />
      </FieldControl>
      <div class="flex items-center">
        <FieldMeta />
      </div>
    </div>
  </FieldRoot>
</template>
<script lang="ts">
const fieldRootKeys: (keyof FieldRootProps)[] = ['defaultValue', 'name', 'rules', 'warnings', 'standalone', 'required', 'readonly', 'disabled'] as const
const getFieldRootProps = <T extends Record<string, any>>(props: T): FieldRootProps => pick(props, fieldRootKeys)
const getFieldLabelProps = <T extends Record<string, any>>(props: T): FieldLabelProps => pick(props, ['requiredIndicator'])

const getFieldHelpProps = <T extends Record<string, any>>(props: T): FieldHelpProps => pick(props, ['help'])
</script>

<script setup lang="ts">
import { FieldRoot, FieldLabel, FieldControl, FieldHelp, FieldMeta } from '@components/field'
import type { FieldRootProps, FieldHelpProps, FieldLabelProps } from '@components/field'
import { pick } from '@ui-core/utils/object'
import { computed } from 'vue'

type Props = FieldRootProps &
  FieldHelpProps &
  FieldLabelProps & {
    label?: string
    srOnly?: boolean
    /**
     * whether the field should be hidden when disabled
     */
    showOnDisabled?: boolean
    smallControl?: boolean
  }
const props = withDefaults(defineProps<Props>(), {
  label: '',
  showOnDisabled: false
})

const modelValue = defineModel<any>()

const rootProps = computed(() => getFieldRootProps(props))
const labelProps = computed(() => getFieldLabelProps(props))
const helpProps = computed(() => getFieldHelpProps(props))
</script>

<style lang="" scoped></style>
