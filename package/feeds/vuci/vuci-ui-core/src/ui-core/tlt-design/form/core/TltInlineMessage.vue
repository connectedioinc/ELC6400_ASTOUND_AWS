<template>
  <tlt-form-model-item>
    <div
      :class="style.style"
      class="flex max-w-[23em] w-full gap-3 rounded-md border p-3"
      :test-id="`message-${id}`"
    >
      <tlt-icon
        :icon="style.icon"
        :class="style.iconStyle"
        class="self-start shrink-0"
      />
      <div>
        <slot>
          <!-- eslint-disable -->
          <div
            v-if="rawhtml"
            v-html="$xss(message)"
          />
          <!-- eslint-enable -->
          <div v-else>
            {{ message }}
          </div>
        </slot>
      </div>
    </div>
  </tlt-form-model-item>
</template>
<script>
export default {
  props: {
    type: {
      validator: value => ['warning', 'info', 'error'].includes(value),
      required: true
    },
    message: {
      type: String,
      default: () => ''
    },
    id: {
      type: String,
      default: ''
    },
    rawhtml: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    style() {
      const styles = {
        warning: {
          style: 'bg-theme-bg-warning-subtle border-theme-border-warning-subtle',
          iconStyle: 'text-theme-text-warning',
          icon: 'warning'
        },
        info: {
          style: 'bg-theme-bg-info-subtle border-theme-border-info',
          iconStyle: 'text-theme-text-info',
          icon: 'info'
        },
        error: {
          style: 'bg-theme-bg-danger-subtle border-theme-border-danger-subtle',
          iconStyle: 'text-theme-text-danger',
          icon: 'error'
        }
      }
      return styles[this.type]
    }
  }
}
</script>
