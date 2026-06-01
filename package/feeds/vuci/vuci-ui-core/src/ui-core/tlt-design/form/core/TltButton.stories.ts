import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import type { ComponentProps } from 'vue-component-type-helpers'

import TltButton from './TltButton.vue'

type ButtonProps = ComponentProps<typeof TltButton> & { text: string }

const meta: Meta<ButtonProps> = {
  component: TltButton,
  render: args => ({
    components: { TltButton },
    setup() {
      return { args }
    },
    template: `
      <TltButton v-bind="args">
        {{ args.text }}
      </TltButton>
    `
  }),
  args: {
    text: 'Button',
    block: false,
    loading: false,
    type: 'button',
    size: 'sm',
    color: 'primary',
    buttonType: 'button',
    disabled: false,
    onClick: fn()
  }
}

export default meta
type Story = StoryObj<ButtonProps>

export const Default: Story = {
  args: {
    text: 'Button'
  }
}
