<template>
  <div class="text-theme-text-secondary border-theme-border-base">
    <div
      v-if="displayedTabs.length > 1"
      class="relative tabs-wrapper"
      :class="{
        'overflow-hidden': inner,
        'fade-start': inner && !scrolledLeft,
        'fade-end': inner && !scrolledRight
      }"
    >
      <Transition
        enter-from-class="-translate-x-6"
        leave-to-class="-translate-x-6"
        enter-active-class="transition-transform ease-in-out"
        leave-active-class="transition-transform ease-in-out"
      >
        <button
          v-if="inner && !scrolledLeft"
          type="button"
          class="lg:hidden absolute left-0 top-1/2 -translate-y-1/2 z-11 rounded-lg bg-theme-bg-secondary-subtle hover:bg-theme-bg-secondary-subtle-hover active:bg-theme-bg-secondary-subtle-active"
          @click="scrollPrevious"
        >
          <TltIcon
            icon="chevron"
            class="rotate-180"
          />
        </button>
      </Transition>
      <div
        ref="tablist"
        role="tablist"
        class="relative font-sans text-body-main flex flex-row flex-nowrap scroll-smooth"
        :class="{
          'max-lg:overflow-x-auto max-lg:overflow-y-hidden scroll-px-2': inner
        }"
      >
        <button
          v-for="tab in displayedTabs"
          :id="`tab-${$utils.slug(tab.name)}`"
          ref="tabButtons"
          :key="tab.name"
          :test-id="tab.name === selected ? `selected-tab-${$utils.slug(tab.name)}` : `tab-${$utils.slug(tab.name)}`"
          class="px-4 py-2.5 focus:z-10 aria-selected:text-theme-text-primary shrink-0 group/tab"
          :class="{
            'border border-b-0 border-transparent -mb-px translate-y-px': !inner,
            'active-tab': tab.name === selected && !inner && !isInDropdown(tab.name),
            'absolute invisible -z-10': isInDropdown(tab.name)
          }"
          type="button"
          role="tab"
          :aria-selected="`${tab.name === selected && !isInDropdown(tab.name)}`"
          @click="selected = tab.name"
        >
          <div class="tab-title group-hover/tab:bg-theme-bg-subtle-hover rounded-sm px-2 flex items-center gap-2">
            <span>{{ tab.title }}</span>
            <tlt-icon
              v-if="indicators[tab.name] && tab.name !== selected"
              :icon="indicators[tab.name].type === 'error' ? 'error' : 'info'"
              class="size-5"
              :class="getIndicatorColor(indicators[tab.name].type)"
            />
          </div>
        </button>
        <button
          v-if="!inner || !isMobile"
          ref="moreButton"
          test-id="more-button"
          class="px-4 py-2.5 focus:z-10 aria-selected:text-theme-text-primary shrink-0 group/tab"
          :class="{
            'border border-b-0 border-transparent -mb-px translate-y-px': !inner,
            'active-tab': selected && isInDropdown(selected) && !inner,
            'invisible absolute': dropdownOptions.length === 0
          }"
          :aria-selected="selected ? `${isInDropdown(selected)}` : undefined"
          type="button"
          role="tab"
          @click="dropdownOpen = !dropdownOpen"
        >
          <div class="tab-title group-hover/tab:bg-theme-bg-subtle-hover rounded-sm px-2 flex items-center gap-1">
            <div class="flex items-center gap-2">
              <span>{{ $t('More') }}</span>
              <tlt-icon
                v-if="firstIndicatorInDropdown && firstIndicatorInDropdown.name !== selected"
                :icon="indicators[firstIndicatorInDropdown.name].type === 'error' ? 'error' : 'info'"
                class="size-5"
                :class="getIndicatorColor(indicators[firstIndicatorInDropdown.name].type)"
              />
            </div>
            <tlt-icon
              icon="dropdown-arrow"
              class="transition-transform"
              :class="{ '-scale-y-100': dropdownOpen }"
            />
          </div>
        </button>
        <tlt-dropdown
          v-model:open="dropdownOpen"
          :options="dropdownOptions"
          class="text-base"
          placement="bottom-start"
          :target="() => $refs.moreButton"
          :on-option-click="option => option.id && (selected = option.id)"
        >
          <template #option="{ option }">
            <div class="flex items-center gap-2">
              <span class="wrap-anywhere break-normal">
                {{ option.label }}
              </span>
              <tlt-icon
                v-if="option.icon"
                :icon="option.icon"
                class="size-5"
                :class="option.id ? getIndicatorColor(indicators[option.id]?.type) : ''"
              />
            </div>
          </template>
        </tlt-dropdown>
        <div
          v-if="inner"
          test-id="tab-line"
          class="absolute bottom-0 left-0 h-1 z-1 pointer-events-none"
          :class="{
            'bg-theme-border-primary duration-300 transition-[transform,width]': inner
          }"
          :style="lineStyle"
        />
      </div>
      <Transition
        enter-from-class="translate-x-6"
        leave-to-class="translate-x-6"
        enter-active-class="transition-transform ease-in-out"
        leave-active-class="transition-transform ease-in-out"
      >
        <button
          v-if="inner && !scrolledRight"
          type="button"
          class="lg:hidden absolute right-0 top-1/2 -translate-y-1/2 z-11 rounded-lg bg-theme-bg-secondary-subtle hover:bg-theme-bg-secondary-subtle-hover active:bg-theme-bg-secondary-subtle-active"
          @click="scrollNext"
        >
          <TltIcon icon="chevron" />
        </button>
      </Transition>
      <div
        v-if="inner"
        class="lg:hidden absolute bottom-0 left-0 h-1 w-full bg-theme-border-subtle pointer-events-none"
      />
    </div>
    <component
      :is="inner ? 'div' : DefaultLayout"
      :class="{
        'lg:border-t pt-8': inner && displayedTabs.length > 1,
        'border p-4': !inner,
        'rounded-tl-none': displayedTabs.length > 1 && selected === displayedTabs[0].name
      }"
      :role="!inner ? 'tabpanel' : undefined"
    >
      <slot :tab="selected">
        <TabContent
          v-for="tab in tabs"
          :key="tab.name"
          :show="tab.name === selected"
          :name="tab.name"
          :title="tab.title"
        >
          <slot
            :name="tab.name"
            :tab="tab"
          />
        </TabContent>
      </slot>
    </component>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { ref, computed, watch, useTemplateRef, nextTick, reactive, toRef } from 'vue'
