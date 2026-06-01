<template>
  <template v-if="title">
    <tlt-card
      v-show="show"
      :title="title"
      :help="help"
      :sid="sid"
      :toggleable="toggleable"
      v-bind="$attrs"
    >
      <template #title-content>
        <slot name="title-content"></slot>
      </template>

      <tlt-form-model
        ref="form"
        :model="model"
        :rules="rules"
        gap="md"
      >
        <slot />
      </tlt-form-model>
    </tlt-card>
    <div
      v-if="$slots.applyButton"
      v-show="show"
      class="list-layout--ignore"
    >
      <slot name="applyButton" />
    </div>
  </template>
  <tlt-form-model
    v-else
    v-show="show"
    ref="form"
    :model="model"
    :rules="rules"
    bordered
    v-bind="$attrs"
  >
    <slot />
    <div
      v-if="$slots.applyButton"
      class="list-layout--ignore"
    >
      <slot name="applyButton" />
    </div>
  </tlt-form-model>
</template>
<script>
import { noop } from '@ui-core/utils/props'
import { formBus } from '@ui-core/vuci-form'

export default {
  inject: {
    setModalTitle: {
      default: () => noop
    }
  },
  provide() {
    return {
      inlineForm: this.inline
    }
  },
  inheritAttrs: false,
  props: {
    customSave: {
      type: Boolean,
      default: false
    },
    apply: {
      type: Function,
      default: null
    },
    model: {
      type: Object,
      default: () => {}
    },
    rules: {
      type: [Array, Object],
      default: () => {}
    },
    load: {
      type: Function,
      default: () => {}
    },
    title: {
      type: String,
      default: ''
    },
    help: {
      type: String,
      default: ''
    },
    sid: {
      type: String,
      required: true
    },
    toggleable: {
      type: Boolean,
      default: true
    },
    addForm: {
      type: Boolean,
      default: false
    },
    inline: {
      type: Boolean,
      default: false
    },
    noApply: {
      type: Boolean,
      default: false
    },
    show: {
      type: Boolean,
      default: true
    }
  },

  data() {
    return {
      emited: false,
      fileUploads: {}
    }
  },

  created() {
    if (this.customSave || this.apply === null || this.noApply) {
      return
    }
    formBus.emit('form-methods', this)
  },
  mounted() {
    if (!this.addForm) {
      this._emitTitle(this.title)
    }
  },
  unmounted() {
    formBus.emit('remove-form-methods', this)
  },
  methods: {
    getData() {
      return this.$refs.form.getFieldsData()
    },
    validate(addForm = false) {
      if ((addForm && this.addForm) || (!addForm && !this.addForm)) {
        return this.$refs.form.validate()
      }
      return { valid: true }
    },
    setValid(valid) {
      this.$refs.form.setValid(valid)
    },
    _emitTitle(title) {
      if (!this.emited) {
        this.setModalTitle(title)
        this.emited = true
      }
    }
  }
}
</script>
