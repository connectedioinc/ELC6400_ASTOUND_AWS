import { type Meta, type StoryObj } from '@storybook/vue3-vite'

import ListLayout from './ListLayout.vue'
import TltCard from '@ui-core/tlt-design/layout/TltCard.vue'

const meta = {
  component: ListLayout,
  subcomponents: { TltCard }
} satisfies Meta<typeof ListLayout>

export default meta

type Story = StoryObj<typeof meta>

export const Default = {
  render: () => ({
    template: `
      <ListLayout bordered>
        <TltCard title="Card Title1">
          Card Content 1
        </TltCard>
        <TltCard title="Card Title2">
          Card Content 2
        </TltCard>
        <TltCard title="Card Title3">
          Card Content 3
        </TltCard>
        <TltCard title="Card Title4">
          Card Content 4
        </TltCard>
      </ListLayout>
    `
  })
} satisfies Story

export const FirstHidden = {
  render: () => ({
    template: `
      <ListLayout bordered>
        <TltCard v-show="false" title="Card Title1">
          Card Content 1
        </TltCard>
        <TltCard title="Card Title2">
          Card Content 2
        </TltCard>
        <TltCard title="Card Title3">
          Card Content 3
        </TltCard>
        <TltCard title="Card Title4">
          Card Content 4
        </TltCard>
        <div class="flex justify-end list-layout--ignore">
          <button>Button</button>
        </div>
      </ListLayout>
    `
  })
} satisfies Story

export const FirstTwoHidden = {
  render: () => ({
    template: `
      <ListLayout bordered>
        <TltCard v-show="false" title="Card Title1">
          Card Content 1
        </TltCard>
        <TltCard v-show="false" title="Card Title2">
          Card Content 2
        </TltCard>
        <TltCard title="Card Title3">
          Card Content 3
        </TltCard>
        <TltCard title="Card Title4">
          Card Content 4
        </TltCard>
        <div class="flex justify-end list-layout--ignore">
          <button>Button</button>
        </div>
      </ListLayout>
    `
  })
} satisfies Story

export const MiddleHidden = {
  render: () => ({
    template: `
      <ListLayout bordered>
        <TltCard title="Card Title1">
          Card Content 1
        </TltCard>
        <TltCard  title="Card Title2">
          Card Content 2
        </TltCard>
        <TltCard v-show="false" title="Card Title3">
          Card Content 3
        </TltCard>
        <TltCard title="Card Title4">
          Card Content 4
        </TltCard>
        <div class="flex justify-end list-layout--ignore">
          <button>Button</button>
        </div>
      </ListLayout>
    `
  })
} satisfies Story

export const MiddleHiddenMultiple = {
  render: () => ({
    template: `
      <ListLayout bordered>
        <TltCard title="Card Title 1">
          Card Content 1
        </TltCard>
        <TltCard v-show="false" title="Card Title 2">
          Card Content 2
        </TltCard>
        <TltCard title="Card Title 3">
          Card Content 3
        </TltCard>
        <TltCard v-show="false" title="Card Title 4">
          Card Content 4
        </TltCard>
        <TltCard title="Card Title5">
          Card Content 5
        </TltCard>
        <div class="flex justify-end list-layout--ignore">
          <button>Button</button>
        </div>
      </ListLayout>
    `
  })
} satisfies Story

export const Nested = {
  render: () => ({
    template: `
      <ListLayout bordered>
        <ListLayout bordered>
          <TltCard title="Card Title1">
            Card Content 1
          </TltCard>
          <TltCard  title="Card Title2">
            Card Content 2
          </TltCard>
          <TltCard title="Card Title3">
            Card Content 3
          </TltCard>
        </ListLayout>
        <TltCard title="Card Title4">
          Card Content 4
        </TltCard>
        <div class="flex justify-end list-layout--ignore">
          <button>Button</button>
        </div>
      </ListLayout>
    `
  })
} satisfies Story
