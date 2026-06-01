<template>
  <div
    class="wrapper flex items-center grow-0 rounded-full"
    :class="{ expanded, 'delay-300': !expanded }"
    @focusout="onBlur"
  >
    <div
      ref="searchWrapper"
      class="search static md:relative h-9 md:h-10 flex shrink grow-0"
      :class="{ expanded }"
      @transitionend.self="onExpandEnd"
      @keydown="onKeyDown"
    >
      <button
        class="flex items-center justify-between px-1.5 md:px-2 bg-theme-bg-secondary-subtle rounded-full h-full w-full outline-2 outline-transparent focus-within:outline-theme-border-primary-strong transition-[outline-color]"
        :class="{
          'cursor-text': expanded
        }"
        type="button"
        test-id="search-button"
        @click="expand"
      >
        <TltIcon
          icon="search"
          class="search-icon size-6! md:mr-1.5"
          :class="{ 'md:mr-0': expanded }"
        />
        <div class="w-0 flex-1 overflow-clip">
          <input
            ref="input"
            v-model="search"
            type="text"
            autocomplete="new-password"
            aria-autocomplete="none"
            :placeholder="$t('Search...')"
            class="h-full w-full py-0 px-1.5 bg-transparent text-body-secondary rounded-full outline-none"
            test-id="input-search"
            tabindex="-1"
          />
        </div>
        <div class="h-full w-6 hidden md:flex items-center justify-center">
          <div
            v-if="!search || !open"
            ref="shortcut"
            class="text-theme-text-secondary-subtle size-5 bg-theme-bg-secondary-1/15 flex items-center justify-center rounded-xs transition-opacity"
            :class="{ 'opacity-0': expanded }"
          >
            /
          </div>
          <button
            v-if="!!search && open"
            class="bg-theme-bg-secondary-1 rounded-full size-5 flex justify-center items-center text-theme-text-on-secondary!"
            @click="handleClear"
          >
            <TltIcon
              icon="x"
              class="size-5"
            />
          </button>
        </div>
      </button>
      <TltContentBox
        :open="open"
        :target="() => $refs.searchWrapper"
        placement="bottom"
        strategy="fixed"
        match-reference="width"
        :distance="0"
        :padding="0"
        :teleport="false"
        floating-class="max-md:max-w-none! max-md:h-full"
        class="p-0! mt-4! md:mt-2! w-screen! md:max-h-96 md:h-auto min-w-0! cursor-auto z-6! outline-none"
        @after-enter="openState === 'opening' && (openState = 'opened')"
        @after-leave="openState === 'closing' && (openState = 'closed')"
      >
        <div
          class="p-1 scroll-p-1"
          v-bind="containerProps"
        >
          <div class="h-12 shrink-0 px-3 text-xs uppercase font-semibold text-theme-text-secondary-subtle flex items-center">
            <div v-if="!search">{{ $t('Recent searches') }}</div>
            <template v-else>
              <span>{{ $t('Results found') }}</span>
              <div class="ml-1 aspect-square bg-theme-bg-secondary-subtle text-theme-text-secondary rounded-full h-5 flex items-center justify-center">{{ results.length }}</div>
            </template>
            <div class="ml-2 size-4">
              <tlt-icon
                v-if="searchStore.loading"
                icon="spinner"
                animate
                class="size-full text-theme-text-primary"
              />
            </div>
          </div>
          <ul
            v-if="results.length"
            ref="resultsWrapper"
            test-id="search-results"
            v-bind="wrapperProps"
          >
            <li
              v-for="{ data: result, index } of virtualResults"
              :key="result.id"
              :data-index="index"
              :test-id="`search-result-${index}`"
              @touchstart="selected = index"
              @mouseenter="selected = index"
              @mouseleave="selected = -1"
              @click.capture="onResultClick(result)"
            >
              <component
                :is="getSearchResultComponent(result.type)"
                :selected="index === selected"
                :query="search"
                v-bind="result"
              />
            </li>
          </ul>
          <div
            v-else
            class="px-3 mb-4 text-theme-text-secondary-subtle flex items-center"
          >
            <span class="break-words w-full">
              {{ $t("Your search for '%s' did not match any results.").format(search) }}
            </span>
          </div>
        </div>
      </TltContentBox>
    </div>
    <button
      v-show="expanded"
      class="md:hidden size-8 ml-4 flex justify-center items-center rounded-full cursor-pointer hover:bg-theme-bg-subtle-hover"
      @click="handleClearMobile"
    >
      <TltIcon
        icon="x"
        class="size-6"
      />
    </button>
    <TltTooltip
      v-if="!expanded"
      placement="bottom"
      :target="() => $refs?.shortcut"
    >
      <p>
        {{ $t('Use the shortcut') }}
        <span class="size-6 bg-theme-bg-secondary-2/40 text-center rounded-sm inline-block">/</span>
        {{ $t('to start searching') }}
      </p>
    </TltTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'
