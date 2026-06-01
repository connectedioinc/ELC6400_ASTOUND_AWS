import { type Meta, type StoryObj } from '@storybook/vue3-vite'
import type { ComponentProps } from 'vue-component-type-helpers'

import TltAlert from '@/components/Messenger/TltAlert.vue'

type NotificationsProps = ComponentProps<typeof TltAlert>

const meta = {
  component: TltAlert,
  render: args => ({
    components: { TltAlert },
    setup() {
      return { args }
    },
    template: `<TltAlert v-bind="args" />`
  })
} satisfies Meta<NotificationsProps>

export default meta

type Story = StoryObj<typeof meta>

export const Info = {
  args: {
    id: 'info-1',
    type: 'info',
    text: 'This is an info notification.'
  }
} satisfies Story

export const Success = {
  args: {
    id: 'success-1',
    type: 'success',
    text: 'This is a success notification.'
  }
} satisfies Story

export const Error = {
  args: {
    id: 'error-1',
    type: 'error',
    text: 'This is an error notification.'
  }
} satisfies Story

export const Warning = {
  args: {
    id: 'warning-1',
    type: 'warning',
    text: 'This is a warning notification.'
  }
} satisfies Story
