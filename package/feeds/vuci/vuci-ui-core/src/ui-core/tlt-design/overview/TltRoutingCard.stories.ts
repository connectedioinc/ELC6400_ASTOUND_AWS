import { type Meta, type StoryObj } from '@storybook/vue3-vite'
import type { ComponentProps } from 'vue-component-type-helpers'

import TltRoutingCard from './TltRoutingCard.vue'
import type { TableColumn } from '@ui-core/components/table/types'

type TltRoutingCardProps = ComponentProps<typeof TltRoutingCard>

const meta = {
  component: TltRoutingCard,
  render: args => ({
    setup() {
      return { args }
    },
    template: `
      <TltRoutingCard
        v-bind="args"
      />
    `
  }),
  args: {}
} satisfies Meta<TltRoutingCardProps>

export default meta

type Story = StoryObj<typeof meta>

const tableColumns: TableColumn[] = [
  {
    dataIndex: 'network',
    title: 'Network',
    actions: { sort: true }
  },
  { dataIndex: 'vrf', title: 'VRF' },
  {
    dataIndex: 'valid',
    title: 'Usage state',
    actions: { filter: { type: 'uniqueValues' } }
  }
]

const cardsColumns = [
  { name: 'id', label: 'Neighbor' },
  { name: 'bgpState', label: 'State' },
  { name: 'remoteAs', label: 'Remote AS' },
  { name: 'remoteRouterId', label: 'Remote ID' },
  { name: 'localAs', label: 'Local AS' },
  { name: 'hostLocal', label: 'Local host' },
  { name: 'bgpTimerUpString', label: 'Uptime' },
  { name: 'pathFrom', label: 'Path from' }
]

const cards = [
  {
    id: '1',
    data: {
      pathFrom: 'Internal',
      bgpState: 'active',
      remoteAs: '65001',
      remoteRouterId: '192.168.1.1',
      localAs: '65000',
      hostLocal: '10.0.0.1',
      acceptedPrefixCounter: '100',
      bgpTimerUpString: '1d 10h'
    },
    tableData: [
      {
        network: '192.168.1.0/24',
        vrf: '1/default',
        valid: 'valid'
      },
      {
        network: '10.0.0.0/24',
        vrf: '1/default',
        valid: 'valid'
      },
      {
        network: '172.16.0.0/16',
        vrf: '1/default',
        valid: 'invalid'
      },
      {
        network: '192.168.2.0/24',
        vrf: '2/guest',
        valid: 'valid'
      },
      {
        network: '10.1.1.0/24',
        vrf: '2/guest',
        valid: 'valid'
      }
    ]
  }
]

export const Default: Story = {
  args: {
    cardTitle: 'Routing Card',
    tableColumns,
    cardsColumns,
    cards,
    maxNumberOfColumnElements: 2
  }
}
