<template>
  <div
    ref="button"
    :test-id="`header-${elementId}-expand-dropdown`"
    :data-open="open"
    v-bind="$attrs"
  >
    <slot
      name="expand-btn"
      :open="open"
      :badge="badge"
    >
      <button
        type="button"
        class="max-lg:hidden group/icon flex items-center gap-1 rounded-full hover:bg-theme-bg-secondary-subtle-hover"
        :class="{ 'bg-theme-bg-primary-1!': open }"
        @click="open = !open"
      >
        <div
          class="bg-theme-bg-secondary-subtle rounded-full p-2 group-hover/icon:bg-transparent"
          :class="{ 'bg-transparent': open }"
        >
          <div
            :class="{
              'badge group-hover/icon:after:border-theme-bg-secondary-subtle-hover!': badge,
              'after:border-theme-border-primary!': badge && open
            }"
          >
            <slot
              name="icon"
              :open="open"
              :badge="badge"
            >
              <tlt-icon
                :icon="icon"
                :class="open ? 'text-theme-text-on-primary' : 'text-theme-text-primary'"
              />
            </slot>
          </div>
        </div>
        <tlt-icon
          icon="dropdown-arrow"
          class="mr-2"
          :class="open ? 'text-theme-text-on-primary rotate-180' : 'text-theme-text-primary'"
        />
      </button>
      <button
        type="button"
        class="lg:hidden p-1.5 rounded-full bg-theme-bg-secondary-subtle hover:bg-theme-bg-secondary-subtle-hover"
        :class="{
          'bg-theme-bg-primary-1!': open,
          'badge after:border-0!': badge
        }"
        @click.stop="open = !open"
      >
        <tlt-icon
          icon="more"
          class="size-6"
          :class="open ? 'text-theme-text-on-primary' : 'text-theme-text-primary'"
        />
      </button>
    </slot>
  </div>
  <tlt-content-box
    ref="box"
    v-model:open="open"
    :target="() => $refs.button"
    placement="bottom-end"
    class="py-0! w-auto! max-w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden"
    @after-leave="$emit('afterClose')"
  >
    <slot
      :open="open"
      :badge="badge"
      :close="close"
    />
  </tlt-content-box>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import type { Icon } from '@ui-core/tlt-design/icons/icon-types'
import TltContentBox from '@ui-core/tlt-design/layout/TltContentBox.vue'

export interface Props {
  elementId: string
  icon: Icon
  badge?: boolean
}

withDefaults(defineProps<Props>(), {
  badge: false
})

defineEmits<{
  afterClose: []
}>()

const open = defineModel<boolean>('open', { required: true })

function close() {
  open.value = false
}

const route = useRoute()
watch(
  () => route.path,
  (to, from) => {
    if (to !== from) close()
  }
)
</script>

<style scoped>
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
  border: 1px solid var(--color-theme-bg-secondary-subtle);
  border-radius: 50%;
}
</style>
