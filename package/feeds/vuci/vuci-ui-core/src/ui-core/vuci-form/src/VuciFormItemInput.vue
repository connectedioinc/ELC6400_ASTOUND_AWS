<template>
  <vuci-form-item-template
    v-show="showOption"
    ref="form-model-item"
    :class="className"
    :style="style"
    v-bind="{ ...VuciFormItemTemplateProps, ...validationRules }"
  >
    <template
      v-if="$slots.help"
      #help
    >
      <slot name="help" />
    </template>
    <template
      v-if="$slots.hintBox"
      #hintBox
    >
      <slot name="hintBox" />
    </template>
    <template
      v-if="$slots['after-content']"
      #after-content="props"
    >
      <slot
        name="after-content"
        v-bind="props"
      />
    </template>
    <component
      :is="is"
      v-bind="attrs"
      class="x-input-wrapper"
      :model-value="model"
      :placeholder="placeholder"
      :readonly="readOnly"
      :maxlength="maxlength"
      :width="width"
      :can-randomize="!isSensitive && canRandomize"
      @update:model-value="onModelValueUpdate"
    >
      <template #password-toggle="{ disabled: passwordDisabled, toggleHidden, hidden }">
        <tlt-button
          ref="toggleTrigger"
          class="text-inherit"
          type="text"
          color="secondary"
          :disabled="passwordDisabled || isSensitive"
          @click="toggleHidden"
        >
          <tlt-icon
            icon="password"
            :hide="hidden"
            class="size-5"
          />
        </tlt-button>
        <tlt-popover
          v-if="isSensitive"
          placement="bottom-start"
          :target="() => $refs.toggleTrigger?.$el"
          :title="$t('Unable to read sensitive information')"
        >
          {{ $t('This information is sensitive, and you do not have access to read it. The current value will be cleared once it is edited.') }}
        </tlt-popover>
      </template>
      <template
        v-if="$slots.before"
        #before
      >
        <slot name="before" />
      </template>
      <template
        v-if="$slots.after"
        #after
      >
        <slot name="after" />
      </template>
    </component>
  </vuci-form-item-template>
</template>

<script>
import { copy } from '@ui-core/utils/vue-helpers'
import { makeProps } from '@ui-core/utils/props'
import VuciFormItemMixin from './VuciFormItemMixin'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'

export default {
  name: 'VuciFormItemInput',
  mixins: [VuciFormItemMixin, tltValidationMixin],
  provide() {
    return {
      useAutocomplete: this.useAutocomplete
    }
  },
  inheritAttrs: false,
  props: makeProps({
    sensitive: [Boolean, false],
    placeholder: [String, ''],
    password: [Boolean, false],
    maxlength: [String, '4096'],
    useAutocomplete: [Boolean, false],
    width: [String, ''],
    canRandomize: [[Boolean, Object], false]
  }),
  data() {
    const { style, class: className, ...rest } = this.$attrs
    return {
      attrs: rest,
      style,
      className
    }
  },
  computed: {
    isSensitive() {
      return this.password && this.sensitive && this.$session.hideSensitive()
    },
    is() {
      if (this.password) return 'tlt-input-password'
      return 'tlt-input'
    }
  },
  methods: {
    _save(data) {
      // using uciSection[this.name] instead of this.model to get the value
      // in cases where item get's destroyed and his computed getter/setter just caches the value (even if it was changed)
      const modelValue = this.$.isUnmounted ? this.convertUciValue(this.uciSection?.[this.name] || '') : this.model
      let savedValue = this.save ? this.save?.(this, data) || this.save : modelValue
      if (this.isSensitive) {
        this.uciSection[`${this.name}:set`] = savedValue ? '1' : '0'
      }
      this.setInitialValue(modelValue)
      return savedValue
    },
    modelWatcher(newVal, oldVal) {
      this.changed = this.changed || this.initialValue !== this.model
      this.emitChange(newVal, oldVal)
    },
    onModelValueUpdate(value, event) {
      if (this.isSensitive && !this.changed) {
        this.model = event.data || ''
      } else this.model = value
    },
    setInitialValue(value) {
      if (this.isSensitive) {
        value = this.uciSection[`${this.name}:set`] === '1' ? '********' : ''
      }
      this.tempValue = this.isEmpty(value) ? this.convertUciValue(this.initial) : copy(value)
      if (this.visible) this.model = copy(this.tempValue)
      this.initialValue = copy(value)
    }
  }
}
</script>
