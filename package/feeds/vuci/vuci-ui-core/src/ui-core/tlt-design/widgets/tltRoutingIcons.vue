<template>
  <div class="flex gap-2">
    <template v-if="statusPath">
      <router-link
        v-if="!isString(statusPath) && !statusPath.readonly"
        ref="statusPath"
        :to="isString(statusPath) ? statusPath : statusPath.to"
      >
        <span class="sr-only">{{ $t('status') }}</span>
        <tlt-icon
          icon="info"
          class="size-5 text-theme-text-info"
        />
      </router-link>
      <span
        v-else
        ref="statusPath"
        class="cursor-default text-theme-text-subtle"
      >
        <span class="sr-only">{{ $t('status') }}</span>
        <tlt-icon
          icon="info"
          class="size-5"
        />
      </span>
    </template>
    <tlt-tooltip
      v-if="statusPathElement && !isString(statusPath) && statusPath.hint"
      :content="statusPath.hint"
      :target="targetFn(statusPathElement)"
    />
    <template v-if="servicesPath">
      <router-link
        v-if="!isString(servicesPath) && !servicesPath.readonly"
        ref="servicesPath"
        :to="isString(servicesPath) ? servicesPath : servicesPath.to"
      >
        <span class="sr-only">{{ $t('configure') }}</span>
        <tlt-icon
          icon="gear"
          class="size-5 text-theme-text-primary"
        />
      </router-link>
      <span
        v-else
        ref="servicesPath"
        class="cursor-default text-theme-text-subtle"
      >
        <span class="sr-only">{{ $t('configure') }}</span>
        <tlt-icon
          icon="gear"
          class="size-5"
        />
      </span>
    </template>
    <tlt-tooltip
      v-if="servicesPathElement && !isString(servicesPath) && servicesPath.hint"
      :content="servicesPath.hint"
      :target="targetFn(servicesPathElement)"
    />
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, type Component } from 'vue'
import { unrefElement } from '@vueuse/core'
import { isString } from '@ui-core/utils/inspect'

export interface Path {
  to: string
  readonly?: boolean
  hint?: string
}

export interface Props {
  servicesPath?: string | Path
  statusPath?: string | Path
}

withDefaults(defineProps<Props>(), {
  servicesPath: undefined,
  statusPath: undefined
})

const servicesPathElement = useTemplateRef('servicesPath')
const statusPathElement = useTemplateRef('statusPath')

function targetFn(element: Component | HTMLElement | null) {
  return () => unrefElement(element)
}
</script>
