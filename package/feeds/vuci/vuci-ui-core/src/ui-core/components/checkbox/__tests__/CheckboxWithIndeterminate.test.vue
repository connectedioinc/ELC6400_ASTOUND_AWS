<template>
  <Checkbox.Group
    v-model="checkboxGroup"
    name="test"
  >
    <Checkbox.Control
      aria-label="Indeterminate checkbox"
      data-testid="indeterminate"
      :model-value="checked"
      :indeterminate="indeterminate"
      @update:model-value="onUpdate"
    />
    <Checkbox.Item
      v-for="(item, index) in items"
      :key="item.label"
      :index="index"
      :value="item.value"
      class="flex gap-2 py-2 my-1"
    >
      <Checkbox.ItemControl />
      <Checkbox.ItemLabel>{{ item.label }}</Checkbox.ItemLabel>
    </Checkbox.Item>
  </Checkbox.Group>
  <p data-testid="indeterminate-value">{{ checked }}</p>
  <p data-testid="selected-values">{{ checkboxGroup.join(', ') }}</p>
</template>

<script setup lang="ts">
import { Checkbox } from '@ui-core/components/checkbox'
import { ref, computed } from 'vue'

const checkboxGroup = ref<string[]>([])

function onUpdate(checked: boolean) {
  if (checked) checkboxGroup.value = items.value.map(v => v.value)
  else checkboxGroup.value = []
}

const items = ref([
  { label: 'Salmon', value: 'salmon' },
  { label: 'Chicken', value: 'chicken' },
  { label: 'Steak', value: 'steak' }
])

const checked = computed(() => checkboxGroup.value.length === items.value.length)
const indeterminate = computed(() => checkboxGroup.value.length > 0 && checkboxGroup.value.length < items.value.length)
</script>