import { onClickOutside, useCurrentElement, useEventListener, useLocalStorage, useVirtualList, whenever } from '@vueuse/core'
import { utils } from '@/plugins/utils'
import { useMainStore } from '@/stores/main'
import { useSearchStore, type SearchItemType } from '@/stores/search/'
import { useTranslate } from '@ui-core/composables/useI18n'
import BaseSearchResult from './BaseSearchResult.vue'
import RouteSearchResult from './RouteSearchResult.vue'
import ActionSearchResult from './ActionSearchResult.vue'
import PackageSearchResult from './PackageSearchResult.vue'

const currentElement = useCurrentElement()
const inputEl = useTemplateRef('input')
const resultsEl = useTemplateRef('resultsWrapper')

const store = useMainStore()
const searchStore = useSearchStore()
const $t = useTranslate()

// #region Recent searches
const recentSearches = useLocalStorage<string[]>('recent-searches', [])

const recents = computed(() => recentSearches.value.map(recentId => searchStore.getItem(recentId)).filter(item => !!item))

/**
 * Stores last selected search item in local storage
 */
function addRecent(id: string) {
  if (!id) return

  let newRecents = recents.value.map(recent => recent.id).filter(recentId => recentId !== id)
  newRecents.unshift(id)

  if (newRecents.length > 5) newRecents = newRecents.slice(0, 5)
  recentSearches.value = newRecents
}
// #endregion

// #region Search logic
const search = ref('')

const results = computed(() => (searchStore.results.length || !!search.value ? searchStore.results : recents.value))

const clearInput = ref(false)

const {
  list: virtualResults,
  containerProps,
  wrapperProps,
  scrollTo
} = useVirtualList(results, {
  itemHeight: 64
})

watch(search, value => {
  selectItem(0)
  searchStore.search(value)
})

/**
 * Clears search input and keeps focus
 */
function handleClear() {
  search.value = ''
  expand()
}

/**
 * Clears search input on mobile
 */
function handleClearMobile() {
  clearInput.value = true
  collapse()
}

/**
 * Handles selected result callback
 */
function onResultClick(item: SearchItemType) {
  clearInput.value = true
  collapse()

  addRecent(item.id)
}

function getSearchResultComponent(type: SearchItemType['type']) {
  switch (type) {
    case 'route':
      return RouteSearchResult
    case 'action':
      return ActionSearchResult
    case 'package':
      return PackageSearchResult
    default:
      return BaseSearchResult
  }
}
// #endregion

// #region Search opening and closing
type OpenState = 'opened' | 'closed' | 'opening' | 'closing'

const expandedModel = defineModel<Boolean>('expanded', { required: true })
const expandedState = ref<OpenState>('closed')
const expanded = computed(() => expandedState.value === 'opened' || expandedState.value === 'opening')

watch(expandedState, state => (expandedModel.value = state === 'opened' || state === 'opening'))

const openState = ref<OpenState>('closed')
const open = computed(() => (openState.value === 'opened' || openState.value === 'opening') && (!!search.value || !!recents.value.length))

