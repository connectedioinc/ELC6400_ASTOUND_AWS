<template>
  <div
    class="flex text-xs min-w-0"
    @click="$emit('click')"
  >
    <tlt-overflow-hint
      class="rounded-full font-semibold text-xs select-none w-fit z-1"
      :class="[resolvedColor, resolvedSize, { pulse: pulse }]"
      :style="pulse ? { '--pulse-color': getPulseColor() } : {}"
      :expandable="false"
    >
      <slot />
    </tlt-overflow-hint>
    <span
      v-if="$slots.context"
      :class="[resolvedContextColor, resolvedSize, '-ml-3 border rounded-tr-full rounded-br-full px-2.5 truncate']"
    >
      <slot name="context" />
    </span>
  </div>
</template>

<script>
export default {
  props: {
    type: {
      type: String,
      default: 'success',
      validator: v => ['success', 'warning', 'error', 'inactive', 'disabled', 'primary'].includes(v)
    },
    size: {
      type: String,
      default: 'md',
      validator: v => ['md', 'sm'].includes(v)
    },
    customColor: {
      type: String,
      default: ''
    },
    pulse: {
      type: Boolean,
      default: false
    },
    customContextColor: {
      type: String,
      default: ''
    }
  },
  emits: ['click'],
  computed: {
    resolvedColor() {
      const colors = {
        primary: 'bg-theme-bg-primary-1 text-theme-text-on-primary',
        success: 'bg-theme-bg-success text-theme-text-on-success',
        warning: 'bg-theme-bg-warning text-theme-text-on-warning',
        error: 'bg-theme-bg-danger text-theme-text-on-danger',
        inactive: 'bg-theme-bg-secondary-1 text-theme-text-on-secondary',
        disabled: 'bg-theme-bg-secondary-subtle text-theme-text-on-secondary-subtle'
      }
      return this.customColor || colors[this.type]
    },
    resolvedContextColor() {
      const colors = {
        primary: 'bg-theme-bg-primary-1/20 text-theme-text-on-primary',
        success: 'bg-theme-bg-success/20 text-theme-text-on-success',
        warning: 'bg-theme-bg-warning/20 text-theme-text-on-warning',
        error: 'bg-theme-bg-danger/20 text-theme-text-on-danger',
        inactive: 'bg-theme-bg-secondary-1/20 text-theme-text-on-secondary',
        disabled: 'bg-theme-bg-secondary-subtle/20 text-theme-text-on-secondary'
      }
      return this.customContextColor || colors[this.type]
    },
    resolvedSize() {
      const sizes = {
        md: 'px-3 py-1',
        sm: 'px-2 py-0.5'
      }
      return sizes[this.size]
    }
  },
  methods: {
    getPulseColor() {
      // Map only the used status badge bg classes to CSS variables
      const colorClass = (this.customColor || this.resolvedColor || '').split(' ').find(c => c.startsWith('bg-'))
      const varMap = {
        'bg-theme-bg-secondary': 'var(--theme-bg-secondary)',
        'bg-theme-bg-warning': 'var(--theme-bg-warning)',
        'bg-theme-bg-success': 'var(--theme-bg-success)',
        'bg-theme-bg-danger': 'var(--theme-bg-danger)',
        'bg-theme-bg-warning-subtle': 'var(--theme-bg-warning)',
        'bg-theme-border-status-good': 'var(--theme-border-status-good)',
        'bg-theme-bg-secondary-subtle': 'var(--theme-bg-secondary-subtle)',
        'bg-theme-bg-secondary-1': 'var(--theme-bg-secondary-1)'
      }
      return varMap[colorClass] || 'var(--theme-bg-success)'
    }
  }
}
</script>
<style scoped>
.pulse {
  animation: pulse-animation 2s infinite;
}

@keyframes pulse-animation {
  0% {
    box-shadow: 0 0 0 0px var(--pulse-color, #22c55e);
  }
  100% {
    box-shadow: 0 0 0 12px color-mix(in srgb, var(--pulse-color, #22c55e) 0%, transparent 100%);
  }
}
</style>
