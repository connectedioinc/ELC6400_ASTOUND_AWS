<template>
  <tlt-modal
    :open="open"
    size="big"
    container-class="h-full!"
    @close="handleCloseModal"
  >
    <tlt-card
      :title="title"
      :help="help"
    >
      <template #title-content>
        <slot name="header-controls"></slot>
        <tlt-search-form
          class="max-lg:order-first ml-auto"
          @submit="handleSearch"
          @clear="handleClearSearch"
        />
      </template>
      <slot name="before-content"></slot>
      <tlt-text-area
        ref="textArea"
        readonly
        :custom-id="customId"
        :model-value="filteredLogs"
        :resize="false"
        class="h-full"
      />
    </tlt-card>
  </tlt-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, useTemplateRef } from 'vue'
import { useScroll } from '@vueuse/core'

export type Props = {
  title?: string
  logs?: string
  open?: boolean
  help?: string
  customId?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  logs: '',
  help: '',
  customId: 'template'
})

const searchValue = ref('')
const textArea = useTemplateRef('textArea')

const textareaEl = computed(() => textArea.value?.$el?.querySelector('textarea'))
const { arrivedState } = useScroll(textareaEl)

const filteredLogs = computed(() => {
  if (!searchValue.value) return props.logs
  const term = searchValue.value.toLowerCase()
  return props.logs
    .split('\n')
    .filter(line => line.toLowerCase().includes(term))
    .join('\n')
})

function scrollToBottom() {
  nextTick(() => {
    const textarea = textArea.value?.$el?.querySelector('textarea')
    textarea.scrollTop = textareaEl.value.scrollHeight
  })
}

function handleSearch(value: string) {
  searchValue.value = value
  scrollToBottom()
}

function handleClearSearch() {
  searchValue.value = ''
  scrollToBottom()
}

function handleCloseModal() {
  searchValue.value = ''
}

watch([() => props.logs, () => props.open], ([, isOpen], [oldLogs]) => {
  if (isOpen && (!oldLogs || arrivedState.bottom)) {
    scrollToBottom()
  }
})
</script>
