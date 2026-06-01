import { type Meta, type StoryObj } from '@storybook/vue3-vite'
import type { ComponentProps } from 'vue-component-type-helpers'
import { ref } from 'vue'

import TltTabs from './TltTabs.vue'

type TabsProps = ComponentProps<typeof TltTabs>

const meta = {
  component: TltTabs,
  render: args => ({
    setup() {
      return { args }
    },
    template: `
      <TltTabs
        v-bind="args"
      >
        <template v-for="tab of args.tabs" :key="tab.name" #[tab.name]>
          <div class="p-4">
            <h1 class="text-2xl font-bold mb-2">Tab {{ tab.name }}</h1>
            <p class="text-theme-text-secondary-subtle">This is the content of Tab {{ tab.name }}.</p>
          </div>
        </template>
      </TltTabs>
    `
  }),
  args: {
    tabs: [
      { name: '1', title: 'Tab 1' },
      { name: '2', title: 'Tab 2' },
      { name: '3', title: 'Tab 3' }
    ]
  }
} satisfies Meta<TabsProps>

export default meta

type Story = StoryObj<typeof meta>

export const Basic = {
  args: {
    inner: false
  }
} satisfies Story

export const Inner = {
  args: {}
} satisfies Story

export const ALotOfTabs = {
  args: {
    inner: false,
    tabs: Array.from({ length: 50 }, (_, i) => ({
      name: `${i + 1}`,
      title: `Tab ${i + 1}`
    }))
  }
} satisfies Story

export const VModel = {
  render: args => ({
    setup() {
      const selected = ref(args.tabs[0]?.name)

      function nextTab() {
        const tabIndex = args.tabs.findIndex(tab => tab.name === selected.value)
        selected.value = args.tabs[(tabIndex + 1) % args.tabs.length]?.name
      }

      return { args, selected, nextTab }
    },
    template: `
    <div
      class="mb-4 flex gap-8 items-center"
    >
      <button
        type="button"
        class="border rounded-sm p-2"
        @click="nextTab"
      >
        Cycle Tabs
      </button>
      Current tab: {{ selected }}
    </div>
      <TltTabs
        v-model:selected="selected"
        v-bind="args"
      >
        <template v-for="tab of args.tabs" :key="tab.name" #[tab.name]>
          <div class="p-4">
            <h1 class="text-2xl font-bold mb-2">Tab {{ tab.name }}</h1>
            <p class="text-theme-text-secondary-subtle">This is the content of Tab {{ tab.name }}.</p>
          </div>
        </template>
      </TltTabs>
    `
  }),
  args: {
    inner: false
  }
} satisfies Story

export const SingleSlot = {
  render: args => ({
    setup() {
      return { args }
    },
    template: `
      <TltTabs
        v-slot="{ tab }"
        v-bind="args"
      >
        <div class="p-4">
          <h1 class="text-2xl font-bold mb-2">Single Slot Content</h1>
          <p class="text-theme-text-secondary-subtle">This is the content of the single slot.</p>
          <p>Selected tab name: {{ tab }}</p>
        </div>
      </TltTabs>
    `
  }),
  args: {
    inner: false
  }
} satisfies Story

export const Indicators = {
  args: {
    inner: false,
    tabs: Array.from({ length: 50 }, (_, i) => ({
      name: `${i + 1}`,
      title: `Tab ${i + 1}`
    })),
    indicators: {
      '2': { type: 'info', hints: { info: 'This is an info indicator for Tab 1' } },
      '3': { type: 'warning', hints: { info: 'This is a warning indicator for Tab 2' } },
      '4': { type: 'error', hints: { info: 'This is an error indicator for Tab 3' } },
      '11': { type: 'info', hints: { info: 'This is an info indicator for Tab 11' } },
      '12': { type: 'warning', hints: { info: 'This is a warning indicator for Tab 12' } },
      '13': { type: 'error', hints: { info: 'This is an error indicator for Tab 13' } }
    }
  }
} satisfies Story
