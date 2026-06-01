import type { Meta, StoryObj } from '@storybook/vue3-vite'
import type { ComponentProps } from 'vue-component-type-helpers'
import { fn } from 'storybook/test'

import Ports from './Ports.vue'
import PortsLegendItem from './PortsLegendItem.vue'
import type { PortData } from '@ui-core/tlt-design/form/core/TltPort.vue'

type PortsProps = ComponentProps<typeof Ports> & { portData: Record<string, PortData> }

const portData: Record<string, PortData> = {
  port1: {
    type: 'up',
    poe: 'enabled',
    extraIcon: { icon: 'aggregated', position: 'center', text: '2' }
  },
  port2: {
    type: 'down',
    poe: 'active',
    speed: 100,
    extraIcon: { icon: 'aggregated', position: 'center', text: '1' },
    error: 'Physical damage was made to the port.'
  },
  port3: {
    type: 'enabled',
    poe: 'disabled',
    speed: 1000,
    hint: [
      { title: 'Link speed', info: 'GbE' },
      { title: 'TX SUM', info: '%MB'.format(12000) },
      { title: 'RX SUM', info: '%MB'.format(12000) },
      { title: 'TX RATE', info: '%MBps'.format(12000) },
      { title: 'RX RATE', info: '%MBps'.format(12000) }
    ]
  },
  port4: {
    type: 'disabled'
  },
  port5: {
    type: 't',
    extraIcon: { icon: 'circle', class: 'text-lime-300' },
    speed: 2500
  },
  port6: {
    type: 'u',
    extraIcon: { icon: 'circle', class: 'text-lime-300' }
  },
  port7: {
    type: 'up'
  },
  port8: {
    type: 'down',
    extraIcon: [
      { icon: 'aggregated', position: 'center', text: '1' },
      { icon: 'tooltip', class: 'text-theme-text-primary', legend: { id: 'info', type: 'icon', icon: 'tooltip', class: 'text-theme-text-primary', text: 'Info', hint: 'Hint' } }
    ]
  },
  sfp1: {
    type: 'down',
    extraIcon: { icon: 'x-circle', class: 'text-theme-text-danger' },
    dimmed: true
  },
  sfp2: {
    type: 'down',
    readonly: true
  }
}

const meta = {
  component: Ports,
  subcomponents: { PortsLegendItem },
  render: args => ({
    setup() {
      return { args }
    },
    template: `
      <Ports
        v-bind="args"
      />
    `
  }),
  argTypes: {
    getPortData: { type: 'function' }
  },
  args: {
    legend: false,
    portData,
    getPortData: (portName: string) => portData[portName],
    customPorts: [
      { type: 'eth', name: 'port1', position: 'up', block: 'eth', num: '1' },
      { type: 'eth', name: 'port3', position: 'up', block: 'eth', num: '3' },
      { type: 'eth', name: 'port5', position: 'up', block: 'eth', num: '5' },
      { type: 'eth', name: 'port7', position: 'up', block: 'eth', num: '7' },
      { type: 'eth', name: 'port2', position: 'down', block: 'eth', num: '2' },
      { type: 'eth', name: 'port4', position: 'down', block: 'eth', num: '4' },
      { type: 'eth', name: 'port6', position: 'down', block: 'eth', num: '6' },
      { type: 'eth', name: 'port8', position: 'down', block: 'eth', num: '8' },
      { type: 'sfp', name: 'sfp1', position: 'down', block: 'sfp', num: '1' },
      { type: 'sfp', name: 'sfp2', position: 'up', block: 'sfp', num: '2' }
    ],
    portSize: 'size-10',
    multiple: false,
    inline: false,
    selectable: false,
    borderless: false,
    'onUpdate:modelValue': fn() as any,
    onPortclick: fn() as any
  }
} satisfies Meta<PortsProps>

export default meta

type Story = StoryObj<typeof meta>

export const Default = {} satisfies Story

export const AutoLegend = {
  args: {
    legend: true
  }
} satisfies Story

export const LegendInline = {
  args: {
    legend: true,
    inline: true
  }
} satisfies Story

export const SingleSelectable = {
  args: {
    multiple: false,
    selectable: true
  }
} satisfies Story

export const MultipleSelectable = {
  args: {
    multiple: true,
    selectable: true
  }
} satisfies Story

export const MultipleBlocks = {
  args: {
    customPorts: [
      { type: 'eth', name: 'port1', position: 'up', block: 'eth', num: '1' },
      { type: 'eth', name: 'port3', position: 'up', block: 'eth', num: '3' },
      { type: 'eth', name: 'port5', position: 'up', block: 'eth', num: '5' },
      { type: 'eth', name: 'port7', position: 'up', block: 'eth', num: '7' },
      { type: 'eth', name: 'port9', position: 'up', block: 'eth', num: '9' },
      { type: 'eth', name: 'port11', position: 'up', block: 'eth', num: '11' },
      { type: 'eth', name: 'port2', position: 'down', block: 'eth', num: '2' },
      { type: 'eth', name: 'port4', position: 'down', block: 'eth', num: '4' },
      { type: 'eth', name: 'port6', position: 'down', block: 'eth', num: '6' },
      { type: 'eth', name: 'port8', position: 'down', block: 'eth', num: '8' },
      { type: 'eth', name: 'port10', position: 'down', block: 'eth', num: '10' },
      { type: 'eth', name: 'port12', position: 'down', block: 'eth', num: '12' },
      { type: 'eth', name: 'port13', position: 'up', block: 'eth', num: '13' },
      { type: 'eth', name: 'port15', position: 'up', block: 'eth', num: '15' },
      { type: 'eth', name: 'port17', position: 'up', block: 'eth', num: '17' },
      { type: 'eth', name: 'port19', position: 'up', block: 'eth', num: '19' },
      { type: 'eth', name: 'port21', position: 'up', block: 'eth', num: '21' },
      { type: 'eth', name: 'port23', position: 'up', block: 'eth', num: '23' },
      { type: 'eth', name: 'port14', position: 'down', block: 'eth', num: '14' },
      { type: 'eth', name: 'port16', position: 'down', block: 'eth', num: '16' },
      { type: 'eth', name: 'port18', position: 'down', block: 'eth', num: '18' },
      { type: 'eth', name: 'port20', position: 'down', block: 'eth', num: '20' },
      { type: 'eth', name: 'port22', position: 'down', block: 'eth', num: '22' },
      { type: 'eth', name: 'port24', position: 'down', block: 'eth', num: '24' },
      { type: 'sfp', name: 'sfp1', position: 'down', block: 'sfp', num: '1' },
      { type: 'sfp', name: 'sfp2', position: 'up', block: 'sfp', num: '2' },
      { type: 'sfp', name: 'sfp3', position: 'down', block: 'sfp', num: '3' },
      { type: 'sfp', name: 'sfp4', position: 'up', block: 'sfp', num: '4' }
    ]
  }
} satisfies Story
