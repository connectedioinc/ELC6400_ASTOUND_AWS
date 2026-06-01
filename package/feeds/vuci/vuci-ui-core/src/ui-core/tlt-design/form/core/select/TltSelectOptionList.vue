<template>
  <Teleport
    to="body"
    :disabled="disableTeleport || !shouldTeleport"
  >
    <div
      v-show="isPositioned"
      ref="floating"
      class="z-30 w-full"
      :class="{ 'opacity-0': middlewareData.hide?.referenceHidden }"
      :style="{ ...floatingStyles }"
      v-bind="$attrs"
    >
      <tlt-flyout-transition
        @enter="$emit('enter')"
        @leave="
          () => {
            searchValue = ''
            $emit('leave')
          }
        "
        @after-leave="
          () => {
            shouldTeleport = false
            $emit('after-leave')
          }
        "
        @after-enter="$emit('after-enter')"
      >
        <div
          v-show="open"
          test-id="options-wrapper"
          class="bg-theme-bg-floating border border-theme-border-base rounded-sm pb-2 max-h-56 overflow-auto space-y-1 shadow-lg text-sm scroll-pt-14 scroll-pb-1"
          :class="{ 'pt-2': items.length <= 5 }"
          v-bind="virtualized ? containerProps : {}"
        >
          <div
            v-if="items.length > 5"
            class="px-3 pt-4 bg-theme-bg-floating mb-2 sticky top-0 left-0 z-10"
            @keydown="e => e.key !== ' ' && $emit('keydown', e)"
          >
            <tlt-input-search
              :id="`${itemId}-search`"
              ref="search"
              v-model="searchValue"
              class="search-input relative"
              @update:model-value="$emit('search', $event)"
              @input="customValue = searchValue"
            />
          </div>

          <ul v-bind="virtualized ? wrapperProps : {}">
            <slot
              :options="options"
              :filtered="searchValue.length > 0"
            />
          </ul>

          <div
            v-if="allowCreate"
            class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 items-end pl-4 pr-2"
          >
            <div
              class="flex border-b-1 border-theme-border-strong items-center overflow-hidden gap-2"
              :class="{
                '!border-theme-border-danger': !valid,
                '!border-theme-border-primary': valid && (customValue || searchValue)
              }"
            >
              <input
                v-model="customValue"
                :test-id="`selectoptioncustom-${elementId}`"
                class="w-full py-2 px-1 placeholder:italic outline-none"
                :class="{ '!border-theme-border-danger text-theme-text-danger': !valid }"
                :placeholder="$t('Add custom option')"
                @keydown.enter="selectCustomValue"
              />
              <tlt-icon
                v-show="errors.length"
                icon="error"
                class="text-theme-text-danger size-6 shrink-0 cursor-pointer"
                @mouseenter="showError = true"
                @mouseleave="showError = false"
              />
            </div>
            <tlt-button
              size="sm"
              :disabled="!valid || (!customValue && !searchValue)"
              button-id="add-custom"
              @click="selectCustomValue"
            >
              {{ $t('Add') }}
            </tlt-button>
            <TltPositioner
              v-if="allowCreate"
              v-slot="{ reference }"
              :auto-update-options="{ animationFrame: true }"
              :disabled="!showError"
              :target="() => $refs.floating"
              placement="bottom-start"
              :fallback-placements="['top-start']"
              class="z-60"
            >
              <BasePopover
                variant="error"
                :style="{ width: `${reference.offsetWidth}px` }"
              >
                <div class="flex gap-3 text-theme-text-danger font-semibold">
                  <tlt-icon
                    icon="error"
                    class="size-6 shrink-0"
                  />
                  <ul class="flex gap-3 text-theme-text-danger font-semibold text-sm flex-col">
                    <li
                      v-for="message in errors"
                      :key="message.message"
                    >
                      {{ message.message }}
                    </li>
                  </ul>
                </div>
              </BasePopover>
            </TltPositioner>
          </div>
        </div>
      </tlt-flyout-transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, nextTick, useTemplateRef } from 'vue'
import { useFloating, autoUpdate, offset, shift, flip, size, hide } from '@floating-ui/vue'
import { breakpointsTailwind, onClickOutside, useBreakpoints, useVirtualList } from '@vueuse/core'
import { getTarget } from '@ui-core/utils/dom'
import { useCommonInjects as useInputInjects } from '../_shared/useCommonInjects'
import type { SelectOption } from './TltSelect.vue'
import TltInputSearch from '@ui-core/tlt-design/form/core/tltInputSearch.vue'
import type { ValidationFunction } from '@/validation-rules'
import { useValidation } from '@ui-core/composables/useValidation'
import { isBoolean } from '@ui-core/utils/inspect'
import TltPositioner from '@ui-core/components/tooltip/TltPositioner.vue'
import BasePopover from '@ui-core/components/tooltip/BasePopover.vue'

