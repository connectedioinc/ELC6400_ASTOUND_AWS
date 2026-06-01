<!-- eslint-disable vue/no-v-html -->
<template>
  <div
    :test-id="`alert-${id}`"
    :class="{
      'text-body-secondary py-5 px-4': inline,
      'text-body-main py-6 px-5': !inline,
      'border-theme-border-info bg-theme-bg-info-subtle': type === 'info',
      'border-theme-border-warning-subtle bg-theme-bg-warning-subtle': type === 'warning',
      'border-theme-border-danger-subtle bg-theme-bg-danger-subtle': type === 'error',
      'border-theme-border-success bg-theme-bg-success-subtle': type === 'success'
    }"
    class="bg-clip-padding border text-theme-text-base font-sans flex flex-nowrap gap-4 rounded-sm"
  >
    <div class="flex flex-wrap gap-4 grow">
      <tlt-icon
        :icon="type"
        :class="{
          'text-theme-text-info': type === 'info',
          'text-theme-text-warning': type === 'warning',
          'text-theme-text-danger': type === 'error',
          'text-theme-text-success': type === 'success'
        }"
        class="size-6"
      />
      <div
        class="grow flex gap-4 basis-2/3"
        :class="inline ? 'flex-col' : 'max-md:flex-col md:items-center md:justify-between'"
      >
        <div>
          <slot name="title">
            <template v-if="isFunction(title)">
              <component :is="title" />
            </template>
            <template v-else>
              <h2
                v-if="rawHtml"
                class="font-semibold"
                :class="{
                  'text-theme-text-info': type === 'info',
                  'text-theme-text-warning': type === 'warning',
                  'text-theme-text-danger': type === 'error',
                  'text-theme-text-success': type === 'success'
                }"
                v-html="$xss(title)"
              />
              <h2
                v-else
                class="font-semibold"
                :class="{
                  'text-theme-text-info': type === 'info',
                  'text-theme-text-warning': type === 'warning',
                  'text-theme-text-danger': type === 'error',
                  'text-theme-text-success': type === 'success'
                }"
                v-text="title"
              />
            </template>
          </slot>
          <slot>
            <template v-if="isFunction(text)">
              <component :is="text" />
            </template>
            <template v-else-if="text">
              <p
                v-if="rawHtml"
                class="font-normal max-w-full break-normal"
                v-html="$xss(text)"
              />
              <p
                v-else
                class="font-normal max-w-full break-normal"
                v-text="text"
              />
            </template>
          </slot>
        </div>
        <slot
          name="actions"
          :actions="normalizedActions"
        >
          <div
            v-if="action"
            class="flex flex-wrap gap-2 items-center"
            :class="!inline && 'md:justify-end'"
          >
            <template v-if="isFunction(action)">
              <component :is="action" />
            </template>
            <template
              v-for="(_action, index) of normalizedActions"
              v-else-if="action"
              :key="index"
            >
              <router-link
                v-if="_action.to"
                v-slot="{ href, navigate }"
                :to="_action.to"
                custom
              >
                <a
                  :href="href"
                  class="no-underline"
                  @click.prevent="!_action.disabled && navigate()"
                >
                  <tlt-button
                    :type="_action.type || (inline ? 'text' : 'button')"
                    :color="buttonColor"
                    :disabled="_action.disabled ?? false"
                    size="md"
                    @click="_action.onClick"
                  >
                    {{ _action.text }}
                  </tlt-button>
                </a>
              </router-link>
              <a
                v-else-if="_action.href"
                :href="_action.href"
                target="_blank"
                class="no-underline"
              >
                <tlt-button
                  :type="_action.type || (inline ? 'text' : 'button')"
                  :color="buttonColor"
                  :disabled="_action.disabled ?? false"
                  size="md"
                  @click="_action.onClick"
                >
                  {{ _action.text }}
                </tlt-button>
              </a>
              <tlt-button
                v-else
                :type="_action.type || (inline ? 'text' : 'button')"
                :color="buttonColor"
                :disabled="_action.disabled ?? false"
                size="md"
                @click="_action.onClick"
              >
                {{ _action.text }}
              </tlt-button>
            </template>
          </div>
        </slot>
      </div>
    </div>
    <div
      class="flex max-md:self-start"
      :class="{ 'items-center': !inline }"
    >
      <tlt-button
        v-if="hasClose"
        type="text"
        icon="x"
        color="secondary"
        size="lg"
        :disabled="false"
        @click="emit('close')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type RenderFunction } from 'vue'
import type { AlertAction } from '@/stores/messages'
import { isArray, isFunction } from '@ui-core/utils/inspect'

export interface Props {
  id: number | string
  type?: 'error' | 'info' | 'warning' | 'success'
  title?: string | RenderFunction
  text?: string | RenderFunction
  hasClose?: boolean
  inline?: boolean
  action?: AlertAction | AlertAction[] | null | RenderFunction
  rawHtml?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  title: '',
  text: '',
  hasClose: false,
  inline: false,
  action: null,
  rawHtml: false
})

const emit = defineEmits<{
  close: []
}>()

const normalizedActions = computed(() => {
  if (!props.action || isFunction(props.action)) return []
  if (isArray(props.action)) return props.action
  return [props.action]
})

const buttonColor = computed(() => {
  if (props.inline) return 'primary'

  switch (props.type) {
    case 'info':
    default:
      return 'primary'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'success':
      return 'success'
  }
})
</script>
