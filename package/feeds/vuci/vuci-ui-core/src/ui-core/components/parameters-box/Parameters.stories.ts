// </template>

// <script setup lang="ts">

// </script>
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TParameters from './TParameters.vue'
import TParametersList from './TParametersList.vue'
import TParametersListItem from './TParametersListItem.vue'

const template = `
  <TParameters class="w-1/3">
    <div><strong>Rule description:</strong> UCI lets you get any parameter from the device’s configuration files. API should be used instead of UCI, whenever possible</div>
    <div>
      <strong>SMS Format:</strong>
      <TParametersList>
        <TParametersListItem :description="args.description" :parameter="args.parameter" />
        <TParametersListItem :parameter="args.parameter" />
      </TParametersList>
    </div>
  </TParameters>
`

const meta = {
  component: TParameters,
  subcomponents: {
    TParametersList,
    TParametersListItem
  },
  parameters: {
    docs: {
      source: {
        code: template
      }
    }
  },
  render: args => ({
    components: {
      TParameters,
      TParametersList,
      TParametersListItem
    },
    setup() {
      return { args, escapeString: (input: string) => input.replace(/</g, '&lt;').replace(/>/, '&gt;') }
    },
    template
  }),
  args: {
    description: 'test',
    parameter: ['test', 'other']
  }
} satisfies Meta<TParameters>

export default meta

export const Basic = {
  args: {}
} satisfies Story

type Story = StoryObj<typeof meta>
