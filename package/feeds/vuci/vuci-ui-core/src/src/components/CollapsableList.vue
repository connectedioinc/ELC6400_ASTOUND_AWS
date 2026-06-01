<template>
  <div>
    <TltButton
      type="text"
      size="lg"
      class="gap-1!"
      @click="expanded = !expanded"
    >
      <slot
        name="text"
        :expanded="expanded"
      >
        {{ expanded ? collapseText : expandText }}
      </slot>
      <TltIcon
        icon="dropdown-arrow"
        :class="{ 'rotate-180': expanded }"
        class="transition-transform"
      />
    </TltButton>
  </div>
  <TltCollapseTransition>
    <div
      v-if="expanded"
      class="overflow-hidden text-body-secondary text-theme-text-base"
    >
      <ul class="py-6 px-4 divide-y divide-solid border-theme-border-subtle bg-theme-bg-secondary-subtle mt-1">
        <li
          v-for="item in items"
          :key="item.label"
          class="flex py-3 first:pt-0 last:pb-0 min-w-0"
        >
          <strong class="mr-4">{{ item.label }}</strong>
          <TltOverflowHint class="ml-auto">{{ item.value }}</TltOverflowHint>
          <TltButton
            :id="`${item.label}-copy`"
            type="icon"
            icon="copy"
            color="tertiary"
            class="-my-1"
            @click="$copyToClipboard(item.value)"
          />
          <TltTooltip
            :target="`#${item.label}-copy`"
            placement="left"
            triggers="click"
          >
            {{ $t('Copied!') }}
          </TltTooltip>
        </li>
      </ul>
    </div>
  </TltCollapseTransition>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TltCollapseTransition from '@ui-core/tlt-design/layout/tltCollapseTransition.vue'
import TltOverflowHint from '@ui-core/tlt-design/widgets/tltOverflowHint.vue'

export interface ListItem {
  label: string
  value: string
}

export interface Props {
  items: ListItem[]
  expandText?: string
  collapseText?: string
}

defineProps<Props>()

const expanded = ref(false)
</script>
