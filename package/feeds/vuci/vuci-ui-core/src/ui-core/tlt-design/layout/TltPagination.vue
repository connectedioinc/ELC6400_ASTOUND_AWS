<template>
  <nav class="flex items-center">
    <tlt-button
      type="text"
      class="mr-2"
      button-id="first-page"
      :disabled="modelValue <= 1"
      @click="model = 1"
    >
      <tlt-icon
        icon="chevron-double"
        class="-mr-1 rotate-180 size-5"
      />
    </tlt-button>
    <tlt-button
      button-id="previous-page"
      type="text"
      size="md"
      :disabled="modelValue <= 1"
      @click="model--"
    >
      <tlt-icon
        icon="chevron"
        class="rotate-180 -mr-1 size-5"
      />
      <span class="max-md:hidden">{{ $t('Previous') }}</span>
    </tlt-button>
    <div
      class="flex items-center gap-3 mx-6 md:mx-12"
      @blur="model = modelValue"
    >
      <tlt-input
        id="page-number"
        v-model="tempValue"
        class="max-w-16! md:max-w-20! w-fit! inline-block"
        :readonly="false"
        @blur="onInputBlur"
      />
      of {{ totalPages }}
    </div>
    <tlt-button
      button-id="next-page"
      type="text"
      size="md"
      class="mr-2"
      :disabled="modelValue >= totalPages"
      @click="model++"
    >
      <span class="max-md:hidden">{{ $t('Next') }}</span>
      <tlt-icon
        class="-ml-1 size-5"
        icon="chevron"
      />
    </tlt-button>
    <tlt-button
      button-id="last-page"
      type="text"
      :disabled="modelValue >= totalPages"
      @click="model = totalPages"
    >
      <tlt-icon
        class="size-5"
        icon="chevron-double"
      />
    </tlt-button>
  </nav>
</template>

<script>
import { isString } from '@ui-core/utils/inspect'

export default {
  props: {
    modelValue: {
      type: [Number, String],
      default: 1
    },
    totalPages: {
      type: Number,
      required: true
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      tempValue: this.modelValue
    }
  },
  computed: {
    model: {
      get() {
        return this.modelValue
      },
      set(value) {
        if (value > this.totalPages) value = this.totalPages
        else if (value < 1) value = 1
        this.$emit('update:modelValue', value)
        // watcher won't be triggered if value will be set to the same value more than once
        this.tempValue = value
      }
    }
  },
  watch: {
    modelValue(v) {
      this.tempValue = isString(v) ? parseInt(v) : v
    }
  },
  methods: {
    /**
     * @param {FocusEvent} event
     */
    onInputBlur() {
      const hasLetters = String(this.tempValue).search(/[^\d]/)
      if (hasLetters > -1 || !this.tempValue.length) {
        // resets to current page.
        this.tempValue = this.model
      } else {
        // sets to a new page.
        this.model = parseInt(this.tempValue)
      }
    }
  }
}
</script>
