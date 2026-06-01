<template>
  <div
    :id="inputId"
    ref="input"
    role="button"
    class="tlt-input-wrapper focus-visible:outline-1 focus-visible:outline-theme-border-primary"
    :class="{ 'focus-visible:outline-theme-border-primary!': readOnly }"
    :test-id="`selectwrapper-${elementId || $attrs.id}`"
    :data-open="`${open}`"
    @click="_toggleOpen"
    @keydown="onControlKeydown"
  >
    <div
      :id="'select.' + inputId"
      :test-id="`selectstate-${elementId || $attrs.id} selectedid-${selected?.key}`"
      :aria-readonly="readOnly"
      :custom="custom"
      class="tlt-input-field py-0! text-left md:w-full whitespace-nowrap text-ellipsis overflow-x-hidden min-w-0 relative flex items-center"
      :class="{ 'text-theme-text-secondary-subtle': !itemValue, 'with-fade': fadeOverflow }"
      :data-state="inputState"
      :disabled="disabled"
      tabindex="0"
    >
      <div
        :test-id="`input-${elementId || $attrs.id}`"
        class="overflow-x-hidden text-ellipsis"
      >
        <slot
          name="selectedOption"
          :selected="shownItems.find(v => v.key === selected?.key && v.value === selected?.value) || selected || {}"
        >
          {{ selected?.value || defaultPlaceholder }}
        </slot>
      </div>
      <div
        v-if="icon"
        class="tlt-input-before"
      >
        <tlt-icon
          :icon="icon"
          class="transition-transform duration-300"
        />
      </div>
    </div>
    <div class="tlt-input-after">
      <tlt-icon
        icon="dropdown-arrow"
        :class="{ 'rotate-180': open }"
        class="transition-transform duration-300 size-5"
      />
    </div>
    <tlt-select-option-list
      v-slot="{ options }"
      ref="optionsList"
      :test-id="`selectwrapper-${elementId || $attrs.id}-listbox`"
      :items="shownItems"
      :allow-create="allowCreate"
      :open="open"
      :target="() => $refs.input"
      :disable-teleport="disableTeleport"
      :virtualized="virtualized"
      :class="{ 'cursor-default': disableTeleport }"
      @search="_setActiveOption(0)"
      @keydown="onControlKeydown"
      @select-custom="_selectCustomValue"
      @click-outside="open = false"
    >
      <!-- @click-outside cannot be toggleOpen since on double clicks this might be invoked twice and reopen select list. -->
      <tlt-select-option
        v-for="option in options"
        :key="option.value"
        ref="selectOptions"
        :is-active="activeOption.index === option.index"
        :is-disabled="_isDisabled(option)"
        :model-value="selected"
        :option="option"
        @update:model-value="open && _selectInput(option)"
        @mousemove="_setActiveOption(option.index, $event)"
      >
        <slot
          name="option"
          :option="option"
        >
          <tlt-overflow-hint
            :interactive="false"
            type="icon"
          >
            {{ option.value }}
          </tlt-overflow-hint>
        </slot>
      </tlt-select-option>
    </tlt-select-option-list>
  </div>
</template>

<script>
/**
 * @typedef {object} SelectOption
 * @prop {any} key - value of the option
 * @prop {string} value - label of the option
 * @prop {boolean} [depend] = true - condition when the option should be shown.
 * @prop {number} [index] - index of the option in the original datasource
 */
import { isUndefined } from '@ui-core/utils/inspect'
import tltDependMixin from '../tltDependMixin.vue'
import { useCommonInjects as useInputInjects } from '../_shared/useCommonInjects'

