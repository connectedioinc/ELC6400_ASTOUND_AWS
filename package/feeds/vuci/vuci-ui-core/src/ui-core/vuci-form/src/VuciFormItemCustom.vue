<template>
  <vuci-form-item-template
    v-show="showOption"
    class="items-start!"
    :class="{ 'with-headers': headers }"
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
    <tlt-form-model
      ref="form-model"
      tag="ul"
      class="flex md:w-max flex-col gap-2"
      :test-id="`custom-inputs-${name}`"
    >
      <li
        v-for="(rowValues, rowIndex) in modelValues"
        :key="rowIds[rowIndex]"
        class="flex gap-2 list-row items-center"
        :class="headers && 'list-row__with-headers'"
      >
        <div
          class="max-w-xs w-full border-theme-border-base rounded-none ml-2 md:ml-0 md:grid flex flex-col gap-2 list-row__control"
          :class="[layout && 'md:grid md:grid-cols-6']"
          :style="
            !layout && {
              'grid-template-columns': `repeat(${components.length}, minmax(0,1fr))`
            }
          "
        >
          <div
            v-for="(component, columnIndex) in components"
            :key="`${rowIds[rowIndex]}-${columnIndex}`"
            class="min-w-0"
            :class="[layout && layoutClasses[columnIndex]]"
          >
            <div
              v-if="headers?.[columnIndex]"
              class="truncate mb-1"
            >
              {{ headers[columnIndex] }}
            </div>
            <slot
              :name="`input-${component}`"
              :key-value="columnIndex"
              :row-values="rowValues"
              :row-id="rowIds[rowIndex]"
              :row="rowIndex"
              :column="columnIndex"
              :props="inputProps[columnIndex]"
              :set-value="v => (rowValues[columnIndex] = v)"
              :values="modelValues"
              :value="rowValues[columnIndex]"
            >
              <component
                :is="`tlt-form-item-${component}`"
                :key="columnIndex"
                v-model="rowValues[columnIndex]"
                v-bind="inputProps[columnIndex]"
                class="custom-input md:w-full min-w-0! block!"
                :prop="getInputProp(inputProps[columnIndex], rowIndex)"
                @change="component === 'select' ? _unitChange(rowValues[columnIndex]) : () => {}"
                @open="selectOpen++"
                @close="selectOpen--"
              />
            </slot>
          </div>
        </div>
        <template v-if="allowCreate">
          <div
            class="flex items-center list-row__actions"
            :class="{ 'mt-6': headers }"
          >
            <div class="h-8 flex gap-2 items-center">
              <button
                v-show="modelValues.length === rowIndex + 1 && (!maxlines || modelValues.length < maxlines)"
                :test-id="`listadd-${name}`"
                class="text-theme-text-primary disabled:text-theme-text-subtle disabled:cursor-not-allowed h-min"
                :disabled="$store.readOnlyPage"
                @click="_addField()"
              >
                <tlt-icon
                  class="size-6"
                  icon="add-circle"
                />
              </button>
              <button
                v-show="modelValues.length > 1"
                :test-id="`listremove-${name}_${rowIndex}`"
                class="text-theme-text-danger disabled:text-theme-text-subtle disabled:cursor-not-allowed h-min"
                :disabled="$store.readOnlyPage"
                @click="_removeField(rowIndex)"
              >
                <tlt-icon
                  class="size-6"
                  icon="remove-circle"
                />
              </button>
            </div>
          </div>
        </template>
      </li>
    </tlt-form-model>
  </vuci-form-item-template>
</template>

<script>
import { createRollingId } from '@/plugins/utils'
import VuciFormItemMixin from './VuciFormItemMixin'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'
import { makeProps } from '@ui-core/utils/props'

