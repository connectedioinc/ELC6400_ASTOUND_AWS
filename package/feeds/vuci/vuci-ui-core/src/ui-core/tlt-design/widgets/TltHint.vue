<template>
  <span
    class="min-w-0"
    :class="{
      'max-lg:inline-block': !showIcon,
      'inline-block': showIcon
    }"
  >
    <slot />
    <slot
      v-if="hasHints && showIcon"
      name="iconWrapper"
      :has-hints="hasHints"
      :touch-show="touchShow"
      :show-icon="showIcon"
    >
      {{ ' ' }}
      <button
        ref="hintIcon"
        class="max-lg:inline align-text-bottom"
        :class="showIcon ? 'inline' : 'hidden'"
        @click.stop
      >
        <slot
          name="icon"
          :touch-show="touchShow"
        >
          <TltIcon
            :icon="icon!"
            class="size-5 transition-colors"
            :class="touchShow ? 'text-theme-text-primary' : 'text-theme-text-subtle'"
          />
        </slot>
      </button>
    </slot>
    <tlt-popover
      :disabled="!hasHints"
      :triggers="showOnClick || (isMobile && props.showIcon === 'mobile') || props.showIcon === true ? 'click' : triggers"
      :target="target ?? (() => $el)"
      :triggers-target="hasHints && showIcon ? () => $refs.hintIcon : undefined"
      :placement="placement"
      :fallback-placements="fallbackPlacements"
      class="break-words"
      :class="hintClass"
      @click.stop
      @update:show="touchShow = $event"
    >
      <div
        v-if="$slots.hintBox"
        :class="{ 'text-theme-text-danger': error }"
      >
        <slot name="hintBox" />
      </div>
      <template v-if="isString(hints)">
        <!-- eslint-disable -->
        <p
          v-if="rawhtml"
          v-html="$xss(parseValues(hints))"
        />
        <!-- eslint-enable -->
        <p
          v-else
          class="whitespace-pre-line"
        >
          {{ hints }}
        </p>
      </template>
      <template v-else-if="isArray(hints)">
        <div
          v-for="hint in hints"
          :key="hint.title"
          class="flex"
          :class="{ 'text-theme-text-danger': error }"
        >
          <template v-if="hint.title">
            <div class="font-semibold pr-2 truncate">
              {{ hint.title }}
            </div>
          </template>
          <!-- eslint-disable -->
          <p
            v-if="rawhtml"
            v-html="$xss(parseValues(hint.info))"
          />
          <!-- eslint-enable -->
          <div
            v-else
            class="whitespace-pre-line"
          >
            {{ hint.info }}
          </div>
        </div>
      </template>
      <template v-else-if="isObject(hints)">
        <!-- eslint-disable -->
        <p
          v-if="rawhtml"
          v-html="$xss(parseValues(hints.info))"
        />
        <!-- eslint-enable -->
        <p
          v-else
          class="whitespace-pre-line"
        >
          {{ hints.info }}
        </p>
      </template>
      <template
        v-if="isObject(hints) && !isArray(hints) && hints.title"
        #title
      >
        {{ hints.title }}
      </template>
      <template
        v-else-if="$slots.title"
        #title
      >
        <slot name="title" />
      </template>
    </tlt-popover>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, useSlots } from 'vue'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { type Placement } from '@floating-ui/vue'
import { isArray, isObject, isString } from '@ui-core/utils/inspect'
import { type Props as PositionerProps } from '@ui-core/components/tooltip/TltPositioner.vue'
import type { Icon } from '../icons/icon-types'

export interface Hint {
  title?: string
  info: string
}

export interface Props {
  hints?: string | Hint | Hint[]
  triggers?: PositionerProps['triggers']
  breakWords?: boolean
  rawhtml?: boolean
  showOnClick?: boolean
  error?: boolean
  hintClass?: string | Record<string, boolean> | (string | Record<string, boolean>)[]
  placement?: Placement
  fallbackPlacements?: PositionerProps['fallbackPlacements']
  /**
   * Icon to show as the mobile hint trigger. Set to `null` to disable.
   * @default 'tooltip'
   */
  icon?: Icon | null
  /**
   * Determines when the hint display icon is shown
   * @default 'mobile'
   */
  showIcon?: boolean | 'mobile' | 'desktop'
  /**
   * Override the target element for the hint
   */
  target?: HTMLElement | (() => HTMLElement) | string | unknown
}

const props = withDefaults(defineProps<Props>(), {
  hints: () => [],
  triggers: 'hover focus',
  hintClass: () => ({}),
  placement: 'bottom-start',
  icon: 'tooltip',
  showIcon: false,
  target: undefined,
  fallbackPlacements: () => ['bottom', 'left', 'right', 'top']
})

const slots = useSlots()

const hasHints = computed(() => {
  if (slots.hintBox) return true
  if (isString(props.hints) || isArray(props.hints)) return props.hints.length > 0
  return !!props.hints
})

function parseValues(val: string | string[]) {
  if (isArray(val)) return val.length > 0 ? val.join(' , ') : '-'
  return val.length > 0 ? val : '-'
}

const touchShow = ref(false)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const showIcon = computed(() => {
  if (!props.icon || props.showOnClick) return false
  if (props.showIcon === 'mobile') return isMobile.value
  if (props.showIcon === 'desktop') return !isMobile.value
  return props.showIcon === true
})
</script>
