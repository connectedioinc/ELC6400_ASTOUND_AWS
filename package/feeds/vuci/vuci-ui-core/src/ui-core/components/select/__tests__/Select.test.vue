<template>
  <div>
    <label :for="realId">Select an option:</label>
    <SelectRoot
      v-bind="props"
      :id="realId"
    >
      <SelectTrigger>
        <SelectValue :placeholder="props.placeholder" />
      </SelectTrigger>
      <SelectListbox v-slot="{ options: selectOptions }">
        <SelectItem
          v-for="option in selectOptions"
          :key="option.textContent"
          v-bind="option"
          >{{ option.textContent }}
        </SelectItem>
      </SelectListbox>
    </SelectRoot>
  </div>
</template>

<script setup lang="ts">
import { SelectRoot, SelectTrigger, SelectValue, SelectListbox, SelectItem, type SelectRootProps } from '../index'

type Props = SelectRootProps<any> & {
  placeholder?: string
  modelValue: any
}
const props = defineProps<Props>()

const realId = props.id || 'test'
</script>

<style lang="" scoped></style>
