<template>
  <tlt-collapse-transition
    v-show="!collapsed"
    collapse-property="width"
    :duration="300"
  >
    <div class="bg-theme-bg-primary-3 w-18 leading-[normal] flex flex-col justify-between overflow-y-auto overflow-x-hidden">
      <div>
        <div
          test-id="desktop-expand-arrow"
          class="flex justify-center items-center mt-8 max-lg:hidden"
        >
          <button
            class="collapse-menu p-2 opacity-60 hocus:opacity-100"
            @click="$emit('toggleExpand')"
          >
            <tlt-icon
              icon="chevron-double"
              class="text-theme-text-on-primary"
              :class="{
                '-scale-x-100': collapsed
              }"
            />
          </button>
        </div>
        <div class="mt-21">
          <slot />
        </div>
      </div>
      <div
        v-if="!isGplBuild"
        class="shrink-0"
      >
        <primary-menu-item
          ref="more"
          icon="article"
          test-id="more-info-menu-item"
          @click="expanded = !expanded"
        />
        <tlt-content-box
          v-model:open="expanded"
          :target="() => moreButton?.$el"
          class="p-6 mt-0! w-67!"
          placement="top-start"
          strategy="fixed"
        >
          <h2 class="font-bold text-base mb-2">{{ $t('Quick useful sources') }}</h2>
          <p class="mb-6">{{ $t('You can find out more about the product or its configuration in our Elleco Networks pages.') }}</p>
          <ul class="*:first:pt-0 *:last:pb-0 *:py-2 divide-y">
            <li>
              <a
                class="flex items-center gap-2 text-theme-text-primary no-underline hover:underline cursor-pointer font-semibold text-sm"
                href="https://elleconet.com/faq/"
                target="_blank"
              >
                <tlt-icon icon="reference-all" />
                {{ $t('FAQ Documentation') }}
              </a>
            </li>
            <li>
              <a
                class="flex items-center gap-2 text-theme-text-primary no-underline hover:underline cursor-pointer font-semibold text-sm"
                href="https://elleconet.com/"
                target="_blank"
              >
                <tlt-icon icon="crowdsource" />
                {{ $t('Elleconet Networks') }}
              </a>
            </li>
          </ul>
        </tlt-content-box>
      </div>
    </div>
  </tlt-collapse-transition>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import PrimaryMenuItem from './PrimaryMenuItem.vue'

export interface Props {
  collapsed: boolean
}

defineProps<Props>()

defineEmits<{
  toggleExpand: []
}>()

const moreButton = useTemplateRef('more')

const expanded = ref(false)

const isGplBuild = import.meta.env.VITE_GPL_BUILD === '1'
</script>

<style>
@reference '@/theme.css';

.side-nav-bar:not(.collapsed) .collapse-menu svg {
  transform: scaleX(-1);
}
</style>
