<template>
  <vuci-form-item-template
    v-if="showOption"
    ref="form-item"
    class="list-input"
    :test-id="`list-wrapper-${name}`"
    no-wrapper
  >
    <div
      v-for="(_, index) in listFields"
      :key="rowIds[index]"
      class="list-input__field"
      :style="{ marginTop: label === '' ? (index === 0 ? '' : '10px') : '' }"
    >
      <tlt-form-model-item
        ref="inputs"
        :element-id="`${name}_${index}`"
        :prop="`${prop}_${index}`"
        :rules="convertedRules"
        :warnings="warnings"
        :label="index === 0 ? label : ' '"
        :help="index === 0 ? help : ''"
        :rawhtml="rawhtml"
        :validator-hint="validatorHint"
        :maxlength="maxlength"
        :minlength="minlength"
        :required="required"
        :duplicates-validation="duplicatesValidation"
        :tlt-input="true"
        :input-value="model[index]"
      >
        <template
          v-if="index === 0 && $slots.help"
          #help
        >
          <slot name="help" />
        </template>
        <template
          v-if="$slots['after-content']"
          #after-content="slotProps"
        >
          <slot
            name="after-content"
            v-bind="slotProps"
          />
        </template>

        <slot
          :value="model[index]"
          :update-value="v => (model[index] = v)"
        >
          <component
            :is="type"
            :model-value="model[index]"
            :placeholder="placeholder"
            :data-source="convertedDataSource"
            :allow-create="allowCreate"
            :readonly="readOnly"
            @update:model-value="model = [...model.slice(0, index), $event, ...model.slice(index + 1)]"
          />
        </slot>
        <div class="flex">
          <div
            v-if="!readOnly"
            class="flex gap-2"
          >
            <button
              v-show="listFields.length === index + 1 && listFields.length < maxlines"
              class="disabled:cursor-not-allowed text-theme-text-primary"
              :test-id="`listadd-${name}_${index}`"
              :disabled="$store.readOnlyPage"
              @click="_addField()"
            >
              <tlt-icon
                class="size-6"
                icon="add-circle"
              />
            </button>
            <button
              v-show="model.length > 1"
              class="text-theme-text-danger disabled:cursor-not-allowed"
              :test-id="`listremove-${name}_${index}`"
              :disabled="$store.readOnlyPage"
              @click="_removeField(index)"
            >
              <tlt-icon
                class="size-6"
                icon="remove-circle"
              />
            </button>
          </div>
        </div>
      </tlt-form-model-item>
    </div>
  </vuci-form-item-template>
</template>

<script>
import { reactive } from 'vue'
import { makeProps } from '@ui-core/utils/props'
import VuciFormItemMixin from './VuciFormItemMixin.vue'
import tltValidationMixin from '@ui-core/tlt-design/form/core/tltValidationMixin'
import { isArray, isEmpty } from '@ui-core/utils/inspect'
import { copy } from '@ui-core/utils/vue-helpers'
import { createRollingId } from '@/plugins/utils'

