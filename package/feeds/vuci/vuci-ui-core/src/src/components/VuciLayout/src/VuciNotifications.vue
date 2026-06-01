<template>
  <div class="w-[min(24rem,calc(100vw-2.5rem))] h-full text-sm text-theme-text-secondary-subtle flex flex-col min-h-24">
    <div class="flex items-center gap-2 justify-between px-4 py-4 lg:px-5">
      <tlt-button
        v-if="backButton"
        button-id="back"
        type="text"
        color="secondary"
        icon="arrow-down"
        size="lg"
        class="rotate-90 text-inherit"
        :disabled="false"
        @click="onBack"
      />
      <span class="font-semibold mr-auto">{{ $t('Notifications') }}</span>
      <tlt-button
        v-if="notifications.length"
        button-id="clear-all"
        type="text"
        color="secondary"
        class="font-normal!"
        :disabled="false"
        @click="clearAll"
      >
        {{ $t('Clear all') }}
      </tlt-button>
    </div>
    <div class="overflow-y-auto divide-y! divide-theme-border-subtle">
      <div
        v-if="!notifications.length"
        class="flex items-center gap-2.5 px-4 py-4 lg:px-5 border-t"
      >
        <tlt-icon icon="bell" />
        {{ $t('You currently have no notifications') }}
      </div>
      <tlt-alert
        v-for="notification of notifications"
        v-else
        :key="notification.id"
        v-bind="notification"
        has-close
        inline
        class="rounded-none! border-0 border-theme-border-base! bg-theme-bg-floating!"
        @close="notificationsStore.remove(notification.id)"
      >
        <template #actions="{ actions }">
          <div class="w-full flex flex-col gap-2">
            <div class="text-theme-text-subtle">
              <span v-if="notification.timestamp">
                {{ $localDate(notification.timestamp / 1000, { format: 'MMM, D HH:mm' }) }}
              </span>
              <template v-if="notification.origin">
                <span class="mx-2 select-none">|</span>
                <span>
                  {{ notification.origin }}
                </span>
              </template>
            </div>
            <div
              v-if="notification.action"
              class="flex flex-wrap gap-2 items-center"
            >
              <template v-if="isFunction(notification.action)">
                <component :is="notification.action" />
              </template>
              <template
                v-for="(_action, index) of actions"
                v-else-if="notification.action"
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
                      :type="_action.type || 'text'"
                      :color="notification.type === 'info' || _action.type !== 'button' ? 'primary' : 'error'"
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
                    :type="_action.type || 'text'"
                    :color="notification.type === 'info' || _action.type === 'text' ? 'primary' : 'error'"
                    :disabled="_action.disabled ?? false"
                    size="md"
                    @click="_action.onClick"
                  >
                    {{ _action.text }}
                  </tlt-button>
                </a>
                <tlt-button
                  v-else
                  :type="_action.type || 'text'"
                  :color="notification.type === 'info' || _action.type !== 'button' ? 'primary' : 'error'"
                  :disabled="_action.disabled ?? false"
                  size="md"
                  @click="_action.onClick"
                >
                  {{ _action.text }}
                </tlt-button>
              </template>
            </div>
          </div>
        </template>
      </tlt-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useNotifications, type Notification } from '@/stores/messages'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { isFunction } from '@ui-core/utils/inspect'

export interface Props {
  notifications: Notification[]
  backButton?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
}>()

const notificationsStore = useNotifications()

function clearAll() {
  for (const notification of props.notifications) {
    notificationsStore.remove(notification.id)
  }
}

function onBack() {
  emit('back')
}
</script>
