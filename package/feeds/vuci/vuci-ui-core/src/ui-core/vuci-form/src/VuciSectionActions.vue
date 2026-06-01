<template>
  <div class="flex flex-row items-end justify-end max-md:w-full">
    <slot
      name="buttons"
      :actions="actions"
    />
    <slot
      v-if="actions.create"
      name="action-design"
      :actions="actions"
    >
      <TltButton
        button-id="add"
        @click="actions.create"
      >
        {{ $t('Add') }}
      </TltButton>
    </slot>
  </div>
</template>

<script setup lang="ts">
export interface Props {
  actions?: Record<string, () => void>
}

withDefaults(defineProps<Props>(), {
  actions: () => ({})
})
</script>
