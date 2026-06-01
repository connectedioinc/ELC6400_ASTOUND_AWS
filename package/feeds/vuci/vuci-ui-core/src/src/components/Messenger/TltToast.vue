<template>
  <div
    :class="{
      'after:bg-theme-bg-success': props.type === 'success',
      'after:bg-theme-bg-danger': props.type === 'error',
      'after:bg-theme-bg-info': props.type === 'info',
      'after:bg-theme-bg-warning': props.type === 'warning'
    }"
    class="toast overflow-hidden text-body-main text-theme-text-base font-sans rounded-lg shadow-lg"
  >
    <div class="flex gap-2 py-6 px-5 bg-theme-bg-floating">
      <slot name="icon">
        <tlt-icon
          :icon="props.type === 'error' ? 'x-circle' : props.type"
          :class="{
            'text-theme-text-success': props.type === 'success',
            'text-theme-text-danger': props.type === 'error',
            'text-theme-text-info': props.type === 'info',
            'text-theme-text-warning': props.type === 'warning'
          }"
          class="min-h-6 min-w-6"
          solid
        />
      </slot>
      <div class="min-w-0">
        <slot name="title">
          <h2
            v-if="props.title"
            class="font-semibold text-theme-text-base w-fit"
          >
            {{ props.title }}
          </h2>
        </slot>
        <div class="h-auto">
          <slot
            v-if="props.text"
            name="message"
          >
            <p
              v-show="showText"
              class="overflow-hidden text-ellipsis font-normal max-w-full break-words"
            >
              {{ truncatedText }}
            </p>
          </slot>
        </div>
        <tlt-button
          v-if="expandable"
          class="mt-1"
          type="text"
          :disabled="false"
          @click="expanded = !expanded"
        >
          <tlt-icon
            icon="dropdown-arrow"
            :class="{ 'rotate-180': expanded }"
          />
          {{ !expanded ? $t('Show more') : $t('Show less') }}
        </tlt-button>
      </div>
      <div class="ml-auto">
        <button
          v-if="props.hasClose"
          type="button"
          class="hover:text-theme-text-base"
          @click="emit('close')"
        >
          <tlt-icon
            icon="x"
            class="w-6 h-6"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface Props {
  type?: 'success' | 'error' | 'info' | 'warning'
  title?: string
  text?: string
  hasClose?: boolean
  characterLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success',
  title: '',
  text: '',
  hasClose: false,
  characterLimit: 64
})

const emit = defineEmits<{
  close: []
}>()

const expanded = ref(false)
const expandable = computed(() => props.text.length > props.characterLimit)
const showText = computed(() => (!!props.title && expandable.value ? expanded.value : true))
const truncatedText = computed(() => (expandable.value && !expanded.value ? `${props.text.slice(0, props.characterLimit)}...` : props.text))
</script>

<style scoped>
.toast {
  position: relative;
}
.toast::after {
  content: ' ';
  position: absolute;
  width: 0.5rem;
  height: 100%;
  top: 0;
  left: 0;
}
</style>