import { breakpointsTailwind, useBreakpoints, useElementSize, useResizeObserver, useScroll, watchArray } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { isArray, isObject } from '@ui-core/utils/inspect'
import DefaultLayout from '@/layouts/default.vue'
import type { DropdownOption } from '@ui-core/tlt-design/layout/TltDropdown.vue'
import { utils } from '@/plugins/utils'
import { provideTabsContext } from './useTabsContext'

export interface Tab<T extends string = string> {
  name: T
  title: string
  show?: boolean
}

export interface TabIndicator {
  type: 'error' | 'warning' | 'info' | 'success'
}

export interface Props<T extends string> {
  tabs?: Tab<T>[]
  inner?: boolean
  /**
   * Controls when to highlight tabs with indicators.
   * - `true`: highlight on both error and changes
   * - `false`: disable highlighting
   * - `'error'`: highlight only on errors
   * - `'change'`: highlight only on changes
   */
  highlight?: boolean | 'error' | 'change'
}

const props = withDefaults(defineProps<Props<T>>(), {
  tabs: undefined,
  inner: true,
  highlight: true
})

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const tabList = useTemplateRef('tablist')
const tabButtons = useTemplateRef('tabButtons')
const moreButton = useTemplateRef('moreButton')

// #region Initialization & Lifecycle
const registeredTabs = ref<Tab[]>([])
const displayedTabs = computed(() => {
  const tabs = props.tabs ?? registeredTabs.value
  return tabs.filter(t => t.show !== false)
})

const { width: tabListWidth } = useElementSize(tabList)
const { width: moreButtonWidth } = useElementSize(moreButton)
// #endregion

