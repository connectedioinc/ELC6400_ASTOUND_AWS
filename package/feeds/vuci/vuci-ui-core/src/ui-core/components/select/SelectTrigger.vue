<template>
  <button
    :id="rootContext.triggerId.value"
    ref="trigger"
    type="button"
    role="combobox"
    :aria-controls="rootContext.listboxId.value"
    :aria-expanded="rootContext.isOpen.value"
    :aria-required="rootContext.required.value"
    :aria-activedescendant="rootContext.activeDescendant.value?.id"
    aria-autocomplete="none"
    :disabled="rootContext.disabled.value"
    @keydown.arrow-up.arrow-down.page-down.page-up.backspace.escape="handleTriggerKeyDown"
    @click="
      (event: MouseEvent) => {
        // Whilst browsers generally have no issue focusing the trigger when clicking
        // on a label, Safari seems to struggle with the fact that there's no `onClick`.
        // We force `focus` in this case. Note: this doesn't create any other side-effect
        // because we are preventing default in `onPointerDown` so effectively
        // this only runs for a label 'click'
        ;(event?.currentTarget as HTMLElement)?.focus()
      }
    "
    @pointerdown="
      (event: PointerEvent) => {
        if (event.pointerType === 'touch') return event.preventDefault()

        // prevent implicit pointer capture
        // https://www.w3.org/TR/pointerevents3/#implicit-pointer-capture
        const target = event.target as HTMLElement
        if (supportsPointerCapture && target.hasPointerCapture(event.pointerId)) {
          target.releasePointerCapture(event.pointerId)
        }
        // only call handler if it's the left button (mousedown gets triggered by all mouse buttons)
        // but not when the control key is pressed (avoiding MacOS right click)
        if (event.button === 0 && (event.ctrlKey === false || event.metaKey === false)) {
          if (rootContext.isOpen.value) rootContext.close()
          else rootContext.open()
          // prevent trigger from stealing focus from the active item after opening.
          event.preventDefault()
        }
      }
    "
    @pointerup.prevent="
      (event: PointerEvent) => {
        // Only open on pointer up when using touch devices
        if (event.pointerType === 'touch') rootContext.open()
      }
    "
  >
    <slot>
      <TltIcon icon="dropdown-arrow" />
    </slot>
  </button>
</template>

<script setup lang="ts">
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import { injectSelectContext } from './use-select-context'
import { onMounted, useTemplateRef, onUnmounted } from 'vue'
import { nextTick } from 'vue'
import { isArray } from '@ui-core/utils/inspect'

const trigger = useTemplateRef('trigger')

const rootContext = injectSelectContext()

onMounted(() => {
  if (!trigger.value) throw new Error('Trigger is not present.')
  rootContext.setTriggerEl(trigger.value)
})

onUnmounted(() => {
  rootContext.setTriggerEl(null)
})

// check if the browser supports pointer capture (jest-dom does not support it)
const supportsPointerCapture = 'hasPointerCapture' in HTMLElement.prototype

async function handleTriggerKeyDown(e: KeyboardEvent) {
  const open = async () => {
    rootContext.open()
    e.preventDefault()
    await nextTick()
  }
  if (e.altKey) {
    if (e.key === 'ArrowDown') open()
    else if (e.key === 'ArrowUp') {
      rootContext.close()
      rootContext.focusTrigger()
      e.preventDefault()
    }
    return
  }
  switch (e.key) {
    case 'Backspace': {
      if (rootContext.multiple.value && isArray(rootContext.model.value)) {
        rootContext.model.value = rootContext.model.value.slice(0, -1)
      }
      e.preventDefault()
      return
    }
    case 'ArrowDown': {
      await open()
      rootContext.focusListbox()
      const candidate = rootContext.getScrollOptionCandidate()
      const scrolled = rootContext.scrollToElement(candidate)
      // if nothing is selected, focus on first item
      if (!scrolled) rootContext.focusOption({ index: 0 })
      else if (candidate) rootContext.handleElementFocus(candidate)
      return
    }
    case 'ArrowUp': {
      await open()
      // will be clamped to last option
      return rootContext.focusOption({ index: -1 })
    }
    case 'Escape': {
      e.preventDefault()
      return rootContext.close()
    }
  }
}
</script>