export interface Props {
  open: boolean
  items: SelectOption[]
  allowCreate?: boolean | ValidationFunction[]
  target?: string | HTMLElement | (() => HTMLElement) | null
  disableTeleport?: boolean
  maxlength?: string | number
  minlength?: string | number
  optionHeight?: number
  /**
   * Enable virtual scrolling for better performance with large lists
   * Disable when options have dynamic heights (e.g. word wrap)
   * @default true
   */
  virtualized?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  target: null,
  allowCreate: false,
  maxlength: undefined,
  minlength: undefined,
  optionHeight: 36,
  virtualized: true
})

const emit = defineEmits<{
  enter: []
  leave: []
  'after-leave': []
  'after-enter': []
  search: [string]
  focus: [HTMLElement]
  'select-custom': [SelectOption & { preventDefault: () => void }]
  keydown: [KeyboardEvent]
  'click-outside': [MouseEvent]
}>()

const { elementId, itemId } = useInputInjects()

const search = ref<InstanceType<typeof TltInputSearch> | null>(null)
const searchValue = ref('')
const customValue = ref('')

const showError = ref(false)

const { valid, errors, validate } = useValidation(() => customValue.value || searchValue.value, {
  rules: isBoolean(props.allowCreate) ? [] : props.allowCreate,
  maxlength: Number(props.maxlength),
  minlength: Number(props.minlength)
})

function filterBySearch(collection: SelectOption[]) {
  return collection.filter(item => item.value.toUpperCase().indexOf(searchValue.value.toUpperCase()) > -1)
}

const filteredOptions = computed(() => filterBySearch(props.items))

const {
  list: virtualList,
  containerProps,
  wrapperProps,
  scrollTo: _scrollTo
} = useVirtualList(filteredOptions, {
  itemHeight: props.optionHeight
})

const options = computed(() => (props.virtualized ? virtualList.value.map(item => ({ ...item.data, index: item.index })) : filteredOptions.value.map((item, index) => ({ ...item, index }))))

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

const floating = useTemplateRef('floating')
const targetElement = computed(() => getTarget(props.target))
const { floatingStyles, middlewareData, update, isPositioned } = useFloating(targetElement, floating, {
  placement: 'bottom-end',
  middleware: () => [
    offset(4),
    flip({ fallbackPlacements: ['top-end'] }),
    shift(
      isMobile.value
        ? state => ({
            crossAxis: true,
            elementContext: 'reference',
            padding: -state.rects.reference.height
          })
        : {}
    ),
    size({
      apply({ rects, elements }) {
        Object.assign(elements.floating.style, {
          maxWidth: `${rects.reference.width}px`
        })
      }
    }),
    !isMobile.value ? hide() : (undefined as any)
  ]
})

const shouldTeleport = ref(false)
watchEffect(async () => {
  if (!props.open) return
  customValue.value = ''

  if (isPositioned.value) shouldTeleport.value = true
})

let autoUpdateCleanup = () => {}
let clickOutsideCleanup = () => {}
watchEffect(() => {
  if (!shouldTeleport.value || !targetElement.value || !floating.value) {
    autoUpdateCleanup()
    clickOutsideCleanup()
    return
  }
  autoUpdateCleanup = autoUpdate(targetElement.value, floating.value, update)
  clickOutsideCleanup = onClickOutside(floating, event => props.open && emit('click-outside', event), { ignore: [targetElement.value], controls: false })
})

function selectCustomValue() {
  const value = customValue.value || searchValue.value
  if (!validate(value)) return
  let prevent = false
  const customOption = { key: value, value, preventDefault: () => (prevent = true) }
  emit('select-custom', customOption)
  nextTick(() => {
    if (prevent) return
    customValue.value = ''
    searchValue.value = ''
    targetElement.value?.focus()
  })
}

function scrollTo(index: number) {
  _scrollTo(index)
  const container = containerProps.ref.value
  container?.scrollTo({ top: container.scrollTop - container.clientHeight / 2 + props.optionHeight })
}

defineExpose({
  filteredOptions,
  virtualOptions: options,
  scrollTo,
  $el: floating
})
</script>
