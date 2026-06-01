import { type Meta, type StoryObj } from '@storybook/vue3-vite'
import type { ComponentProps } from 'vue-component-type-helpers'

import VuciNotifications from '../VuciLayout/src/VuciNotifications.vue'
import AppOverlay from '../VuciLayout/src/AppOverlay.vue'
import { useNotifications } from '@/stores/messages'

type NotificationsProps = ComponentProps<typeof VuciNotifications>

const meta = {
  component: VuciNotifications,
  subcomponents: { AppOverlay },
  render: args => ({
    components: { VuciNotifications, AppOverlay },
    setup() {
      return { args }
    },
    template: `
    <div>
      <VuciNotifications v-bind="args" class="border" />
    </div>
`
  }),
  args: {
    notifications: []
  }
} satisfies Meta<NotificationsProps>

export default meta

type Story = StoryObj<typeof meta>

export const Info = {
  args: {
    notifications: [{ id: 1, type: 'info', text: 'This is an info notification.' }]
  }
} satisfies Story

export const Success = {
  args: {
    notifications: [{ id: 2, type: 'success', text: 'This is a success notification.' }]
  }
} satisfies Story

export const Error = {
  args: {
    notifications: [{ id: 3, type: 'error', text: 'This is an error notification.' }]
  }
} satisfies Story

export const Warning = {
  args: {
    notifications: [{ id: 4, type: 'warning', text: 'This is a warning notification.' }]
  }
} satisfies Story

export const All = {
  args: {
    notifications: [
      { id: 1, type: 'info', text: 'This is an info notification.' },
      { id: 2, type: 'success', text: 'This is a success notification.' },
      { id: 3, type: 'error', text: 'This is an error notification.' },
      { id: 4, type: 'warning', text: 'This is a warning notification.' }
    ]
  }
} satisfies Story

export const Interactive = {
  render: args => ({
    components: { VuciNotifications, AppOverlay },
    setup() {
      const notificationsStore = useNotifications()
      notificationsStore.notifications = args.notifications || []
      return { args, notificationsStore }
    },
    template: `
    <div class="flex gap-2">
      <TltButton color="primary" @click="notificationsStore.info('This is an info message!')">Add Info Notification</TltButton>
      <TltButton color="success" @click="notificationsStore.success('This is a success message!')">Add Success Notification</TltButton>
      <TltButton color="error" @click="notificationsStore.error('This is an error message!')">Add Error Notification</TltButton>
      <TltButton color="warning" @click="notificationsStore.warning('This is a warning message!')">Add Warning Notification</TltButton>
      <TltButton color="secondary" @click="notificationsStore.$reset">Clear Notifications</TltButton>
    </div>
    <hr class="my-4" />
    <div class="flex flex-row flex-1">
      <div class="pr-4 border-r flex-1 flex justify-end">
        <AppOverlay class="static!" />
      </div>
      <div class="pl-4 flex-1">
        <div class="flex flex-col">
          <VuciNotifications :notifications="notificationsStore.newNotifications" class="border flex-1" />
        </div>
      </div>
    </div>
`
  })
} satisfies Story
