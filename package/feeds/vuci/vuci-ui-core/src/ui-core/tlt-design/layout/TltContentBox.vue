<template>
  <Teleport
    to="body"
    :disabled="!shouldTeleport || !teleport"
  >
    <Transition
      name="floating-box"
      appear
      :duration="300"
      @before-enter="$emit('beforeEnter', $event)"
      @after-enter="$emit('afterEnter', $event)"
      @before-leave="$emit('beforeLeave', $event)"
      @leave="shouldTeleport = false"
      @after-leave="$emit('afterLeave', $event)"
    >
      <div
        v-if="open"
        ref="floatingElement"
        class="z-30 w-auto flex"
        :class="floatingClass"
        :style="{
          ...floatingStyles,
          visibility: middlewareData.hide?.referenceHidden ? 'hidden' : 'visible',
          maxWidth: `${Math.max(150, matchReference === true || matchReference === 'width' ? referenceSize.width : availableSize.width)}px`,
          maxHeight: `${Math.max(150, matchReference === true || matchReference === 'height' ? referenceSize.height : availableSize.height)}px`
        }"
      >
        <div
          v-if="open"
          tabindex="-1"
          :class="[size]"
          class="box flex-1 flex-col overflow-y-auto"
          v-bind="$attrs"
        >
          <slot />
          <div
            v-if="arrow"
            ref="arrow"
            class="arrow"
            :style="arrowStyles"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, type ComponentPublicInstance, useTemplateRef, reactive, getCurrentInstance } from 'vue'
import { onClickOutside, useMounted, whenever } from '@vueuse/core'
import { useFloating, autoUpdate, hide, flip, shift, offset, size as sizeMiddleware, arrow as arrowMiddleware, type Placement } from '@floating-ui/vue'
import { getTarget } from '@ui-core/utils/dom'

defineOptions({
  inheritAttrs: false
})

export interface Props {
  size?: 'small' | 'big'
  strategy?: 'fixed' | 'absolute'
  placement?: Placement
  target?: HTMLElement | ComponentPublicInstance | string | Function | null
  distance?: number
  padding?: number
  arrow?: boolean
  matchReference?: boolean | 'width' | 'height'
  floatingClass?: string
  teleport?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'small',
  target: undefined,
  strategy: 'absolute',
  placement: 'bottom-start',
  distance: 8,
  padding: 8,
  matchReference: false,
  floatingClass: '',
  teleport: true
})

defineEmits<{
  beforeEnter: [Element]
  afterEnter: [Element]
  beforeLeave: [Element]
  afterLeave: [Element]
}>()

const open = defineModel<boolean>('open', { required: true })

const instance = getCurrentInstance()
const isControlled = computed(() => !instance?.vnode.props?.['onUpdate:open'])

const shouldTeleport = ref(false)
whenever(open, () => (shouldTeleport.value = true), { immediate: true })

const floatingElement = useTemplateRef('floatingElement')
onClickOutside(
  floatingElement,
  () => {
    if (isControlled.value) return
    open.value = false
  },
  { capture: false }
)

const arrowElement = useTemplateRef('arrow')

const availableSize = reactive({ width: 0, height: 0 })
const referenceSize = reactive({ width: 0, height: 0 })

const mounted = useMounted()
const target = computed(() => (mounted.value ? getTarget(props.target) : null))
const { floatingStyles, middlewareData } = useFloating(target, floatingElement, {
  placement: () => props.placement,
  whileElementsMounted: autoUpdate,
  strategy: () => props.strategy,
  middleware: () =>
    [
      offset(props.distance),
      flip({ padding: props.padding }),
      sizeMiddleware({
        padding: props.padding,
        apply({ availableWidth, availableHeight, rects }) {
          availableSize.width = availableWidth
          availableSize.height = availableHeight
          referenceSize.width = rects.reference.width
          referenceSize.height = rects.reference.height
        }
      }),
      shift({ padding: props.padding }),
      hide(),
      props.arrow ? arrowMiddleware({ element: arrowElement }) : null
    ].filter(v => !!v)
})

const arrowStyles = computed(() => {
  const { arrow } = middlewareData.value
  const style: Record<string, string> = {}

  if (!arrow) return style

  if (arrow?.x) style.left = `${arrow.x}px`
  if (arrow?.y) style.top = `${arrow.y}px`

  if (props.placement.startsWith('top')) style['bottom'] = '-0.25rem'
  else if (props.placement.startsWith('bottom')) style['top'] = '-0.25rem'
  else if (props.placement.startsWith('left')) style['right'] = '-0.25rem'
  else if (props.placement.startsWith('right')) style['left'] = '-0.25rem'

  return style
})

defineExpose({
  $el: floatingElement
})
</script>

<style scoped>
@reference '@/theme.css';

.context-box {
  min-width: max-content;
  min-height: max-content;
}

.box {
  display: flex;
  color: var(--color-theme-text-base);
  font-size: var(--text-body-secondary);
  min-width: 200px;
  z-index: 7;
  background-color: var(--color-theme-bg-floating);
  border: 1px solid var(--color-theme-border-subtle);
  border-radius: 0.5rem;
  box-shadow: 0 10px 22px --alpha(var(--color-theme-bg-primary-2) / 0.15);
  position: relative;
}

.small {
  width: 12.75rem; /* 204px */
}
.big {
  width: 21rem; /* 336px */
}

.floating-box-enter-active .box,
.floating-box-leave-active .box {
  transition:
    opacity 0.3s,
    transform 0.3s;
}

.floating-box-enter-from .box,
.floating-box-leave-to .box {
  opacity: 0;
  transform: translateY(-0.5rem);
}

.arrow {
  content: '';
  position: absolute;
  height: 1rem;
  width: 1rem;
  rotate: 45deg;
  background-color: inherit;
}
</style>