// #region Tab Selection
const selected = defineModel<string>('selected', { default: '' })
watch(
  displayedTabs,
  tabs => {
    if ((selected.value && findTab(selected.value)) || !tabs.length) return
    selected.value = displayedTabs.value[0]?.name
  },
  { immediate: true }
)

watch(
  selected,
  value => {
    adjustLine()
    dropdownOpen.value = false
    if (value) delete indicators.value[value]

    if (!tabList.value) return

    const selectedElement = Array.from(tabList.value.children).find(el => el.id === `tab-${utils.slug(value)}`)
    selectedElement?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  },
  { flush: 'post' }
)

const route = useRoute()
watch(
  () => route.query,
  query => {
    if (!query?.tab) return

    const tab = isArray(query.tab) ? query.tab[0] : query.tab
    const queryTab = tab ? findTab(tab) : null

    selected.value = queryTab?.name || displayedTabs.value[0].name
  },
  { immediate: true, flush: 'post' }
)

function findTab(searchTab: string | Tab<T>) {
  const searchTabName = isObject(searchTab) ? searchTab.name : searchTab
  return displayedTabs.value.find(tab => tab.name === searchTabName)
}
// #endregion

// #region Dropdown
const tabWidths = reactive<Map<string, number>>(new Map())

const tabElements = ref<HTMLButtonElement[]>([])
watch(
  [displayedTabs, tabButtons],
  () => {
    if (!tabButtons.value) return
    tabElements.value = tabButtons.value.filter(el => el instanceof HTMLElement)
  },
  { flush: 'post', immediate: true }
)

useResizeObserver(tabElements, async entries => {
  entries.forEach(entry => {
    if (!entry.borderBoxSize) return

    const width = entry.borderBoxSize[0].inlineSize
    if (width > 0) tabWidths.set(entry.target.id, width)
    else tabWidths.delete(entry.target.id)
  })
  await nextTick()
  adjustLine()
})

const tabEndings = computed(() => {
  if (!tabListWidth.value || !tabButtons.value) return []

  return displayedTabs.value.reduce<number[]>((sum, { name }, index) => {
    const width = tabWidths.get(`tab-${utils.slug(name)}`) || 0
    sum.push((sum[index - 1] || 0) + width)
    return sum
  }, [])
})

const overflowingTabs = computed(() => {
  if (!moreButton.value || !tabEndings.value?.length) return []

  const allTabsWidth = tabEndings.value[tabEndings.value.length - 1]
  if (!tabListWidth.value || allTabsWidth <= tabListWidth.value) return []

  const overflowIndex = tabEndings.value.findIndex(endCoor => endCoor > tabListWidth.value - moreButtonWidth.value)

  if (overflowIndex < 0) return []
  return overflowIndex === tabEndings.value.length - 1 ? displayedTabs.value.slice(overflowIndex - 1) : displayedTabs.value.slice(overflowIndex)
})

const dropdownOptions = computed(() =>
  overflowingTabs.value.map(tab => {
    const indicator = indicators.value[tab.name]

    const option: DropdownOption = {
      ...tab,
      label: tab.title,
      id: tab.name,
      active: () => selected.value === tab.name,
      slotName: 'option'
    }

    if (indicator) {
      option.icon = 'info'
    }

    return option
  })
)

const dropdownOpen = ref(false)
watch(dropdownOptions, options => {
  if (!options.length) dropdownOpen.value = false
})

function isInDropdown(tab: string) {
  return dropdownOptions.value.some(opt => opt.id === tab)
}
// #endregion

// #region Tab Line
const lineWidth = ref<number | null>(null)
const lineOffset = ref<number | null>(null)
function adjustLine() {
  if (!tabList.value || !tabListWidth.value) return

  const active = Array.from(tabList.value.children).find(btn => {
    const attr = btn.getAttribute('aria-selected')
    return attr === 'true'
  })
  if (!active || !(active instanceof HTMLElement)) return

  lineWidth.value = active.offsetWidth
  lineOffset.value = active.offsetLeft
}
watch(tabListWidth, adjustLine, { flush: 'post' })

const lineStyle = computed(() => {
  if (!lineWidth.value) return {}
  return {
    width: `${lineWidth.value}px`,
    transform: `translate(${lineOffset.value}px)`
  }
})
// #endregion

