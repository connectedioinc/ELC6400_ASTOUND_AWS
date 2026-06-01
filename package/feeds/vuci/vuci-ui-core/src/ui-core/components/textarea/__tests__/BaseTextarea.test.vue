<template>
  <div>
    <label for="textarea">Input Label</label>
    <BaseTextarea
      v-bind="props"
      id="textarea"
    >
      <template #trailing>
        <button
          type="button"
          @click="trailingCb"
        >
          B
        </button>
      </template>
    </BaseTextarea>
  </div>
</template>

<script setup lang="ts">
import { type Props as TextareaProps, default as BaseTextarea } from '../BaseTextarea.vue'
type Props = TextareaProps & {
  trailingCb?: () => void
}
const props = defineProps<Props>()
</script>

<style lang="" scoped></style>