export default {
  name: 'VuciFormItemCustom',
  mixins: [VuciFormItemMixin, tltValidationMixin],
  props: makeProps({
    layout: [Array, null],
    inputProps: [Array, () => [{}, {}]],
    writeParse: [Function, i => i.toString()],
    loadParse: [Function, i => i],
    headers: [Array, null],
    inputs: [String, null, true],
    allowCreate: [Boolean, false],
    rules: [[String, Function, Array], 'string'],
    separator: [String, ','],
    maxlines: [Number, 0]
  }),
  emits: ['changedUnit'],
  data() {
    return {
      nextId: createRollingId(),
      rowIds: [],
      modelValues: [],
      selectOpen: 0
    }
  },
  computed: {
    components() {
      return this.inputs.split(',')
    },
    layoutClasses() {
      const sizes = {
        sm: 'col-span-2',
        md: 'col-span-3',
        base: 'col-span-4',
        lg: 'col-span-full'
      }
      if (this.layout) {
        return this.components.map((_, i) => sizes[this.layout[i]])
      }
      return null
    }
  },
  watch: {
    modelValues: {
      deep: true,
      handler(values) {
        this.model = this.getModelValue(values)
      }
    },
    selectOpen(value) {
      this.preventMessages = value > 0
    }
  },
  created() {
    const model = this._loadValues()
    const values = !this.allowCreate || !Array.isArray(model) ? [model] : model
    this.rowIds = values.map(this.nextId)
    this.setInitialValue(this.getModelValue(values))
    this.modelValues = values
  },
  methods: {
    getModelValue(values) {
      if (this.allowCreate) {
        return values.filter(value => value.every(val => val?.length > 0)).map(v => this.writeParse(v))
      }
      if (values[0].every(val => !val)) return
      return this.writeParse(values[0])
    },
    getInputProp(props, row) {
      return `${props.prop}-${row}`
    },
    _unitChange(unit) {
      this.$emit('changedUnit', unit)
    },
    _addField() {
      const values = this.inputProps.map(input => ('initial' in input ? input.initial : ''))
      this.rowIds.push(this.nextId())
      this.modelValues.push(values)
    },
    _removeField(index) {
      this.rowIds.splice(index, 1)
      this.modelValues.splice(index, 1)
    },
    async validate() {
      const assignToState = valid => {
        this.valid = valid
        return valid
      }

      if (!this.visible) return assignToState(true)
      if (this.maxlines > 0 && this.modelValues.length > this.maxlines) {
        const msg = this.$t('Only %s lines of values are allowed.').format(this.maxlines)
        this.$message.error(`${this.label}: ${msg}`)
        return assignToState(false)
      }
      const result = await this.$refs['form-model'].validate()
      return assignToState(result.valid)
    },
    _loadValues() {
      if (!this.model || (Array.isArray(this.model) && this.model?.length === 0)) {
        const initialValues = this.inputProps.map(input => input.initial || '')
        return this.allowCreate ? [initialValues] : initialValues
      }
      const values = this.loadParse(this.model)
      return this.allowCreate ? values.map(value => value.split(this.separator)) : Array.isArray(values) ? values : values.split(this.separator)
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.list-row.list-row__with-headers .list-row__control {
  @apply pb-3;
}
.list-row.list-row__with-headers:last-child .list-row__control {
  @apply pb-0;
}
.list-row.list-row__with-headers .list-row__actions {
  @apply mb-3;
}
.list-row.list-row__with-headers:last-child .list-row__actions {
  @apply mb-0;
}
.list-row:not(:last-child, :only-child) .list-row__control {
  @apply border-b;
}
.list-row:not(.list-row__with-headers, :last-child, :only-child) .list-row__control {
  @apply border-b-0;
}
.custom-input :deep(.x-input-wrapper, .tlt-input-wrapper) {
  @apply min-w-0;
}
@media (min-width: theme(--breakpoint-md)) {
  :deep(.form-item-label) {
    @apply mt-1.5;
  }
  .with-headers :deep(.form-item-label) {
    @apply mt-[1.875rem];
  }
  .custom-input :deep(.tlt-input-after) {
    @apply mr-1;
  }
}
</style>