export default {
  name: 'TltSelect',
  mixins: [tltDependMixin],
  inject: {
    sid: {
      default: null
    },
    datatype: {
      default: null
    }
  },
  props: {
    icon: {
      type: String,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    },
    /** @type {import('vue').PropType<SelectOption[]>} */
    dataSource: {
      type: Array,
      default: () => []
    },
    modelValue: {
      type: [Number, String, Array],
      default: null
    },
    allowCreate: {
      type: [Boolean, Array],
      default: false
    },
    disabledOptions: {
      type: Array,
      default: () => []
    },
    readonly: {
      type: Boolean,
      default: null
    },
    placeholder: {
      type: String,
      default: ''
    },
    fadeOverflow: {
      type: Boolean,
      default: false
    },
    disableTeleport: {
      type: Boolean,
      default: false
    },
    /**
     * Enable virtual scrolling for better performance with large lists
     * Disable when options have dynamic heights (e.g. word wrap)
     * @default true
     */
    virtualized: {
      type: Boolean,
      default: true
    }
  },
  emits: ['open', 'close', 'update:modelValue'],
  setup() {
    return useInputInjects()
  },
  data() {
    return {
      localValue: null,
      itemValue: '',
      activeOption: {
        index: 0,
        id: ''
      },
      currentId: '',
      custom: {
        value: '',
        focused: false
      },
      selected: null,
      open: false
    }
  },
  computed: {
    inputId() {
      return this.itemId || this.$.uid
    },
    shownItems() {
      return this.dataSource.filter(item => this.isVisible(item.depend))
    },
    readOnly() {
      return this.readonly ?? this.$store.readOnlyPage
    },
    defaultPlaceholder() {
      if (this.shownItems.length === 0) {
        return this.$t('-- No options available --')
      }
      return this.placeholder
    }
  },
  watch: {
    shownItems() {
      this._setSelected()
    },
    modelValue: {
      immediate: true,
      handler(currValue) {
        this._setSelected()
        const activeOptionIndex = this.shownItems.findIndex(option => option.key === currValue)
        this._setActiveOption(activeOptionIndex)
      }
    },
    open(open) {
      if (open) {
        this.$emit('open')
        let index = this.shownItems.findIndex(option => option.key === this.selected.key)
        index = index > -1 ? index : 0
        this.$nextTick(() => {
          this._setActiveOption(index)
        })
      } else {
        this.$emit('close')
        this.activeOption.index = -1
        this.activeOption.id = ''
      }
    },
    dataSource() {
      this._setSelected()
    },
    disabledOptions() {
      this._setSelected()
    },
    'custom.value'(val) {
      if (val.length > 0) this.activeOption.index = -1
    }
  },
  methods: {
    /**
     * @param {KeyboardEvent} event
     */
    onControlKeydown(event) {
      const { index } = this.activeOption

      switch (event.key) {
        case 'ArrowUp': {
          return this._setActiveOption(index - 1, event)
        }
        case 'ArrowDown': {
          return this._setActiveOption(index + 1, event)
        }
        case 'Enter':
        case ' ': {
          event.preventDefault()
          return this._selectOption(index)
        }
        case 'Escape':
        case 'Tab': {
          this.open = false
        }
      }
    },
    _toggleOpen(event) {
      if (event && event.composedPath().includes(this.$refs.optionsList.$el)) return
      if (this.shownItems.length === 0 || this.readOnly || this.disabled) return
      this.open = !this.open
    },
    /**
     * Selects provided option. Does not select it, if option is disabled.
     * @param {number} index
     */
    _selectOption(index) {
      if (!this.open) return this._toggleOpen()

      const option = this.$refs.optionsList.virtualOptions.find(option => option.index === index)

      if (isUndefined(option) || option < 0) return this._selectNotDisabledOption()
      if (this._isDisabled(option)) return

      this._selectInput(option)
    },
    /**
     * @param {number} newValue index of active option
     * @param {MouseEvent} event
     */
    async _setActiveOption(newValue, event) {
      // mousemove ignore without debouncing the function
      if (newValue === this.activeOption.index) return
      event?.preventDefault()
      if (!this.open || this.shownItems.length === 0) return

      if (newValue < 0) {
        this.activeOption.index = 0
        return
      }

      const options = this.$refs.optionsList.filteredOptions || []
      if (!options.length) return

      this.activeOption.index = newValue >= options.length ? options.length - 1 : newValue
      this.activeOption.id = `${this.inputId}-select-${this.shownItems[this.activeOption.index].key}`

      if (event?.type === 'mousemove') return

      await this.$nextTick()

      const active = this.$refs.selectOptions?.find(option => option.isActive)
      if (!active) {
        this.$refs.optionsList?.scrollTo(this.activeOption.index)
        return
      }

      active.$el?.scrollIntoView({
        block: 'nearest'
      })
    },
    /**
     * @param {SelectOption} option
     * @return {boolean}
     */
    _isDisabled(item) {
      return this.disabledOptions.some(disabledItem => disabledItem.key === item.key)
    },
    /**
     * Selects provided option value.
     * @param {SelectOption} option
     */
    _selectInput(option) {
      this.itemValue = option?.value
      this.selected = option
      this._toggleOpen()
      this.$emit('update:modelValue', this.selected.key)
    },
    _clearFiltered() {
      this.itemValue = this.selected.value
    },
    /**
     * @param {SelectOption & {preventDefault: () => void}} option
     */
    _selectCustomValue(option) {
      this.open = false
      const value = option.key.toLowerCase()
      const definedValue = this.shownItems.find(i => i.key.toLowerCase() === value) ?? option
      // if you search for value and enter his key, instead of label, you might be able to select disabled/readonly values, thats why this check is needed
      if (definedValue && this._isDisabled(definedValue)) {
        option.preventDefault()
        return this.$message.error(this.$t('Value could not be selected.'))
      }
      this.$emit('update:modelValue', option.key)
      this.selected = definedValue
      this.itemValue = definedValue.value
    },
    _selectNotDisabledOption() {
      const el = this.shownItems.find(item => !this._isDisabled(item))
      if (!el) {
        this.itemValue = null
        this.selected = {}
        return
      }
      this.selected = el
      this.itemValue = el.value
      this.$emit('update:modelValue', el.key)
    },
    /**
     * @description Create select option and select value, from user input
     * @param value - User provided value
     */
    _setAllowCreateValues(value) {
      this.itemValue = value
      this.selected = { key: value, value }
    },
    /**
     * @description Function is used to select value then no datasource is provided
     * @param value - User provided value
     */
    _selectEmptyDataValue(value) {
      if (this.allowCreate) {
        this._setAllowCreateValues(value)
      } else {
        this.itemValue = null
        this.selected = {}
      }
    },
    /**
     * @description Function is used to select value when no matched element is found in datasource
     * @param value - User provided value
     */
    _selectNoMatchValue(value) {
      if (this.allowCreate) {
        this._setAllowCreateValues(value)
      } else {
        this._selectNotDisabledOption()
      }
    },
    _setSelected() {
      if (this.modelValue === null || this.modelValue === '') {
        this._selectNotDisabledOption()
        return
      }
      if (this.shownItems.length === 0) {
        this._selectEmptyDataValue(this.modelValue)
        return
      }
      const matchedElement = this.shownItems.find(x => x.key === this.modelValue)
      if (!matchedElement) {
        this._selectNoMatchValue(this.modelValue)
        return
      }
      if (this._isDisabled(matchedElement)) {
        this._selectNotDisabledOption()
        return
      }
      this.itemValue = matchedElement.value
      this.selected = { key: matchedElement.key, value: matchedElement.value }
    }
  }
}
</script>

<style scoped>
.with-fade::before {
  content: ' ';
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  --fade-clr: 255, 255, 255;
  width: 6rem;
  pointer-events: none;
  background-image: linear-gradient(to left, rgba(var(--fade-clr)), rgb(255, 255, 255, 0));
}
</style>
