<template>
  <div
    :id="id"
    :test-id="id"
    :data-expanded="expanded"
    class="h-full w-full"
    :class="{
      'collapsable-card grid grid-rows-[auto_1fr]': title
    }"
  >
    <div
      v-if="title"
      class="font-sans text-lg leading-6 text-theme-text-base min-w-0"
    >
      <h3
        class="mb-6 flex flex-wrap flex-row gap-x-2 gap-y-2 grow items-start text-start"
        :class="{ 'w-full justify-between': titleSpaceBetween }"
      >
        <button
          v-if="toggleable"
          :id="`button-toggle-${id}`"
          :test-id="`button-toggle-${id}`"
          class="title-info flex items-center gap-1 min-h-8 min-w-0 max-w-full order-first"
          :class="{ 'max-lg:mr-6': help || $slots.help }"
          :aria-controls="`tablerow-${sectionName || id}`"
          :aria-expanded="expanded"
          @click="toggleContent"
        >
          <span class="px-0.5">
            <tlt-icon
              icon="dropdown-arrow"
              :class="{ 'rotate-180': expanded }"
            />
          </span>
          <tlt-hint
            :hints="help"
            :rawhtml="rawhtml"
            class="whitespace-nowrap"
            show-icon="mobile"
          >
            <tlt-overflow-hint
              ref="title"
              class="font-semibold whitespace-nowrap text-start"
              :expandable="false"
            >
              {{ title }}
            </tlt-overflow-hint>
            <template
              v-if="$slots.help"
              #hintBox
            >
              <slot name="help" />
            </template>
          </tlt-hint>
        </button>
        <div
          v-else
          class="title-info min-w-0 max-w-full order-first"
          :class="{ 'max-lg:mr-6': help || $slots.help }"
        >
          <tlt-hint
            :hints="help"
            :rawhtml="rawhtml"
            show-icon="mobile"
          >
            <span
              ref="title"
              class="font-semibold truncate"
            >
              {{ title }}
            </span>
            <template
              v-if="$slots.help"
              #hintBox
            >
              <slot name="help" />
            </template>
          </tlt-hint>
        </div>
        <slot
          name="title-content"
          :expanded="expanded"
        />
      </h3>
    </div>
    <tlt-collapse-transition
      v-if="title"
      @before-enter.self="expanding = true"
      @before-leave.self="expanding = true"
      @after-enter.self="expanding = false"
      @after-leave.self="expanding = false"
    >
      <ListLayout
        v-show="expanded"
        :id="`tablerow-${sectionName || id}`"
        gap="md"
        :test-id="`tablerow-${sectionName || id}`"
        class="card-content min-w-0"
        role="region"
        :aria-labelledby="`button-toggle-${id}`"
      >
        <slot />
      </ListLayout>
    </tlt-collapse-transition>
    <ListLayout
      v-else
      gap="md"
      :test-id="`tablerow-${sectionName || id}`"
    >
      <slot />
    </ListLayout>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { utils } from '@/plugins/utils'
import { useRouter } from 'vue-router'

export interface Props {
  id?: string
  title?: string
  toggleable?: boolean
  help?: string
  rawhtml?: boolean
  active?: boolean
  initialActive?: boolean
  sectionName?: string
  titleSpaceBetween?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  title: '',
  toggleable: true,
  help: '',
  active: true,
  initialActive: true,
  sectionName: '',
  titleSpaceBetween: false
})

const id = computed(() => {
  if (props.title) return `section-${props.id || props.title.replace(/\s/g, '-').toLowerCase()}`
  else return 'unnamed-section'
})

const router = useRouter()

const pathName = computed(() => {
  const { path, hash } = router.currentRoute.value
  const _hash = hash ? `#${hash}` : ''
  return `${path}${_hash}:${utils.slug(props.title)}`
})

const expanded = ref(localStorage.getItem(pathName.value) ? localStorage.getItem(pathName.value) === 'true' : props.initialActive)
const expanding = ref(false)

onMounted(() => {
  if (!props.toggleable) return
  if (!props.active) return (expanded.value = false)
})

/**
 * Toggles content between expanded state and sets it to local storage.
 */
function toggleContent() {
  expanded.value = !expanded.value
  localStorage[pathName.value] = expanded.value
}

defineExpose({
  expanded,
  expanding
})
</script>
