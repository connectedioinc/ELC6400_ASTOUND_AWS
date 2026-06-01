<template>
  <div>
    <tlt-overlay
      :open="open"
      @click="$emit('close')"
    />
    <div class="flex">
      <div
        ref="trigger"
        class="scroll-m-24"
        :class="{
          'relative z-20': open
        }"
      >
        <slot name="button" />
      </div>
      <tlt-positioner
        :target="() => $refs.trigger"
        :triggers="[]"
        :force-show="open"
        class="[&_.positioner-arrow]:bg-theme-bg-floating"
        arrow
      >
        <base-popover class="sm:max-w-none!">
          <div
            class="absolute flex right-0 top-0 p-3 cursor-pointer"
            test-id="button-close"
            @click="$emit('close')"
          >
            <tlt-icon
              size="size-3"
              icon="x"
            />
          </div>
          <slot />
        </base-popover>
      </tlt-positioner>
    </div>
  </div>
</template>

<script>
import { addListener } from '@ui-core/utils/dom'

export default {
  props: {
    open: {
      type: Boolean,
      required: true
    }
  },
  emits: ['close'],
  data() {
    return {
      cleanup: null
    }
  },
  watch: {
    open(value) {
      document.body.style.overflow = value ? 'hidden' : 'auto'
      if (value) {
        this.cleanup = addListener(document, 'scrollend', () => {
          if (!this.open) return
          this.$refs.trigger.scrollIntoView({ block: 'nearest' })
        })
      } else this.cleanup?.()
    }
  },
  beforeUnmount() {
    this.cleanup?.()
  }
}
</script>
