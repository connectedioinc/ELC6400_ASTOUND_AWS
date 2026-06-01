<template>
  <RadioGroup
    v-model="radioModel"
    name="test"
  >
    <RadioItem
      v-for="item in items"
      :key="item.label"
      :value="item.value"
      class="flex gap-2 py-2 my-1"
    >
      <RadioItemControl />
      <RadioItemLabel>{{ item.label }}</RadioItemLabel>
    </RadioItem>
  </RadioGroup>
  <p data-testid="selected-value">{{ radioModel }}</p>
</template>

<script setup lang="ts">
import { RadioItemControl, RadioGroup, RadioItem, RadioItemLabel } from '../index'
import { ref } from 'vue'

const radioModel = ref(null)

const items = ref([
  { label: 'Salmon', value: 'salmon' },
  { label: 'Chicken', value: 'chicken' },
  { label: 'Steak', value: 'steak' }
])
</script>
