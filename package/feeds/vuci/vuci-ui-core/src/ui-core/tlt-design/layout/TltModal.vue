<template>
  <Teleport
    to="body"
    :disabled="!shouldTeleport"
  >
    <Transition
      name="modal"
      @after-leave="onAfterLeave"
    >
      <div
        v-if="open"
        test-id="modal-backdrop"
        class="fixed inset-0 z-20 grid grid-cols-1 items-start bg-black/60"
        :class="$attrs.class"
        @click.self="closeModal"
      >
        <div
          test-id="modal-container"
          class="modal-container flex flex-col overflow-clip bg-theme-bg-page relative"
          :class="[size, containerClass]"
          tabindex="-1"
        >
          <slot name="custom">
            <div
              v-if="hasHeader"
              class="flex mb-4 gap-4"
            >
              <div class="grow flex flex-col min-w-0">
                <div v-if="!hideNavigation">
                  <tlt-breadcrumbs
                    :crumbs="modalSpecificCrumbs"
                    @click="({ isLast }) => !isLast && closeModal()"
                  />
                </div>
                <h2
                  v-if="title"
                  test-id="modal-title"
                  class="modal-title font-semibold text-theme-text-secondary text-salmon break-words"
                >
                  {{ title }}
                </h2>
              </div>
              <tlt-button
                v-if="closeable"
                class="ml-auto mt-1 shrink-0 hover:text-theme-text-primary size-10"
                type="text"
                color="tertiary"
                size="md"
                button-id="close"
                :disabled="false"
                @click="closeModal"
              >
                <tlt-icon
                  icon="x"
                  class="size-6 text-theme-text-secondary"
                />
              </tlt-button>
            </div>
            <div class="modal-content min-h-8 h-full">
              <ListLayout
                bordered
                class="content-wrapper h-full"
                tabindex="-1"
              >
                <slot v-bind="$attrs" />
              </ListLayout>
            </div>
          </slot>
          <div
            v-if="$slots.actions"
            ref="actions"
          >
            <hr class="mb-6" />
            <slot
              name="actions"
              :close="closeModal"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { whenever } from '@vueuse/core'
import { useMainStore } from '@/stores/main'
import TltBreadcrumbs from '@/components/VuciLayout/src/TltBreadcrumbs.vue'
import TltIcon from '../icons/TltIcon.vue'
import { useNavigationCrumbs } from '@/composables/useNavigationCrumbs'

defineOptions({
  inheritAttrs: false
})

export interface Props {
  title?: string
  open?: boolean
  navBar?: string[]
  size?: 'big' | 'medium' | 'small' | 'tiny'
  containerClass?: string
  hideNavigation?: boolean
  closeable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  navBar: () => [],
  size: 'big',
  containerClass: '',
  showCloseButton: true,
  title: undefined,
  closeable: true
})

const emit = defineEmits<{
  close: []
}>()

function closeModal() {
  if (props.closeable) emit('close')
}

const store = useMainStore()
const { allCrumbs } = useNavigationCrumbs()

const shouldTeleport = ref(false)

function openModal() {
  shouldTeleport.value = true
  store.openModal(true)
}

function onAfterLeave() {
  shouldTeleport.value = false
  store.openModal(false)
}

whenever(() => props.open, openModal, { immediate: true })
onUnmounted(() => {
  if (props.open) store.openModal(false)
})

const modalSpecificCrumbs = computed(() => {
  const navBar = props.navBar.map(i => ({
    name: i,
    path: ''
  }))
  return props.hideNavigation ? [] : [...allCrumbs.value, ...navBar]
})

const hasHeader = computed(() => {
  return !!props.title || modalSpecificCrumbs.value.length > 0 || props.closeable
})

const actions = ref<HTMLElement | null>(null)
</script>

<style scoped>
@reference '@/theme.css';

.modal-overlay {
  cursor: auto;
  display: flex;
  position: fixed;
  height: 100vh;
  width: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  top: 0px;
  left: 0px;
  z-index: 1;
  transition: opacity 0.15s linear;
}

.modal-container {
  --_y-spacing: 1.5rem;
  --_x-spacing: 1rem;
  padding: var(--_y-spacing) var(--_x-spacing);
  padding-top: 1rem;
  top: var(--_top-gap, 0);
  max-height: calc(100dvh - var(--_top-gap, 1rem) * 2);
  height: auto;
  place-self: center;
  & .modal-content {
    background-color: var(--color-theme-bg-surface);
    max-height: 100%;
    overflow-y: auto;
    /* to move the scrollbar a bit further away from the content */
    margin-inline: -0.5rem;
    padding: 1rem;
  }
  width: 100%;
  border-radius: 0.5rem;
  &:focus {
    outline: none;
  }
  &.big {
    --_top-gap: 3vh;
    width: 98vw;
    align-self: start;
    & .modal-content {
      border: 1px solid var(--color-theme-border-base);
      border-radius: 0.25rem;
    }
  }
  &.medium {
    width: 98vw;
  }
  &.small {
    width: 92vw;
  }
}

@media (min-width: theme(--breakpoint-md)) {
  .modal-container {
    &.big {
      --_top-gap: 10vh;
      --_x-spacing: 2rem;
      width: 92vw;
      & .content-wrapper {
        padding-block: 2rem;
        padding-inline: 1rem;
      }
    }
    &.medium {
      --_y-spacing: 2rem;
      --_x-spacing: 2rem;
      width: 80vw;
    }
    &.small {
      width: 66vw;
    }
  }
}
@media (min-width: theme(--breakpoint-lg)) {
  .modal-container {
    &.medium {
      width: 75vw;
    }
    &.small {
      width: 52vw;
    }
  }
  .modal-container.medium {
    .modal-title {
      padding-right: calc(20% - 1rem);
    }
  }
}
@media (min-width: 1440px) {
  .modal-container {
    &.big {
      width: 65vw;
    }
    &.medium {
      width: 53vw;
    }
    &.small {
      width: 37vw;
    }
  }
}

@media (min-width: theme(--breakpoint-4xl)) {
  .modal-container {
    &.medium {
      width: 53vw;
    }
    &.small {
      width: 33vw;
      max-width: var(--breakpoint-md);
    }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: background-color 200ms ease-in-out;
  .modal-container {
    transition:
      scale 200ms ease-in-out,
      opacity 200ms ease-in-out;
  }
}

.tiny {
  width: 25%;
}

.modal-enter-from,
.modal-leave-to {
  background-color: rgba(0, 0, 0, 0);
  .modal-container {
    scale: 0.8;
    opacity: 0;
  }
}

.badge {
  position: relative;
}

.badge::after {
  content: '';
  background-color: var(--color-theme-bg-danger);
  width: 0.5rem;
  height: 0.5rem;
  position: absolute;
  top: 0.125rem;
  right: 0;
  border: 1px solid var(--color-theme-border-subtle);
  border-radius: 50%;
}

.arrow:first-child {
  position: relative;
}

.arrow:first-child::after {
  content: '';
  position: absolute;
  height: 1rem;
  width: 1rem;
  rotate: 45deg;
  background-color: inherit;
  bottom: -0.25rem;
  left: 0.666667rem;
}
</style>
