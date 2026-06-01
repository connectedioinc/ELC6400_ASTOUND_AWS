<template>
  <form
    class="pt-4 text-sm flex flex-col gap-2 relative"
    @submit.prevent="$emit('submit', $event)"
    @reset.prevent="$emit('reset', $event)"
  >
    <div class="px-4 flex justify-between font-bold text-base">
      <div>
        <slot name="header" />
      </div>
      <tlt-button
        v-show="resettable"
        :disabled="false"
        button-type="reset"
        size="sm"
        button-id="clear"
        type="text"
        @click="() => {}"
      >
        {{ resetButton || $t('Clear') }}
      </tlt-button>
    </div>
    <div class="px-4">
      <slot />
    </div>
    <slot name="footer">
      <div class="pb-4 px-4 w-full sticky bg-theme-bg-floating bottom-0">
        <tlt-button
          :disabled="false"
          button-type="submit"
          block
          button-id="apply-filter"
          @click="() => {}"
        >
          {{ footerButton || $t('Apply Filter') }}
        </tlt-button>
      </div>
    </slot>
  </form>
</template>

<script setup lang="ts">
export interface Props {
  resettable?: boolean
  resetButton?: string
  footerButton?: string
}

withDefaults(defineProps<Props>(), {
  resetButton: undefined,
  footerButton: undefined
})

defineEmits<{
  submit: [Event]
  reset: [Event]
}>()
</script>
