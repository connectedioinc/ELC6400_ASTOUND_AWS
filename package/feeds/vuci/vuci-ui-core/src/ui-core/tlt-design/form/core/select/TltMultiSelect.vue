<template>
  <div
    ref="multiSelect"
    role="button"
    class="tlt-input-wrapper focus-visible:outline-1 focus-visible:outline-theme-border-primary"
    :class="{ 'focus-visible:outline-theme-border-primary!': readOnly }"
    :test-id="`multiselect-${elementId}`"
    :data-open="`${open}`"
    @click="_toggleOpen"
    @keydown.self="onControlKeydown"
  >
    <div
      v-if="icon || $slots.before"
      class="tlt-input-before"
    >
      <slot name="before">
        <tlt-icon
          class="size-5"
          :icon="icon"
        />
      </slot>
    </div>
    <div
      :id="inputId"
      class="tlt-input-field py-0 overflow-hidden flex items-center justify-between"
      :class="{ 'text-theme-text-secondary-subtle': !localValue.length, 'with-fade': fadeOverflow }"
      tabindex="0"
      :aria-readonly="readOnly"
      :aria-disabled="disabled"
      :data-state="inputState"
    >
      <div
        class="w-full flex flex-nowrap gap-1 items-center relative"
        :class="[icon ? 'max-w-72' : 'max-w-68', fadeOverflow && 'overflow-hidden']"
        test-id="tags-wrapper"
      >
        <div
          v-if="!localValue.length"
          class="leading-6 whitespace-nowrap"
        >
          {{ placeholder }}
        </div>
        <div
          v-for="(o, index) in localValue"
          :key="index"
          ref="chips"
          class="rounded-full border border-theme-border-strong py-0.5 px-2 flex shrink-0 gap-1"
          :class="{ 'absolute invisible -z-10': firstHidden > -1 && index >= firstHidden }"
          :test-id="`tag-${o.key}`"
        >
          <!-- @slot Slot used for custom option list and selected option display -->
          <slot
            name="tag"
            :tag="o"
          >
            {{ o.value }}
          </slot>
          <button
            class="size-5 disabled:pointer-events-none"
            :disabled="readOnly || disabled"
            @click.stop="_removeTag(index)"
          >
            <tlt-icon
              class="p-0.5 size-5 text-theme-border-strong"
              icon="x"
            />
          </button>
        </div>
        <div
          ref="hiddenChipCount"
          class="whitespace-nowrap rounded-full text-theme-text-subtle py-0.5 px-2 flex gap-1"
          :class="{ invisible: firstHidden < 0 }"
        >
          {{ firstHidden === 0 ? $t('%s item(s) selected').format(localValue.length) : `+${localValue.length - firstHidden} ${$t('more')}...` }}
        </div>
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
      v-slot="{ options, filtered }"
      ref="optionsList"
      :maxlength="maxlength"
      :minlength="minlength"
      :items="shownItems"
      :allow-create="allowCreate"
      :test-id="`multiselect-${elementId || $attrs.id}-listbox`"
      :open="open"
      :target="() => $refs.multiSelect"
      :disable-teleport="disableTeleport"
      :virtualized="virtualized"
      :class="{ 'cursor-default': disableTeleport }"
      @search="_setActiveOption(0)"
      @keydown="onControlKeydown"
      @select-custom="_addCustomTag"
      @click-outside="open = false"
    >
      <!-- @click-outside cannot be toggleOpen since on double clicks this might be invoked twice and reopen select list. -->
      <template v-if="hasSelectAll && !filtered">
        <li class="mx-2">
          <tlt-check-box
            ref="selectAll"
            class="p-2 rounded-lg hover:bg-theme-bg-hover cursor-pointer"
            :class="{ 'bg-theme-bg-hover': activeOption.id === 'select-all' }"
            :model-value="localValue.length > 0"
            :indeterminate="localValue.length > 0 && !allItemsSelected"
            @update:model-value="onSelectAllToggle"
          >
            {{ localValue.length > 0 ? $t('Deselect all') : $t('Select all') }}
          </tlt-check-box>
        </li>
        <hr class="mx-2" />
      </template>
      <tlt-select-option
        v-for="option in options"
        :key="option.value"
        ref="selectOptions"
        :is-active="activeOption.index === option.index"
        :is-disabled="_isDisabled(option)"
        :model-value="localValue"
        :option="option"
        @update:model-value="open && _updateOptions($event)"
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
 * @typedef {import('./TltSelect.vue').SelectOption} SelectOption
 */

