<template>
  <Checkbox.Group
    id="123"
    v-model="checkboxGroup"
    name="test"
  >
    <Checkbox.Item
      v-for="(item, index) in items"
      :key="item.label"
      :value="item.value"
      :index="index"
    >
      <Checkbox.ItemControl />
      <Checkbox.ItemLabel>{{ item.label }}</Checkbox.ItemLabel>
    </Checkbox.Item>
  </Checkbox.Group>
  <p data-testid="selectedValues">{{ checkboxGroup.join(', ') }}</p>
</template>

<script setup lang="ts">
import { Checkbox } from '../index'
import { ref } from 'vue'

const checkboxGroup = ref<string[]>([])

const items = ref([
  { label: 'Salmon', value: 'salmon' },
  { label: 'Chicken', value: 'chicken' },
  { label: 'Steak', value: 'steak' }
])
</script>
