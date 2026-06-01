<template>
  <Teleport to="body">
    <div
      ref="floating"
      class="z-50 w-full"
      :style="floatingStyles"
    >
      <Transition
        leave-active-class="transition-all absolute"
        enter-active-class="transition-all absolute"
        leave-to-class="translate-y-4 opacity-0"
        enter-from-class="translate-y-4 opacity-0"
      >
        <ul
          v-show="rootCtx.isOpen.value"
          :id="rootCtx.listboxId.value"
          ref="listbox"
          tabindex="-1"
          role="listbox"
          :aria-multiselectable="rootCtx.multiple.value ? true : undefined"
          v-bind="$attrs"
          class="relative z-10"
          @keydown="onListboxKeydown"
        >
          <slot
            :id="rootCtx.listboxId.value"
            :options="rootCtx.options.value"
          />
        </ul>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { injectSelectContext } from './use-select-context'
import { ref, useTemplateRef, watch } from 'vue'
import { useFloating, flip, offset, shift, autoUpdate, size } from '@floating-ui/vue'
import type { SelectOption } from './use-select'
import { onClickOutside } from '@vueuse/core'

defineOptions({
  inheritAttrs: false
})

const listbox = useTemplateRef('listbox')

const rootCtx = injectSelectContext()

watch(listbox, el => {
  rootCtx.setListboxEl(el)
})

onClickOutside(listbox, () => rootCtx.close(), { ignore: [rootCtx.trigger] })

function onListboxKeydown(e: KeyboardEvent) {
  switch (e.key) {
    case 'ArrowDown': {
      rootCtx.focusOption({ delta: 1 })
      e.preventDefault()
      return
    }
    case 'ArrowUp': {
      rootCtx.focusOption({ delta: -1 })
      e.preventDefault()
      return
    }
    case 'Tab': {
      const activeOption = getActiveOption()
      if (activeOption && !activeOption.disabled) rootCtx.onValueChange(activeOption.value)
      rootCtx.close()
      rootCtx.focusTrigger()
      return
    }
    case 'Escape': {
      rootCtx.close()
      rootCtx.focusTrigger()
      e.preventDefault()
      return
    }
    case 'Home': {
      rootCtx.focusOption({ index: 0 })
      e.preventDefault()
      return
    }
    case 'End': {
      rootCtx.focusOption({ index: -1 })
      e.preventDefault()
      return
    }
    case 'PageUp': {
      rootCtx.focusOption({ delta: -10 })
      e.preventDefault()
      return
    }
    case 'PageDown': {
      rootCtx.focusOption({ delta: 10 })
      e.preventDefault()
      return
    }
  }
}

function getActiveOption(): SelectOption | undefined {
  if (!listbox.value) return
  // works on hovered item too
  const activeOptionEl = listbox.value.querySelector("[role='option'][data-highlighted]")
  if (!activeOptionEl) return
  return rootCtx.optionMap.value.get(activeOptionEl as HTMLElement)
}

const floating = ref<HTMLElement | null>(null)

const { floatingStyles } = useFloating(rootCtx.trigger, floating, {
  open: rootCtx.isOpen,
  placement: 'bottom-end',
  strategy: 'absolute',
  whileElementsMounted: (ref, floating, update) => autoUpdate(ref, floating, update),
  middleware: [
    offset(4),
    flip({ fallbackPlacements: ['top-end'] }),
    shift(),
    size({
      apply({ rects, elements }) {
        Object.assign(elements.floating.style, {
          maxWidth: `${rects.reference.width}px`
        })
      }
    })
  ]
})
</script>
