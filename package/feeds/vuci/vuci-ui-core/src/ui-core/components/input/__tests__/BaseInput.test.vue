<template>
  <div>
    <label for="input">Input Label</label>
    <InputText
      v-bind="props"
      id="input"
    >
      <template #leading>
        <button @click="leadingCb">A</button>
      </template>
      <template #trailing>
        <button @click="trailingCb">B</button>
      </template>
    </InputText>
  </div>
</template>

<script setup lang="ts">
import { type Props as InputProps, default as InputText } from '../InputText.vue'
type Props = InputProps & {
  required?: boolean
  leadingCb?: () => void
  trailingCb?: () => void
}
const props = defineProps<Props>()
</script>
