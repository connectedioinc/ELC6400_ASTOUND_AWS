<template>
  <TltModal
    :open="open"
    :title="title"
    class="text-body-main"
    size="medium"
    hide-navigation
    @close="$emit('close')"
  >
    <Accordion
      :name="id"
      single-open
      class="*:py-3 *:first:pt-0 *:last:pb-0 max-lg:divide-y"
    >
      <slot />
    </Accordion>
    <template
      v-if="showActions"
      #actions
    >
      <slot
        v-if="message || $slots.message"
        name="message"
      >
        <p>{{ message }}</p>
      </slot>
      <div class="flex justify-between mt-8">
        <tlt-button
          button-id="cancel"
          :disabled="false"
          color="secondary"
          @click="$emit('cancel')"
        >
          <slot name="cancel">
            {{ cancelText ?? $t('Cancel') }}
          </slot>
        </tlt-button>
        <tlt-button
          button-id="proceed"
          :disabled="false"
          @click="$emit('proceed')"
        >
          <slot name="proceed">
            {{ proceedText ?? $t('Proceed') }}
          </slot>
        </tlt-button>
      </div>
    </template>
  </TltModal>
</template>

<script setup lang="ts">
import Accordion from '@ui-core/tlt-design/layout/accordion/Accordion.vue'

export interface Props {
  id: string
  open?: boolean
  title?: string
  message?: string
  proceedText?: string
  cancelText?: string
  showActions?: boolean
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  message: undefined,
  proceedText: undefined,
  cancelText: undefined,
  showActions: true
})

defineEmits<{
  close: []
  cancel: []
  proceed: []
}>()
</script>
