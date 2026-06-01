import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { ComponentProps } from 'vue-component-type-helpers'

import { provide, ref } from 'vue'
import { KEY_MAX_LEN } from './_shared/constants'
import tltTextArea from './tltTextArea.vue'

type TextAreaProps = ComponentProps<typeof tltTextArea> & { text: string }

const meta: Meta<TextAreaProps> = {
  component: tltTextArea,
  render: args => ({
    components: { tltTextArea },
    setup() {
      return { args }
    },
    template: `
      <div>
        <tltTextArea v-bind="args" />
      </div>
    `
  }),
  args: {
    modelValue:
      `lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`.repeat(
        5
      )
  }
}

export default meta
type Story = StoryObj<TextAreaProps>

export const Default: Story = {
  args: {}
}

export const Copy: Story = {
  args: {
    copyButton: true
  }
}

export const AutoGrow: Story = {
  render: args => ({
    components: { tltTextArea },
    setup() {
      return { args }
    },
    template: `
      <div class="max-h-100">
        <tltTextArea v-bind="args" />
      </div>
    `
  }),
  args: {
    autoGrow: true
  }
}

export const Counter: Story = {
  render: args => ({
    components: { tltTextArea },
    setup() {
      provide(KEY_MAX_LEN, ref(500))
      return { args }
    },
    template: `
      <div>
        <tltTextArea v-bind="args" />
      </div>
    `
  })
}
