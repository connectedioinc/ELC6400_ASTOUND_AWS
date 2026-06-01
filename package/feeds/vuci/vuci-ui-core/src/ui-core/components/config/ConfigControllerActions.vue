<template>
  <div class="flex items-center justify-between list-layout--ignore w-full">
    <slot name="action-back">
      <BaseButton
        v-if="canGoBack"
        color="secondary"
        button-id="back"
        @click="back"
      >
        {{ $t('Back') }}
      </BaseButton>
    </slot>
    <slot name="action-save">
      <BaseButton
        button-id="saveandapply"
        class="only:ml-auto"
        :disabled="isMutating"
        @click="handleSubmit"
      >
        {{ $t('Save & Apply') }}
      </BaseButton>
    </slot>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@components/button/BaseButton.vue'
import { injectControllerContext } from './ConfigController.vue'

const { canGoBack, back, isMutating, handleSubmit } = injectControllerContext()
</script>

<style lang="" scoped></style>