// #region Tab indicators
const indicators = defineModel<Record<string, TabIndicator>>('indicators', { default: () => ({}) })

provideTabsContext({
  registeredTabs,
  selected,
  indicators,
  highlight: toRef(() => props.highlight),
  inner: toRef(() => props.inner)
})

const firstIndicatorInDropdown = computed(() => overflowingTabs.value.find(tab => indicators.value[tab.name]))

function getIndicatorColor(type: TabIndicator['type']) {
  switch (type) {
    case 'error':
      return 'text-theme-text-danger'
    case 'warning':
      return 'text-theme-text-warning'
    case 'info':
      return 'text-theme-text-info'
    case 'success':
      return 'text-theme-text-success'
    default:
      return ''
  }
}

watchArray(
  displayedTabs,
  (...args) => {
    const [, , , removed] = args
    if (!removed.length) return

    removed.forEach(tab => {
      if (!indicators.value[tab.name]) return
      delete indicators.value[tab.name]
    })
  },
  { flush: 'post' }
)
// #endregion

// #region Scrolling
const { x, arrivedState, measure } = useScroll(tabList, { behavior: 'smooth' })

const scrolledLeft = computed(() => x.value === 0)
const scrolledRight = computed(() => arrivedState.right)

useResizeObserver(tabList, measure)

watch(
  isMobile,
  () => {
    measure()
    adjustLine()
  },
  { flush: 'post' }
)
// #endregion

function scrollPrevious() {
  if (!tabList.value) return
  x.value -= tabList.value.clientWidth / 2
}

function scrollNext() {
  if (!tabList.value) return
  x.value += tabList.value.clientWidth / 2
}
</script>

<style scoped>
@reference '@/theme.css';

/* this is separated because it allows to be overriden by other classes */
[role='tab']:not(:first-child).active-tab::before {
  display: block;
}
[role='tab'].active-tab::before {
  content: '';
  position: absolute;
  display: none;
  width: 0.5rem;
  height: 0.5rem;
  background-color: transparent;
  bottom: 1px;
  right: 100%;
  border-bottom-right-radius: 0.25rem;
  border-bottom: 1px solid var(--color-theme-border-base);
  border-right: 1px solid var(--color-theme-border-base);
  box-shadow: 1px 4px 0 white;
  z-index: -1;
}

.active-tab {
  @apply border-t border-theme-border-base rounded-sm rounded-bl-none rounded-br-none relative bg-theme-bg-surface;
}
.active-tab[aria-selected='true'] .tab-title {
  -webkit-text-stroke-width: 0.025rem;
}

.active-tab::after {
  content: '';
  position: absolute;
  display: block;
  width: 0.5rem;
  height: 0.5rem;
  background-color: transparent;
  bottom: 1px;
  left: 100%;
  border-bottom-left-radius: 0.25rem;
  border-bottom: 1px solid var(--color-theme-border-base);
  border-left: 1px solid var(--color-theme-border-base);
  box-shadow: -2px 2px 0 white;
  z-index: -1;
}

[role='tablist']::-webkit-scrollbar {
  display: none;
}
[role='tablist'] {
  scrollbar-width: none;
}

.tabs-wrapper::before {
  content: '';
  position: absolute;
  width: 4rem;
  height: calc(100% - 0.3125rem);
  top: 0;
  left: 0;
  background: linear-gradient(to right, var(--color-theme-bg-surface), transparent);
  pointer-events: none;
  z-index: 10;
  transition: opacity 150ms;
  opacity: 0;
}
.tabs-wrapper::after {
  content: '';
  position: absolute;
  width: 4rem;
  height: calc(100% - 0.3125rem);
  top: 0;
  right: 0;
  background: linear-gradient(to left, var(--color-theme-bg-surface), transparent);
  pointer-events: none;
  z-index: 10;
  transition: opacity 150ms;
  opacity: 0;
}

@media (max-width: --theme(--breakpoint-lg)) {
  .fade-start::before,
  .fade-end::after {
    opacity: 1;
  }
}
</style>
