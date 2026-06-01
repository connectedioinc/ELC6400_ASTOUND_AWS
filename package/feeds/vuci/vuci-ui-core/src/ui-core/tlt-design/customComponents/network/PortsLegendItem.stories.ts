import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PortsLegendItem from './PortsLegendItem.vue'

const meta = {
  component: PortsLegendItem
} satisfies Meta<typeof PortsLegendItem>

export default meta

export const Predefined = {
  render: args => ({
    setup() {
      return { args }
    },
    template: `
      <div class="flex">
        <PortsLegendItem v-bind="args" />
      </div>
    `
  }),
  argTypes: {
    item: {
      options: [
        'portUp',
        'portDown',
        'portEnabled',
        'portDisabled',
        'speedFe',
        'speedGbe',
        'speed2Gbe',
        'tagSfp',
        'vlanTagged',
        'vlanUntagged',
        'errors',
        'poeEnabled',
        'poeDisabled',
        'poeActive',
        'portAggregated',
        'portIndividual'
      ]
    }
  },
  args: {
    item: 'portUp'
  }
} satisfies StoryObj<typeof meta>
