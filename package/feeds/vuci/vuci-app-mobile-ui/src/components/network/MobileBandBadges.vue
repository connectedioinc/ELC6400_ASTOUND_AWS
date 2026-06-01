<template>
  <span class="flex row gap-1 items-center">
    {{ value }}
    <span class="flex row gap-1 items-center">
      <tlt-badge
        v-for="(item, index) in infoList"
        :key="index"
        :custom-color="colors[index] || 'bg-theme-bg-success text-theme-text-on-success'"
        size="sm"
      >
        <span class="flex items-center text-caption-sm">
          {{ item }}
        </span>
      </tlt-badge>
    </span>
  </span>
</template>

<script setup lang="ts">
export interface Props {
  value: string
  infoList: string[]
  colors: string[]
}

defineProps<Props>()
</script>
