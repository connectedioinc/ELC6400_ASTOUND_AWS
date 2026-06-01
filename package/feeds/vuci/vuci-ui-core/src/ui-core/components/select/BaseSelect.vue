<template>
  <SelectRoot
    :id="props.id"
    v-slot="{ open }"
    v-model="model"
    :options="finalOptions"
    :disabled="props.disabled"
    :readonly="props.readonly"
    :multiple="props.multiple"
    @close="onClose"
  >
    <SelectTrigger
      :data-readonly="dataAttribute(props.readonly)"
      :data-disabled="dataAttribute(props.disabled)"
      :data-state="optionalAttribute(props.state)"
      :class="['field field-select', open && 'field-select--focused']"
    >
      <SelectValue
        v-slot="{ selected }"
        class="field-select__control"
        :placeholder="props.placeholder"
      >
        <template v-if="props.multiple">
          <div
            v-for="(option, index) in selected"
            ref="tags"
            :key="option.textContent"
            :class="['field-select__value-tag', firstHidden > -1 && index >= firstHidden && 'absolute invisible -z-10']"
          >
            <slot
              name="tag"
              :option="option"
            >
              {{ option.textContent }}
            </slot>
            <button
              type="button"
              @pointerdown.stop.prevent="
                event => {
                  if (event.button === 0 && event.ctrlKey === false) {
                    removeValue(option.value)
                  }
                }
              "
            >
              <TltIcon
                icon="x"
                class="size-4"
              />
            </button>
          </div>
          <div
            ref="hiddenChipCount"
            class="whitespace-nowrap"
            :class="{ invisible: firstHidden < 0 }"
          >
            {{ firstHidden === 0 ? $t('%s item(s) selected').format((model as string[]).length) : `+${(model as string[]).length - firstHidden} ${$t('more')}...` }}
          </div>
        </template>
      </SelectValue>
      <div class="field__addon">
        <TltIcon
          aria-hidden="true"
          icon="dropdown-arrow"
          :class="open ? 'rotate-180' : ''"
          class="transition-transform"
        />
      </div>
    </SelectTrigger>
    <SelectListbox
      v-slot="{ options: listboxOptions, id }"
      class="field-select__listbox"
    >
      <SelectListboxItem
        v-if="listboxOptions.length > 5"
        :id="`${id}--search-wrapper`"
        class="field-select__listbox-item"
        @focusin="onSearchFocus"
      >
        <!-- tabindex -1 because items inside listbox should not be focusable with tab (per spec) -->
        <InputText
          :id="`${id}--search`"
          v-model="search"
          aria-label="search"
          tabindex="-1"
          @keydown.space.stop
        >
          <template #leading>
            <InputAddon>
              <TltIcon icon="search" />
            </InputAddon>
          </template>
          <template
            v-if="search.length > 0"
            #trailing
          >
            <InputAddon
              as="button"
              aria-label="clear search"
              @click="search = ''"
            >
              <TltIcon
                icon="x-circle"
                class="size-full"
              />
            </InputAddon>
          </template>
        </InputText>
      </SelectListboxItem>
      <SelectItem
        v-for="item in filterBySearch(listboxOptions)"
        v-slot="{ selected }"
        :key="item.textContent"
        v-bind="item"
        class="field-select__listbox-item flex gap-2 items-center"
      >
        <CheckboxControl
          v-if="props.multiple"
          role="presentation"
          tabindex="-1"
          :checked="selected"
          class="shrink-0"
        />
        <div class="truncate min-w-0">
          {{ item.textContent }}
        </div>
      </SelectItem>
      <SelectListboxItem
        v-if="props.allowCreate"
        :id="`${id}--custom-value-wrapper`"
        class="field-select__listbox-item"
        @focusin="onCustomFocus"
      >
        <FieldRoot
          v-slot="{ valid }"
          v-model="custom"
          sr-label="custom option"
          class="flex justify-between gap-4"
          :rules="customAddRules"
          standalone
        >
          <FieldControl v-slot="{ modelValue, updateModelValue, ...attrs }">
            <div class="relative w-full">
              <input
                :id="`${id}--custom-value`"
                type="text"
                placeholder="Add custom option"
                :data-state="attrs.state"
                class="border-b w-full outline-none focus:border-b-blue-500 data-[state=error]:border-theme-border-danger data-[state=error]:pr-8 pl-1 pb-2 placeholder:italic placeholder-shown:text-theme-text-subtle"
                tabindex="-1"
                :value="modelValue"
                @input="e => updateModelValue((e.target as HTMLInputElement).value)"
                @keydown.enter="addCustom"
              />
              <FieldMeta
                class="z-60"
                placement="bottom-start"
                :fallback-placements="['top-start']"
              >
                <template #trigger>
                  <button
                    type="button"
                    class="absolute right-0"
                  >
                    <TltIcon
                      id="lalala"
                      icon="error"
                      class="text-theme-text-danger"
                    />
                  </button>
                </template>
              </FieldMeta>
            </div>
          </FieldControl>

          <BaseButton
            :disabled="!custom.length || !valid.value"
            @click="addCustom"
          >
            {{ $t('Add') }}
          </BaseButton>
        </FieldRoot>
      </SelectListboxItem>
    </SelectListbox>
  </SelectRoot>
