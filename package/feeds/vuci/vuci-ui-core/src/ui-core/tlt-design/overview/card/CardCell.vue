<template>
  <div class="cell">
    <slot>
      <template
        v-for="(column, index) in columns"
        :key="index"
      >
        <cell-row v-bind="column"></cell-row>
      </template>
    </slot>
  </div>
</template>

<script lang="ts" setup>
import CellRow, { type Props as CellRowProps } from './CellRow.vue'

type Props = {
  columns?: CellRowProps[]
}
withDefaults(defineProps<Props>(), {
  columns: () => []
})
</script>