/**
 * Multiple options select component.
 */
import tltDependMixin from '../tltDependMixin.vue'
import { isArray } from '@ui-core/utils/inspect'
import { useCommonInjects as useInputInjects } from '../_shared/useCommonInjects'

export default {
  name: 'TltMultiSelect',
  mixins: [tltDependMixin],
  provide() {
    return {
      itemId: this.inputId
    }
  },
  props: {
    disableTeleport: {
      type: Boolean,
      default: false
    },
    fadeOverflow: {
      type: Boolean,
      default: false
    },
    icon: {
      type: String,
      default: null
    },
    disabled: {
      type: Boolean,
      default: false
    },
    /**
     * Data array made of parent component options prop
     */
    dataSource: {
      type: Array,
      default: () => []
    },
    disabledOptions: {
      type: Array,
      default: () => []
    },
    /**
     * Defines possibility of adding custom option
     * @values true, false
     */
    allowCreate: {
      type: [Boolean, Array],
      default: false
    },
    /** @type {import('vue').PropType<SelectOption['key'][]>} */
    modelValue: {
      type: [Array, String],
      default: () => []
    },
    /**
     * Specifies that an input field is Read-Only
     * @values true, false
     */
    readonly: {
      type: Boolean,
      default: false
    },
    placeholder: {
      type: String,
      default: ''
    },
    /**
     * Whether selecting all options at once is available
     */
    hasSelectAll: {
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
      /** @type {SelectOption[]} */
      localValue: [],
      open: false,
      activeOption: {
        index: 0,
        id: ''
      },
      addedListeners: [],
      firstHidden: -1
    }
  },
  computed: {
    inputId() {
      return this.itemId || this.$.uid
    },
    shownItems() {
      const items = this.dataSource.filter(item => this.isVisible(item.depend))
      const customItems = this.localValue.filter(item => !this.dataSource.some(x => x.key === item.key))
      return [...items, ...customItems]
    },
    readOnly() {
      return this.readonly ?? this.$store.readOnlyPage
    },
    hasSearch() {
      return this.shownItems.length > 5
    },
    allItemsSelected() {
      return this.localValue.length === this.shownItems.filter(i => !this._isDisabled(i)).length
    }
  },
  watch: {
    open(open) {
      if (open) {
        this.$emit('open')
        let index = this.localValue.length > 0 ? this.shownItems.findIndex(option => this.modelValue.includes(option.key)) : 0
        index = index === -1 ? 0 : index
        this._setActiveOption(index)
      } else {
        this.$emit('close')
        this.activeOption.index = -1
        this.activeOption.id = ''
      }
    },
    localValue: {
      deep: true,
      handler() {
        this.updateFirstHidden()
      }
    }
  },
  mounted() {
    const resizeObserver = new ResizeObserver(this.updateFirstHidden)
    this.$nextTick(() => resizeObserver.observe(this.$el))
    this.$watch(
      vm => [vm.modelValue, vm.dataSource],
      () => {
        this._setupInputs()
      }
    )
  },
  created() {
    this._setupInputs()
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
    updateFirstHidden() {
      this.firstHidden = -1
      this.$nextTick(this.setHiddenIndex)
    },
    setHiddenIndex() {
      if (!this.$refs.chips || !this.$refs.hiddenChipCount) return
      const { chips, hiddenChipCount } = this.$refs
      const containerWidth = hiddenChipCount.parentElement.offsetWidth
      const hasOverflow = chips.findIndex(el => el.offsetLeft + el.offsetWidth > containerWidth) > -1
      if (!hasOverflow) return (this.firstHidden = -1)
      const hideFromIndex = chips.findIndex(el => el.offsetLeft + el.offsetWidth + hiddenChipCount.offsetWidth > containerWidth)
      this.firstHidden = hideFromIndex
    },
    onSelectAllToggle(selectAll) {
      if (selectAll) {
        this._updateOptions(this.shownItems.filter(i => !this._isDisabled(i)))
      } else {
        this._updateOptions([])
      }
    },
    /**
     * @param {SelectOption} option
     * @return {boolean}
     */
    _isDisabled(item) {
      return this.disabledOptions.some(disabledItem => disabledItem.key === item.key)
    },
    _toggleOpen(event) {
      if (event && event.composedPath().includes(this.$refs.optionsList.$el)) return
      if ((this.shownItems.length === 0 && !this.allowCreate) || this.readOnly || this.disabled) return
      this.open = !this.open
    },
    /**
     * Selects provided option. Does not select it, if optin is disabled.
     * @param {number} optionIndex
     */
    _selectOption(optionIndex) {
      if (!this.open) return this._toggleOpen()
      if (this.activeOption.id === 'select-all') return this.onSelectAllToggle(this.localValue.length === 0)

      if (optionIndex < 0 || optionIndex >= this.shownItems.length) return
      const optionRef = this.$refs.selectOptions?.find(opt => opt.option.index === optionIndex)
      optionRef?.$refs?.checkbox?.$el?.click()
    },
    async _setActiveOption(newValue, event) {
      // mousemove ignore without debouncing the function
      if (newValue === this.activeOption.index) return
      event?.preventDefault()

      if (!this.open) return
      if (newValue < 0) {
        this.activeOption.index = 0
        if (!this.$refs.selectAll) return

        this.activeOption.id = 'select-all'
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
     * Wrapper function to emit given values. Values defaults to this.localValue
     * @param {SelectOption[]} values
     */
    emitValues(values = this.localValue) {
      this.$emit(
        'update:modelValue',
        values.map(v => v.key)
      )
    },
    /**
     * Gets called on component create and on data array, model value, visible options change
     */
    _setupInputs() {
      this.localValue = (isArray(this.modelValue) ? this.modelValue : [this.modelValue])
        .filter(Boolean)
        .map(value => {
          const element = this.shownItems.find(x => x.key === value)
          if (element) return element
          if (this.allowCreate) return { key: value, value }
          if (import.meta.env.DEV)
            console.warn(
              `[TltMultiSelect]: found a value thats not being shown - "${value}"\nand this multi select does not allow creating values. Please re-check your options to prevent undesired behavior`
            )
          return undefined
        })
        .filter(Boolean)
    },
    /**
     * @param {SelectOption[]} values
     */
    _updateOptions(values) {
      this.localValue = values
      this.emitValues(values)
      this.$refs.multiSelect.focus()
    },
    /**
     * Remove tag from options list on mouse @click or keyboard @backspace events
     * @param {Number} index
     */
    _removeTag(index) {
      this.localValue.splice(index, 1)
      this.emitValues(this.localValue)
    },
    /**
     * @param {SelectOption & {preventDefault: () => void}} option
     */
    _addCustomTag(option) {
      const value = option.value.toLowerCase()
      const findValue = e => [e.key.toLowerCase(), e.value.toLowerCase()].includes(value)
      const hasValue = this.localValue.some(findValue)
      if (hasValue) {
        option.preventDefault()
        return this.$message.error(this.$t('This value is already selected'))
      }
      const definedValue = this.shownItems.find(findValue) ?? option
      if (this._isDisabled(definedValue)) {
        option.preventDefault()
        return this.$message.error(this.$t('Value could not be selected.'))
      }
      if (/\S/.test(definedValue.key)) {
        this.localValue.push(definedValue)
        this.emitValues(this.localValue)
        this._setActiveOption(this.shownItems.length)
      }
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