watch(
  open,
  value => {
    if (value) document.body.classList.add('max-md:overflow-hidden!')
    else document.body.classList.remove('max-md:overflow-hidden!')
  },
  { immediate: true }
)

async function expand() {
  if (expandedState.value === 'opening') return
  inputEl.value?.focus()
  selectItem(0)

  if (!expanded.value) expandedState.value = 'opening'
  else if (!open.value) openState.value = 'opening'
}

async function collapse() {
  if (openState.value === 'closing') return
  inputEl.value?.blur()

  if (open.value) openState.value = 'closing'
  else if (expanded.value) expandedState.value = 'closing'
}

watch(expandedState, state => {
  if (state === 'opened') openState.value = 'opening'
})
watch(openState, state => {
  if (state !== 'closed') return
  expandedState.value = 'closing'

  if (clearInput.value) {
    search.value = ''
    clearInput.value = false
  }
})

onClickOutside(currentElement, collapse)

whenever(() => store.spinner.spinning, collapse)

watch(
  () => store.menus,
  () => inputEl.value?.dispatchEvent(new Event('input'))
)

function onExpandEnd() {
  if (expandedState.value === 'opening') expandedState.value = 'opened'
  else if (expandedState.value === 'closing') expandedState.value = 'closed'
}
// #endregion

// #region Navigation
const selected = ref(0)

function selectItem(index: number) {
  if (!results.value.length) {
    containerProps.ref.value?.scrollTo({ top: 0 })
    return
  }

  selected.value = utils.wrap(index, 0, results.value.length)

  const selectedEl = resultsEl.value?.querySelector(`[data-index="${selected.value}"]`)

  if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' })
  else scrollTo(selected.value)
}

/**
 * Handles search keyboard navigation
 */
function onKeyDown(event: KeyboardEvent) {
  switch (event.code) {
    case 'Escape':
      clearInput.value = true
      collapse()
      break
    case 'Enter':
    case 'NumpadEnter': {
      const selectedEl = resultsEl.value?.querySelector(`[data-selected="true"]`)
      if (selectedEl instanceof HTMLElement) selectedEl.click()
      break
    }
    case 'ArrowDown':
      event.preventDefault()
      selectItem(selected.value + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      selectItem(selected.value - 1)
      break
  }
}

/**
 * Focuses search input when / key is pressed and no input or textarea is focused
 */
useEventListener(document, 'keydown', event => {
  if (event.target instanceof HTMLElement && (['INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable)) return
  if (event.code === 'Slash') {
    event.preventDefault()
    if (store.modalOpen || store.spinner.spinning) return
    expand()
  }
})

function onBlur(event: FocusEvent) {
  if (!(event.relatedTarget instanceof HTMLElement) || !(currentElement.value instanceof HTMLElement)) return
  if (currentElement.value.contains(event.relatedTarget)) return
  collapse()
}

// #endregion
</script>

<style scoped>
@reference '@/theme.css';

:deep(mark) {
  background: none;
  font-weight: 700;
  color: var(--color-theme-text-base);
}

.expanded {
  flex-grow: 1;
  height: 2.5rem;
}

.search {
  transition:
    outline-color 150ms,
    height 150ms,
    flex 300ms;
  .search-icon {
    transition: color 150ms;
    color: var(--color-theme-text-primary);
  }
  &.expanded {
    height: 2.5rem;
    .search-icon {
      color: var(--color-theme-text-subtle);
    }
  }
}

/*
  fix for sticky hover state on mobile
  https://css-tricks.com/solving-sticky-hover-states-with-media-hover-hover/
*/
@media (hover: hover) {
  .search:not(.expanded) button:hover {
    background-color: var(--color-theme-bg-secondary-subtle-hover);
  }
}

@media (max-width: 769px) {
  :deep(.box) {
    height: calc(100vh - 4.5rem); /* fallback */
    height: calc(100dvh - 4.5rem);
    border-top-right-radius: 0;
    border-top-left-radius: 0;
  }
}
</style>
