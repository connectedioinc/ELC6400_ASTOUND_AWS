<template>
  <div class="flex flex-col w-max gap-2 max-w-full">
    <div
      class="field field-textarea min-h-fit"
      :data-readonly="dataAttribute(props.readonly)"
      :data-disabled="dataAttribute(props.disabled)"
      :data-state="optionalAttribute(props.state)"
    >
      <textarea
        :id="props.id"
        ref="textarea"
        v-model="model"
        :class="['field-textarea__control', resizeClass]"
        :aria-required="optionalAttribute(props.required)"
        :placeholder="optionalAttribute(props.placeholder)"
        :readonly="optionalAttribute(props.readonly)"
        :disabled="optionalAttribute(props.disabled)"
        :name="optionalAttribute(props.name)"
        :rows="autoGrow ? undefined : rows"
      />
      <div
        v-if="copyButton || $slots.trailing"
        class="field__addon field__addon-right flex flex-col gap-1"
      >
        <template v-if="copyButton">
          <button
            ref="copyBtn"
            type="button"
            aria-label="Copy"
            @click="onCopyClick"
          >
            <TltIcon icon="copy" />
          </button>
          <TltTooltip
            :target="() => copyBtn"
            :force-show="showTooltip"
            :triggers="[]"
            placement="left"
          >
            {{ $t('Copied!') }}
          </TltTooltip>
        </template>
        <slot name="trailing" />
      </div>
    </div>
    <div
      v-if="maxlength && !noCounter"
      class="self-end text-xs text-theme-bg-secondary-1 font-semibold"
    >
      {{ '%s/%s'.format(model.length, maxlength) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FieldState } from '@components/shared-types'
import { useTextareaAutosize } from '@vueuse/core'
import { dataAttribute, optionalAttribute } from '@ui-core/utils/attributes'
import { ref, computed, useTemplateRef } from 'vue'
import { copyToClipboard } from '@ui-core/plugins/helper'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import TltTooltip from '../tooltip/TltTooltip.vue'

export type Props = {
  name?: string | number
  id?: string
  /**
   * @default false
   */
  required?: boolean
  /**
   * @default false
   */
  disabled?: boolean
  /**
   * @default false
   */
  readonly?: boolean
  /**
   * @default undefined
   */
  state?: FieldState | undefined
  /**
   * @default undefined
   */
  placeholder?: string
  autoGrow?: boolean
  /**
   * @default 6
   */
  rows?: number
  copyButton?: boolean
  /**
   * @default true
   */
  resize?: boolean | 'horizontal' | 'vertical'
  noCounter?: boolean
  maxlength?: number
}

const props = withDefaults(defineProps<Props>(), {
  name: undefined,
  required: false,
  disabled: false,
  readonly: false,
  state: undefined,
  placeholder: undefined,
  rows: 6,
  copyButton: false,
  resize: true,
  maxlength: undefined,
  noCounter: false,
  id: undefined
})

const model = defineModel<string>({ default: '' })
const copyBtn = useTemplateRef('copyBtn')

const { textarea } = props.autoGrow
  ? useTextareaAutosize({
      input: model
    })
  : { textarea: ref<any>() }

const showTooltip = ref(false)
function onCopyClick() {
  copyToClipboard(model.value)
  showTooltip.value = true
  setTimeout(() => {
    showTooltip.value = false
  }, 1500)
}

const resizeClass = computed(() => {
  if (props.autoGrow || !props.resize) return 'resize-none'
  switch (props.resize) {
    case 'horizontal':
      return 'resize-x'
    case 'vertical':
      return 'resize-y'
    default:
      return 'resize'
  }
})
</script>
