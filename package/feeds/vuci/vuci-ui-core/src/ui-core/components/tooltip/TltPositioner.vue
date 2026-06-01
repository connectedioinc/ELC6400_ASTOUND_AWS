<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showFloating && triggerEl"
        v-bind="$attrs"
        ref="floating"
        :test-id="id ? `floating-${id}` : null"
        class="absolute z-30 positioner-wrapper"
        :style="{ ...floatingStyles, visibility: middlewareData?.hide?.referenceHidden ? 'hidden' : 'visible' }"
      >
        <slot
          :reference="referenceEl!"
          :triggers-reference="triggerEl!"
        />
        <div
          v-if="props.arrow"
          ref="arrowEl"
          aria-hidden="true"
          class="positioner-arrow absolute size-3 rotate-45 z-1"
          :style="arrowStyles"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useTemplateRef, computed, ref, watchEffect } from 'vue'
import { useFloating, autoUpdate, flip, offset, shift, hide, arrow as arrowMiddleware, type AutoUpdateOptions, type Placement } from '@floating-ui/vue'
import { useEventListener, useTimeoutFn, onClickOutside } from '@vueuse/core'
import { isNumber, isString } from '@ui-core/utils/inspect'

type PermutationArray<T, K = T> = [T] extends [never] ? [] : K extends K ? [K] | [K, ...PermutationArray<Exclude<T, K>>] : []
type Combination<T extends string[], All = T[number], Item = All> = Item extends string ? Item | `${Item} ${Combination<[], Exclude<All, Item>>}` : never
type Trigger = 'hover' | 'focus' | 'click'

type TriggersString = Combination<['hover', 'focus', 'click']>
type TriggersArray = PermutationArray<Trigger>

defineOptions({
  inheritAttrs: false
})

export type Props = {
  /**
   * unique id of the positioned element, used for accessibility
   */
  id?: string
  /**
   * forcefully shows positioned element when true (if not disabled), triggers can be empty
   * @default false
   */
  forceShow?: boolean
  /**
   * whether to render and show arrow
   */
  arrow?: boolean
  /**
   * after how long from first trigger should the slotted content be inserted.
   * @default 200
   */
  openDelay?: number
  /**
   * after how long from last trigger should the slotted content be removed once opened.
   * @default 150
   */
  closeDelay?: number
  /**
   * Virtual padding for the resolved overflow detection offset
   * @default 8
   */
  padding?: number
  /**
   * where to place the positioned element by default
   * @default 'right'
   */
  placement?: Placement
  /**
   * Placements to try sequentially if the preferred placement does not fit.
   * @default [oppositePlacement] (computed)
   */
  fallbackPlacements?: Placement[] | Placement | undefined
  autoUpdateOptions?: AutoUpdateOptions | undefined
  /**
   * Flag indicating when showing and calculating of position should be disabled. can be used instead of v-if. If setup's can be done but no floating element should be shown.
   * @default false
   */
  disabled?: boolean
  /**
   * Provide an array of triggers that will cause the slotted content to be shown.
   * @default ['hover', 'focus']
   */
  triggers?: TriggersArray | [] | TriggersString
  /**
   * The element that reacts to the triggers. If string is given it must be an id selector starting with `#`
   * @default target
   */
  triggersTarget?: HTMLElement | (() => HTMLElement) | string | unknown
  /**
   * to what element anchor the positioner. If string is given it must be an id selector starting with `#`
   */
  target: HTMLElement | (() => HTMLElement) | string | unknown
}

const props = withDefaults(defineProps<Props>(), {
  forceShow: false,
  openDelay: 200,
  closeDelay: 150,
  padding: 8,
  triggers: () => ['hover', 'focus'],
  triggersTarget: undefined,
  disabled: false,
  autoUpdateOptions: undefined,
  placement: 'right',
  fallbackPlacements: undefined,
  id: undefined
})

const floatingEl = useTemplateRef<HTMLElement>('floating')
const arrowEl = useTemplateRef<HTMLElement>('arrowEl')

const referenceEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLElement | null>(null)
watchEffect(
  () => {
    if (!props.target) {
      referenceEl.value = null
      triggerEl.value = null
      return
    }

    referenceEl.value = getTarget(props.target)

    if (!props.triggersTarget) triggerEl.value = referenceEl.value
    else triggerEl.value = getTarget(props.triggersTarget)
  },
  { flush: 'post' }
)

// #region Triggers
const activeReferenceTriggers = ref({
  hover: false,
  focus: false,
  click: false
})

const activeFloatingTriggers = ref({
  focus: false,
  hover: false
})

const hasActiveReferenceTriggers = computed(() => Object.values(activeReferenceTriggers.value).includes(true))
const hasActiveFloatingTriggers = computed(() => Object.values(activeFloatingTriggers.value).includes(true))

const hasActiveTriggers = computed(() => hasActiveReferenceTriggers.value || hasActiveFloatingTriggers.value)

const triggersArray = computed(() => {
  if (isString(props.triggers)) return props.triggers.split(' ') as Trigger[]
  return props.triggers
})

const canHover = computed(() => triggersArray.value.includes('hover'))
const canFocus = computed(() => triggersArray.value.includes('focus'))
const canClick = computed(() => triggersArray.value.includes('click'))

watchEffect(() => {
  if (!canHover.value) activeReferenceTriggers.value.hover = false
  if (!canFocus.value) activeReferenceTriggers.value.focus = false
  if (!canClick.value) activeReferenceTriggers.value.click = false
})
// #endregion

// #region Floating element display control
const showFloating = defineModel<boolean>('show', { default: false })

