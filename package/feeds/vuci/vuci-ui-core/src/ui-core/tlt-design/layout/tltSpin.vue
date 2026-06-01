<template>
  <div
    v-if="store.spinner.spinning > 0"
    ref="spinnerElement"
    test-id="global-spinner"
    tabindex="-1"
    class="z-50 fixed inset-0 font-sans font-semibold flex flex-col items-center justify-center gap-2 text-body-secondary px-4"
    :class="[
      {
        'overflow-auto': store.spinner.spinning > 0,
        'bg-black!': store.performanceTest
      },
      store.spinner.fullOpacity ? 'bg-theme-bg-secondary-subtle' : 'bg-theme-bg-secondary-subtle/60'
    ]"
  >
    <template v-if="!store.performanceTest">
      <tlt-icon
        class="w-14 h-14 text-theme-text-primary"
        icon="spinner"
        animate
      />
      <p class="text-center break-words w-full">{{ store.spinner.tip || $t('Loading...') }}</p>
      <!-- eslint-disable -->
      <span
        v-if="store.spinner.message"
        v-html="$xss(store.spinner.message)"
        class="text-center"
      />
      <!-- eslint-enable -->
      <tlt-button
        v-if="store.spinner.cancelButton"
        type="text"
        class="mt-8"
        :disabled="false"
        @click="store.spinner.cancelAction"
      >
        {{ $t('Cancel') }}
      </tlt-button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { watch, ref, nextTick, useTemplateRef } from 'vue'
import { useMainStore } from '@/stores/main'
import { useTranslate } from '@ui-core/composables/useI18n'
import { cancelRequests } from '@ui-core/plugins/axios'

const store = useMainStore()
const $t = useTranslate()

const timeout = ref()
const previouslyFocusedElement = ref<HTMLElement | null>(null)
const spinnerElement = useTemplateRef('spinnerElement')

function cancel() {
  store.spinner.spinning = 0
  store.spinner.cancelButton = false
  cancelRequests('request')
}
function cancelTimeout() {
  clearTimeout(timeout.value)
  timeout.value = false
  store.spinner.cancelButton = false
  store.spinner.message = undefined
}
function startTimeout() {
  timeout.value = setTimeout(() => {
    store.spinner.cancelButton = true
    store.spinner.cancelAction = cancel
    store.spinner.message = $t('The process could take a while.')
  }, 30 * 1000)
}

const manageFocus = async () => {
  const activeElement = document.activeElement as HTMLElement
  if (activeElement && activeElement !== document.body) {
    previouslyFocusedElement.value = activeElement
  }
  await nextTick()
  if (spinnerElement.value) {
    spinnerElement.value.focus()
  }
}

const restoreFocus = () => {
  if (previouslyFocusedElement.value) {
    previouslyFocusedElement.value.focus()
    previouslyFocusedElement.value = null
  }
}

watch(
  () => store.spinner.spinning,
  spinning => {
    if (!store.modalOpen) {
      document.body.style.overflow = spinning ? 'hidden' : 'auto'
    }
    if (spinning) {
      manageFocus()
    } else {
      restoreFocus()
    }
    if (spinning >= 1 && store.spinner.cancelButton === false && !timeout.value && !store.spinner.fullOpacity && store.firstLogin === false) {
      startTimeout()
    } else if (timeout.value) {
      cancelTimeout()
    }
    if (spinning === 0) {
      store.spinner.cancelAction = cancel
    }
  }
)
</script>
