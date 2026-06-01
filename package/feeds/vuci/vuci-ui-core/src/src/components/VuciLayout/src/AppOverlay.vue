<template>
  <section
    class="fixed top-[var(--header-height)] sm:right-12 right-6 z-11 max-content-width w-full"
    :class="{ 'z-30': $store.modalOpen }"
  >
    <transition-group
      name="list"
      tag="div"
      class="*:mb-2 *:last:mb-0 sm:max-w-sm relative w-full mt-2 lg:mt-4"
      test-id="toast-message-wrapper"
    >
      <template
        v-for="message of combinedMessages"
        :key="message.options.id"
      >
        <tlt-alert
          v-if="message.type === 'notification'"
          v-bind="message.options"
          class="w-full bg-theme-bg-floating! text-body-main! shadow-lg border border-theme-border-subtle! py-6!"
          has-close
          inline
          @close="message.options.status = 'read'"
        />
        <tlt-toast
          v-else
          v-bind="message.options"
          class="w-full"
          has-close
          @close="$message.remove(message.options)"
          @mouseenter="message.options.timer?.stop()"
          @mouseleave="message.options.timer?.restart()"
        />
      </template>
    </transition-group>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import TltToast from '@/components/Messenger/TltToast.vue'
import TltAlert from '@/components/Messenger/TltAlert.vue'
import { useNotifications, useMessages } from '@/stores/messages'

const messagesStore = useMessages()
const notificationsStore = useNotifications()

const combinedMessages = computed(() => {
  const alerts = notificationsStore.notifications.filter(notification => notification.status === 'new').map(alert => ({ type: 'notification' as const, options: alert }))
  const toasts = messagesStore.messages.map(message => ({ type: 'toast' as const, options: message }))
  return [...alerts, ...toasts].sort((a, b) => (b.options.timestamp ?? 0) - (a.options.timestamp ?? 0))
})

watch(combinedMessages, messages => {
  if (messages.length <= 3) return
  const lastMessage = messages.at(-1)
  if (!lastMessage) return
  if (lastMessage.type === 'notification') lastMessage.options.status = 'unread'
  else messagesStore.remove(lastMessage.options)
})
</script>

<style scoped>
.max-content-width {
  max-width: min(var(--container-sm), calc(100vw - 3rem));
}
</style>