const { start: startOpen, stop: stopOpen } = useTimeoutFn(
  () => (showFloating.value = true),
  () => Math.max(50, props.openDelay),
  { immediate: false }
)

const { start: startClose, stop: stopClose } = useTimeoutFn(
  () => {
    if (hasActiveTriggers.value) return
    showFloating.value = false
  },
  () => props.closeDelay,
  { immediate: false }
)

function show(noDelay = false) {
  if (props.disabled) return

  stopClose()
  if (noDelay) showFloating.value = true
  else startOpen()
}

function close(noDelay = false) {
  stopOpen()
  if (noDelay) showFloating.value = false
  else startClose()
}

function toggle(noDelay = false) {
  if (showFloating.value) close(noDelay)
  else show(noDelay)
}

watchEffect(() => {
  const showNoDelay = hasActiveFloatingTriggers.value || props.forceShow
  const closeNoDelay = props.disabled

  if (!props.disabled && (hasActiveTriggers.value || props.forceShow)) show(showNoDelay)
  else close(closeNoDelay)
})

watchEffect(
  () => {
    if (!props.id || !referenceEl.value) return

    if (showFloating.value) referenceEl.value.setAttribute('aria-describedby', props.id)
    else referenceEl.value.removeAttribute('aria-describedby')
  },
  { flush: 'post' }
)
// #endregion

// #region Floating UI setup
const middleware = computed(() => {
  const resolved = [
    flip({
      fallbackPlacements: isString(props.fallbackPlacements) ? [props.fallbackPlacements] : props.fallbackPlacements,
      padding: props.padding
    }),
    offset({
      mainAxis: props.padding
    }),
    shift({ padding: 8 }),
    hide({
      strategy: 'referenceHidden'
    })
  ]
  if (props.arrow) resolved.push(arrowMiddleware({ element: arrowEl }))
  return resolved
})

const { floatingStyles, middlewareData, placement } = useFloating(referenceEl, floatingEl, {
  placement: () => props.placement,
  whileElementsMounted: (ref, floating, update) => autoUpdate(ref, floating, update, props.autoUpdateOptions),
  middleware: middleware,
  open: showFloating
})

const arrowStyles = computed(() => {
  if (!props.arrow || !middlewareData.value?.arrow || !arrowEl.value) return {}
  const { arrow } = middlewareData.value

  const side = placement.value.split('-')[0]
  const staticSide = {
    top: 'bottom',
    right: 'left',
    bottom: 'top',
    left: 'right'
  }[side]

  const border = {
    top: {
      borderRightWidth: '1px',
      borderBottomWidth: '1px'
    },
    right: {
      borderLeftWidth: '1px',
      borderBottomWidth: '1px'
    },
    bottom: {
      borderLeftWidth: '1px',
      borderTopWidth: '1px'
    },
    left: {
      borderTopWidth: '1px',
      borderRightWidth: '1px'
    }
  }[side]

  return {
    left: isNumber(arrow.x) ? `${arrow.x}px` : '',
    top: isNumber(arrow.y) ? `${arrow.y}px` : '',
    [staticSide!]: `${-arrowEl.value.offsetWidth / 2}px`,
    ...(border || {})
  }
})
// #endregion

// #region Floating element events
useEventListener(floatingEl, 'mouseenter', () => {
  activeFloatingTriggers.value.hover = true
})
useEventListener(floatingEl, 'mouseleave', () => {
  activeFloatingTriggers.value.hover = false
})
useEventListener(floatingEl, 'focusin', () => {
  activeFloatingTriggers.value.focus = true
})
useEventListener(floatingEl, 'focusout', () => {
  activeFloatingTriggers.value.focus = false
})
// #endregion

// #region Trigger element events
useEventListener(triggerEl, 'mouseenter', () => {
  if (!canHover.value) return
  activeReferenceTriggers.value.hover = !activeReferenceTriggers.value.hover
})
useEventListener(triggerEl, 'mouseleave', () => {
  activeReferenceTriggers.value.hover = false
})

useEventListener(triggerEl, 'focusin', () => {
  if (!canFocus.value || activeReferenceTriggers.value.hover) return
  activeReferenceTriggers.value.focus = true
})
useEventListener(triggerEl, 'focusout', () => {
  activeReferenceTriggers.value.focus = false
})

useEventListener(triggerEl, 'click', () => {
  if (!canClick.value) return
  activeReferenceTriggers.value.click = !activeReferenceTriggers.value.click
  toggle(true)
})
onClickOutside(triggerEl, () => {
  if (!canClick.value) return

  activeReferenceTriggers.value.hover = false
  activeReferenceTriggers.value.focus = false
  activeReferenceTriggers.value.click = false

  close(true)
})
// #endregion

function getTarget(target: Props['target']): HTMLElement {
  switch (typeof target) {
    case 'string': {
      // using getElementById, since querySelector fails on certain symbols: e.g., : ; >
      const elements = target[0] === '#' ? [document.getElementById(target.slice(1))].filter(Boolean) : document.querySelectorAll(target)
      if (elements.length !== 1) throw new Error(`Target must point to single element, it got ${elements.length}`)
      return elements[0] as HTMLElement
    }
    case 'function': {
      const element = target()
      if (!element || !(element instanceof HTMLElement)) throw new Error('Target callback did not return any Element.' + target.toString())
      return element
    }
    //target is instance of HTMLElement already
    default: {
      if (target instanceof HTMLElement) return target
      throw new Error('Target must be of type: HTMLElement')
    }
  }
}
</script>

<style scoped>
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 150ms ease-in-out;
}
</style>
