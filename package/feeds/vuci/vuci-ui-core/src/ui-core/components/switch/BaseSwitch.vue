<template>
  <div
    :id="ids.root.value"
    class="t-switch"
    :data-readonly="dataAttribute(props.readonly)"
    :data-disabled="dataAttribute(props.disabled)"
  >
    <button
      :id="ids.main.value"
      role="switch"
      :aria-label="optionalAttribute(props.ariaLabel)"
      :disabled="optionalAttribute(props.disabled)"
      :aria-readonly="optionalAttribute(props.readonly)"
      class="t-switch__control"
      :class="[isChecked && 't-switch__control--checked']"
      :aria-checked="isChecked"
      type="button"
      tabindex="0"
      @click="onClick"
    >
      <span
        class="t-switch__thumb"
        aria-hidden="true"
      />
    </button>
    <span
      v-if="props.indicatorText"
      :id="ids.indicator.value"
      >{{ isChecked ? 'on' : 'off' }}</span
    >
  </div>
</template>

<script setup lang="ts" generic="TTrue, TFalse">
import { computed, toRef } from 'vue'
import { dataAttribute, optionalAttribute } from '@ui-core/utils/attributes'
import { useComposedIds } from '@ui-core/composables/use-composed-ids'

export type Props = {
  disabled?: boolean
  readonly?: boolean
  id?: string
  /**
   * The value that will be emmited when switch is checked.
   * @default true
   */
  trueValue?: any
  /**
   * The value that will be emmited when switch is unchecked.
   * @default false
   */
  falseValue?: any
  /**
   * whether to show indicator text (on/off)
   * @default true
   */
  indicatorText?: boolean
  ariaLabel?: string
}
const props = withDefaults(defineProps<Props>(), {
  trueValue: true,
  falseValue: false,
  required: false,
  disabled: false,
  readonly: false,
  indicatorText: true,
  ariaLabel: undefined,
  id: ''
})

const model = defineModel<any>({ default: false })

const ids = useComposedIds(toRef(props, 'id'), ['root', 'indicator'])

const isChecked = computed(() => model.value === props.trueValue)

function onClick() {
  if (props.readonly || props.disabled) return
  model.value = isChecked.value ? props.falseValue : props.trueValue
}
</script>