export default {
  name: 'VuciFormItemList',
  mixins: [VuciFormItemMixin, tltValidationMixin],
  provide() {
    return {
      formData: this.formData
    }
  },
  props: makeProps({
    placeholder: [String, ''],
    maxlines: [Number, 100],
    initial: [Array, () => ['']],
    type: [String, 'tlt-input'],
    options: [[Object, Array, Function], () => ({})],
    allowCreate: [Boolean, false],
    save: [Function, null],
    allowDuplicates: [Boolean, false]
  }),
  data() {
    return {
      nextId: createRollingId(),
      /** @type {number[]} */
      rowIds: [],
      changed: false
    }
  },
  computed: {
    listFields() {
      return isEmpty(this.model) ? [''] : this.model
    },
    convertedDataSource() {
      const options = []
      if (this.type === 'tlt-select') {
        let propOptions = this.options
        if (typeof this.options === 'function') {
          propOptions = this.options(this.uciSection)
        }
        propOptions.forEach(o => {
          if (typeof o === 'string') {
            options.push({
              key: o,
              value: o
            })
          } else if (isArray(o)) {
            options.push({
              key: o[0],
              value: o[1],
              depend: o[2]
            })
          } else {
            options.push(o)
          }
        })
      }
      return options
    },
    duplicates() {
      if (this.allowDuplicates || !isArray(this.model) || this.model.length < 2) return []
      return this.model.filter((v, i) => this.model.includes(v, i + 1))
    },
    duplicatesValidation() {
      return {
        duplicates: this.duplicates,
        message: this.$t('No duplicate values allowed.')
      }
    },
    availableModel() {
      return isEmpty(this.model) || (isArray(this.model) && this.model.some(x => x.length === 0))
    }
  },
  watch: {
    showOption(value) {
      if (!value) {
        this.tempValue = this.isEmpty(this.model) ? this.convertUciValue(this.initialValue) : this.model
        if (this.rmempty) this.model = ['']
      } else {
        this.$nextTick(() => {
          if (this.availableModel) {
            this.model = this.isEmpty(this.tempValue) ? this.convertUciValue(this.uciSection?.[this.name] || '') : this.tempValue
          }
          this.registerInput()
        })
      }
    }
  },
  created() {
    const add = () => this.rowIds.push(this.nextId())
    this.model.forEach(add)
    if (!this.rowIds.length) add('')
  },
  methods: {
    setInitialValue(value) {
      this.tempValue = this.isEmpty(value) ? this.convertUciValue(this.initial) : copy(value)
      if (this.visible) this.model = copy(this.tempValue)
      this.initialValue = copy(value)
    },
    modelWatcher(curr, prev) {
      this._checkIfChanged() && this.emitChange(curr, prev)
    },
    initializeItem() {
      if (!this.visible) return
      this.registerInput()
    },
    _addField() {
      if (this.model.length < this.maxlines) {
        this.rowIds.push(this.nextId())
        this.model = [...this.model, '']
      }
    },
    _removeField(index) {
      this.model = this.model.filter((_, i) => i !== index)
      this.rowIds.splice(index, 1)
    },
    convertUciValue(value) {
      if (!value) return ['']
      return isArray(value) ? reactive(copy(value)) : value.split(/(\s+)/).filter(e => e.trim())
    },
    _checkIfChanged() {
      if (this.changed) return true
      // from VuciFormItemMixin.vue modelWatcher
      const hasChanged = typeof this.model === 'object' || typeof this.initialValue === 'object' ? JSON.stringify(this.model) !== JSON.stringify(this.initialValue) : this.initialValue !== this.model
      if (hasChanged) this.changed = true
      return this.changed
    },
    _save(data) {
      let savedValue = this.model
      if (typeof this.save === 'function') {
        savedValue = this.save(this, data)
      } else if (this.save) {
        savedValue = this.save
      }
      this.setInitialValue(this.model.filter(v => v !== ''))
      return savedValue
    },
    async validate() {
      const assignToState = valid => {
        this.valid = valid
        return valid
      }

      /** @type {any[]} */
      if (!this.showOption) return assignToState(true)
      const values = this.model
      if (values.length > this.maxlines) {
        const msg = this.$t('Only %s lines of values are allowed.').format(this.maxlines)
        this.$message.error(`${this.label}: ${msg}`)
        return assignToState(false)
      }
      await this.$nextTick()
      const validationPromises = (this.$refs.inputs || []).map(inputRef => inputRef.validate?.())
      const res = await Promise.all(validationPromises)
      return assignToState(!res.includes(false))
    }
  }
}
</script>
<style scoped>
@reference '@/theme.css';

table .list-input {
  @apply w-full;
}

.list-input__field :deep(.tlt-input-wrapper) {
  @apply min-w-0;
}

table .list-input__field {
  @apply last:mb-0;
}

.list-input__field {
  @apply mb-4 last:mb-0;
}
</style>
