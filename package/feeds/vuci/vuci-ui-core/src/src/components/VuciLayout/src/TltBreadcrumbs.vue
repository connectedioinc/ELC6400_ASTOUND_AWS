<template>
  <nav>
    <ul
      class="flex text-body-secondary gap-0.5 items-center"
      :class="{ 'flex-wrap': expanded }"
    >
      <template
        v-for="crumb in displayedCrumbs"
        :key="crumb.path + crumb.name"
      >
        <li
          :class="[crumb.name === '#hidden' ? 'shrink-0' : 'min-w-0', !hasHiddenElements ? 'last:min-w-0' : 'last:min-w-0']"
          class="min-w-6 first:min-w-max truncate"
        >
          <component
            :is="interactable && crumb.path ? 'router-link' : interactable ? 'button' : 'span'"
            v-if="crumb.name !== '#hidden'"
            :to="(interactable && crumb.path) || ''"
            class="inline! no-underline rounded-md min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap"
            :class="[
              isLastCrumb(crumb) ? 'font-semibold text-theme-text-secondary visited:text-theme-text-secondary' : 'text-theme-text-secondary-subtle visited:text-theme-text-secondary-subtle',
              { 'hover:bg-theme-bg-subtle-hover active:text-inherit p-1': interactable }
            ]"
            :type="!crumb.path && interactable ? 'button' : null"
            @click="interactable && $emit('click', { crumb, isLast: crumb === displayedCrumbs.at(-1) })"
          >
            <slot
              name="name"
              :crumb="crumb"
            >
              <span class="text-inherit">{{ $t(crumb.name) }}</span>
            </slot>
          </component>

          <component
            :is="interactable ? 'button' : 'span'"
            v-else
            class="align-bottom rounded-md text-center"
            :class="{ 'hover:bg-theme-bg-subtle-hover': interactable }"
            :type="interactable ? 'button' : null"
            @click="interactable && (expanded = true)"
          >
            <tlt-icon
              icon="more"
              class="size-5 rotate-90"
            />
          </component>
        </li>
        <li
          v-if="!isLastCrumb(crumb)"
          :key="(crumb.path || crumb.name) + 'arrow'"
        >
          <tlt-icon
            icon="arrow-thin"
            class="-mx-1 size-5"
          />
        </li>
      </template>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'
import { useTranslate } from '@ui-core/composables/useI18n'

export interface BreadCrumbItem {
  name: string
  path?: string
}

export interface Props {
  crumbs: BreadCrumbItem[]
  interactable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  crumbs: () => [],
  interactable: true
})

defineEmits<{
  click: [{ crumb: BreadCrumbItem; isLast: boolean }]
}>()

const route = useRoute()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')
const $t = useTranslate()

const expanded = ref(false)

const displayedCrumbs = computed(() => {
  if (!expanded.value && props.crumbs.length > 3 && !isMobile.value) {
    return [props.crumbs[0], { name: '#hidden', path: '#hidden' }, ...props.crumbs.slice(-2)]
  }
  if (isMobile.value && props.crumbs.length > 2 && !expanded.value) {
    return [props.crumbs[0], { name: '#hidden', path: '#hidden' }, props.crumbs.at(-1)!]
  }
  return props.crumbs
})

const hasHiddenElements = computed(() => {
  return displayedCrumbs.value.some(crumb => crumb.name === '#hidden')
})

watch(
  () => route.path,
  (currPath, oldPath) => {
    if (currPath !== oldPath) {
      expanded.value = false
    }
  }
)

function isLastCrumb(crumb: BreadCrumbItem) {
  return crumb === displayedCrumbs.value[displayedCrumbs.value.length - 1]
}
</script>