</template>

<script setup lang="ts" generic="T">
import type { FieldState } from '@components/shared-types'
import { SelectRoot, SelectTrigger, SelectListbox, SelectItem, SelectValue, type SelectRootProps } from './index'
import type { SelectOption } from './use-select'
import { isArray, isBoolean, isString } from '@ui-core/utils/inspect'
import SelectListboxItem from './SelectListboxItem.vue'
import { nextTick, useTemplateRef, watch, computed, ref } from 'vue'
import TltIcon from '@ui-core/tlt-design/icons/TltIcon.vue'
import CheckboxControl from '@components/checkbox/CheckboxControl.vue'
import BaseButton from '../button/BaseButton.vue'
import { dataAttribute, optionalAttribute } from '@ui-core/utils/attributes'
import InputText from '../input/InputText.vue'
import InputAddon from '../input/InputAddon.vue'
import { FieldControl, FieldMeta, FieldRoot } from '../field'
import type { ValidationRule } from '@ui-core/composables/useValidation'

type SelectOptionTuple<T> = [value: T, textContext: string, disabled?: boolean]

type Props<T> = Omit<SelectRootProps<T>, 'options'> & {
  options: SelectRootProps<T>['options'] | SelectOptionTuple<T>[] | string[]
  state?: FieldState
  placeholder?: string
  /**
   * @default false
   */
  allowCreate?: boolean | ValidationRule[] | ValidationRule
}

const props = withDefaults(defineProps<Props<T>>(), {
  disabled: false,
  state: undefined,
  id: undefined,
  required: false,
  readonly: false,
  placeholder: undefined,
  allowCreate: false,
  options: () => []
})
const model = defineModel<T>({ default: undefined })
const search = ref('')
const _custom = ref('')
const custom = computed({
  get() {
    return _custom.value || search.value
  },
  set(value) {
    _custom.value = value
  }
})

const customOptions = ref<SelectOption[]>([])
const customAddRules = computed(() => {
  if (!props.allowCreate || isBoolean(props.allowCreate)) return []
  return props.allowCreate
})

const finalOptions = computed<SelectOption<T>[]>(() => props.options.concat(customOptions.value).map(toSelectOption))

function addCustom() {
  if (props.disabled || props.readonly) return
  const option: SelectOption = { textContent: custom.value, value: custom.value }
  customOptions.value.push(option)
  custom.value = ''
}

function removeValue(value: T) {
  if (isArray(model.value)) model.value = model.value.filter(v => v !== value) as T
}

function filterBySearch(options: SelectOption[]): SelectOption[] {
  if (!search.value) return options
  const term = search.value.toUpperCase()
  return options.filter(o => o.textContent.toUpperCase().includes(term))
}

function onSearchFocus(e: FocusEvent) {
  e.preventDefault()
  const el = (e.target as HTMLElement)!.querySelector('input') as HTMLElement
  el?.focus()
}

function onCustomFocus(e: FocusEvent) {
  e.preventDefault()
  if (e.target instanceof HTMLElement) {
    const el = e.target
    el.querySelector('input')?.focus()
  }
}

function onClose() {
  search.value = ''
  custom.value = ''
}

const firstHidden = ref<number>(-1)
const tags = useTemplateRef('tags')
const moreElements = useTemplateRef('hiddenChipCount')

if (props.multiple) {
  watch(() => [tags.value, model.value], updateFirstHidden, { flush: 'post' })
}

function updateFirstHidden() {
  firstHidden.value = -1
  nextTick(setHiddenIndex)
}

function setHiddenIndex() {
  const _tags = tags.value || []
  const overflowing = _tags.findIndex(e => isOverflowing(e as HTMLElement)) > -1
  if (!overflowing) return (firstHidden.value = -1)
  firstHidden.value = _tags.findIndex(e => isOverflowing(e, moreElements.value?.offsetWidth))
}

function isOverflowing(element: HTMLElement, offset: number = 0) {
  const elWidth = element.offsetLeft + element.offsetWidth + offset
  const parent = element.offsetParent as HTMLElement
  return elWidth > parent.offsetWidth
}

function toSelectOption<T>(tupleOrOption: SelectOptionTuple<T> | SelectOption<T> | string): SelectOption<T> {
  if (isArray(tupleOrOption)) return { value: tupleOrOption[0], textContent: tupleOrOption[1], disabled: !!tupleOrOption[2] }

  if (isString(tupleOrOption)) return { value: tupleOrOption, textContent: tupleOrOption, disabled: false } as SelectOption<T>

  return tupleOrOption
}
</script>
