<template>
  <form
    class="flex justify-end min-w-0 max-w-64"
    @submit.prevent="onSubmit"
  >
    <Transition
      enter-active-class="transition-[flex-grow]"
      leave-active-class="transition-[flex-grow]"
      enter-from-class="max-md:grow-0"
    >
      <div
        v-show="!expandable || expanded"
        class="duration-300 max-md:shrink max-md:overflow-hidden max-md:basis-0 md:block!"
        :class="{
          'min-w-32': !expandable,
          'max-md:grow': expanded
        }"
      >
        <div
          class="relative bg-theme-bg-secondary-subtle hover:bg-theme-bg-secondary-subtle-hover rounded-full flex flex-1 gap-2 px-4 py-1.5 mr-2 focus-within:px-3.5 focus-within:py-1 focus-within:border-2 focus-within:border-theme-border-primary-strong focus-within:bg-theme-bg-secondary-subtle! group"
        >
          <input
            ref="input"
            v-model="searchValue"
            test-id="input-search"
            :placeholder="`${$t('Search')}...`"
            class="bg-transparent text-sm outline-none min-w-0"
            :class="{ 'w-[calc(100%-2rem)]': !!searchValue }"
            @blur="!searchValue && (expanded = false)"
          />
          <tlt-button
            v-show="!!searchValue"
            button-id="search-clear"
            type="text"
            color="tertiary"
            icon="x"
            class="text-theme-text-subtle hover:text-theme-text-secondary-hover rounded-full focus:outline-theme-border-strong! absolute right-4 group-focus-within:right-3.5"
            :disabled="false"
            @click="onClearClick"
          />
        </div>
      </div>
    </Transition>
    <button
      test-id="button-search"
      class="rounded-full bg-theme-bg-secondary-subtle hover:bg-theme-bg-secondary-subtle-hover shrink-0 size-8 flex justify-center items-center focus:outline-2 focus:outline-theme-border-primary-strong"
    >
      <tlt-icon
        icon="search"
        class="text-theme-text-secondary-subtle size-5"
      />
    </button>
  </form>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from 'vue'
import { useFocus } from '@vueuse/core'

export interface Props {
  /**
   * Makes the search input collapsed on mobile
   * Clicking the search icon expands and focuses the input
   */
  expandable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  expandable: true
})

const searchValue = defineModel<string>({ default: '' })
const emit = defineEmits<{
  submit: [searchValue: string]
  clear: []
}>()

const input = useTemplateRef('input')
const { focused } = useFocus(input)
const expanded = ref(false)

function onClearClick() {
  searchValue.value = ''
  focused.value = true
}

watch(
  () => searchValue.value,
  (curr, prev) => {
    if (prev.length > 0 && curr.length === 0) {
      if (!focused.value) expanded.value = false
      emit('clear')
    } else if (props.expandable) expanded.value = true
  }
)

async function onSubmit() {
  if (props.expandable && !expanded.value) {
    expanded.value = true
    await nextTick()
    focused.value = true
    return
  }
  emit('submit', searchValue.value)
}
</script>
