import { type Meta, type StoryObj } from '@storybook/vue3-vite'
import type { ComponentProps } from 'vue-component-type-helpers'
import { fn } from 'storybook/test'
import { ref } from 'vue'

import { faker } from '@faker-js/faker'

import { TltTable } from './'
import type { DropdownOption } from '@ui-core/tlt-design/layout/TltDropdown.vue'
import type { TableColumn } from './types'

type TableProps = ComponentProps<typeof TltTable>

const columns: TableColumn[] = [
  { title: 'ID', dataIndex: 'id' },
  { title: 'City', dataIndex: 'city' },
  { title: 'Email', dataIndex: 'email', width: 'base' },
  { title: 'Phone', dataIndex: 'phone', width: 'base' },
  { title: 'Date', dataIndex: 'birthday', width: 'base' }
]
const columnsFilters: TableColumn[] = [
  { title: 'ID', dataIndex: 'id', actions: { sort: true, filter: { type: 'range' } } },
  { title: 'City', dataIndex: 'city', actions: { sort: true, filter: { type: 'uniqueValues' } }, displayFn: (value: string) => value.split('').reverse().join('') },
  { title: 'Email', dataIndex: 'email', width: 'base' },
  { title: 'Phone', dataIndex: 'phone', width: 'base' },
  { title: 'Date', dataIndex: 'birthday', width: 'base' }
]
const columnsBulkEdit: TableColumn[] = [
  { title: 'ID', dataIndex: 'id', actions: { sort: true, filter: { type: 'range' } } },
  { title: 'City', dataIndex: 'city', actions: { sort: true, filter: { type: 'uniqueValues' } } },
  {
    title: 'Email',
    dataIndex: 'email',
    width: 'base',
    actions: {
      bulk: {
        id: 'action-1',
        label: 'Change',
        options: [
          { key: 1, label: 'One' },
          { key: 2, label: 'Two' },
          { key: 3, label: 'Three' }
        ],
        callback: fn(),
        allowCreate: true
      }
    }
  },
  { title: 'Phone', dataIndex: 'phone', width: 'base' },
  { title: 'Date', dataIndex: 'birthday', width: 'base' }
]

const meta = {
  component: TltTable,
  render: args => ({
    setup() {
      return { args }
    },
    template: `
      <TltTable
        v-bind="args"
        @data-change="args.dataSource = $event"
      />
    `
  }),
  args: {
    columns: columnsFilters,
    dataSource: [],
    pagination: true
  }
} satisfies Meta<TableProps>

export default meta

type Story = StoryObj<typeof meta>

const sample = (array: any[]) => array[Math.floor(Math.random() * array.length)]

const birthdays = Array.from({ length: 365 }, () => faker.date.recent().toDateString())
const cities = Array.from({ length: 20 }, () => faker.location.city())

type Entry = { id: number; birthday: string; city: string; email: string; phone: string; _children?: Entry[] }

function createDataEntry(): Entry {
  return {
    id: faker.number.int({ max: 100000 }),
    birthday: sample(birthdays),
    city: sample(cities),
    email: faker.internet.email(),
    phone: faker.phone.number()
  }
}

const data = Array.from({ length: 250 }, createDataEntry)

export const Basic = {
  args: {
    id: 'story-table-basic',
    title: 'Basic table with pagination',
    columns,
    dataSource: data
  }
} satisfies Story

export const WithFilters = {
  args: {
    id: 'story-table-filter',
    title: 'Table with column filters',
    dataSource: data
  }
} satisfies Story

export const Empty = {
  args: {
    id: 'story-table-empty',
    title: 'Empty table'
  }
} satisfies Story

export const TableActions: Story = {
  render: args => ({
    setup() {
      const options = ref<DropdownOption[]>([
        { id: 'action-1', label: 'Action 1', callback: fn(), icon: 'add-circle' },
        { id: 'action-2', label: 'Action 2', callback: fn(), icon: 'arrow-down' },
        { id: 'action-3', label: 'Action 3', callback: fn(), icon: 'authorized', options: [{ label: 'test' }] }
      ])

      return { args, options }
    },
    template: `
      <TltTable
        v-bind="args"
        @data-change="args.dataSource = $event"
      >
        <template #more-actions>
          <TableAction
            id="more-actions"
            label="More Actions"
            :dropdown-options="options"
          />
        </template>
      </TltTable>
    `
  }),
  args: {
    id: 'story-table-actions',
    title: 'Table with custom actions',
    dataSource: data,
    tableActions: ['more-actions', { id: 'test', label: 'test', callback: fn(), buttonProps: { iconLeft: 'cloud' }, hints: [{ info: 'test' }] }, 'refresh']
  }
}

export const RowActions: Story = {
  args: {
    id: 'story-table-row-actions',
    title: 'Table with row actions',
    dataSource: data,
    rowActions() {
      return [
        { id: 'action-1', label: 'Edit', callback: fn(), buttonProps: { iconLeft: 'edit' } },
        { id: 'action-2', label: 'Delete', callback: fn(), buttonProps: { color: 'error' }, hints: [{ info: 'test hint' }] }
      ]
    }
  }
}

export const RowActionsDropdown: Story = {
  args: {
    id: 'story-table-dropdown-row-actions',
    title: 'Table with row actions in a dropdown',
    dataSource: data,
    rowActions() {
      return [
        { id: 'action-1', label: 'Edit', callback: fn(), buttonProps: { iconLeft: 'edit' } },
        { id: 'action-2', label: 'Delete', callback: fn(), buttonProps: { iconLeft: 'delete', color: 'error' } },
        { id: 'action-3', label: 'Export', callback: fn(), buttonProps: { iconLeft: 'upload-export', color: 'warning' } },
        { id: 'action-4', label: 'Action 4', callback: fn(), buttonProps: { iconLeft: 'download-import', disabled: true }, hints: { title: 'title', info: 'This button is disabled' } },
        { id: 'action-5', label: 'Action 5', callback: fn(), buttonProps: { iconLeft: 'download-import', readonly: true }, hints: [{ info: 'This button is readonly' }] },
        { id: 'action-1', label: 'Default', callback: fn(), buttonProps: { iconLeft: 'bell' } }
      ]
    }
  }
}

export const BulkActions: Story = {
  args: {
    id: 'story-table-bulk-actions',
    title: 'Table with bulk actions (checkboxes)',
    dataSource: data,
    bulkActions: [
      { id: 'delete', label: 'Delete', callback: fn(), buttonProps: { iconLeft: 'bell', color: 'error' } },
      { id: 'export', label: 'Export', callback: fn(), buttonProps: { iconLeft: 'download-import' } }
    ]
  }
}

export const BulkActionsDropdown: Story = {
  args: {
    id: 'story-table-bulk-actions',
    title: 'Table with bulk actions with a dropdown',
    dataSource: data,
    bulkActions: [
      { id: 'edit', label: 'Edit', callback: fn(), buttonProps: { iconLeft: 'edit' } },
      { id: 'delete', label: 'Delete', callback: fn(), buttonProps: { iconLeft: 'bell', color: 'error' } },
      { id: 'export', label: 'Export', callback: fn(), buttonProps: { iconLeft: 'download-import' } },
      { id: 'notify', label: 'Notify', callback: fn(), buttonProps: { iconLeft: 'bell', color: 'warning' } },
      { id: 'notify2', label: 'Notify', callback: fn(), buttonProps: { iconLeft: 'bell', color: 'warning' } }
    ]
  }
}

export const BulkUpdate: Story = {
  args: {
    id: 'story-table-bulk-update',
    title: 'Table with bulk updatable columns',
    dataSource: data,
    columns: columnsBulkEdit
  }
}

export const DragAndDrop = {
  args: {
    id: 'story-table-dnd',
    title: 'Table with drag and drop rows',
    dataSource: data.slice(0, 25),
    pagination: false,
    sortable: true
  }
} satisfies Story

function createNestedDataEntry(depth = 0) {
  const entry = createDataEntry()

  if (depth < 5 && Math.random() > 0.5) {
    const childrenCount = Math.floor(Math.random() * 5)
    entry._children = []
    for (let i = 0; i < childrenCount; i++) {
      entry._children.push(createNestedDataEntry(depth + 1))
    }
  }

  return entry
}

export const NestedRows = {
  args: {
    id: 'story-table-nested',
    title: 'Table with nested rows',
    dataSource: Array.from({ length: 10 }, () => createNestedDataEntry()),
    rowActions() {
      return [
        { id: 'action-1', label: 'Edit', callback: fn(r => console.log(r)), buttonProps: { iconLeft: 'edit' } },
        { id: 'action-2', label: 'Delete', callback: fn(r => console.log(r)), buttonProps: { color: 'error' }, hints: [{ info: 'test hint' }] }
      ]
    }
  }
} satisfies Story

export const SelectableRows = {
  args: {
    id: 'story-table-selectable-row',
    title: 'Table with selectable rows (single)',
    dataSource: data,
    selectable: true
  }
} satisfies Story

const lazyData = Array.from({ length: 5000 }, createDataEntry)

export const LazyPagination = {
  args: {
    id: 'story-table-lazy',
    title: 'Table with lazy pagination',
    dataSource: async ({ offset, limit, search, sorting, filter }) => {
      let filteredData = search ? lazyData.filter(entry => entry.email.toLowerCase().includes(search.toLowerCase())) : lazyData

      if (sorting) {
        const { sortby, orderby } = sorting as { sortby?: keyof Entry; orderby?: 'asc' | 'desc' }
        if (sortby && orderby) {
          filteredData.sort((a, b) => {
            if (!a[sortby] || !b[sortby]) return 0
            if (a[sortby] < b[sortby]) return orderby === 'asc' ? -1 : 1
            if (a[sortby] > b[sortby]) return orderby === 'asc' ? 1 : -1
            return 0
          })
        }
      }

      if (filter) {
        for (const [key, value] of Object.entries(filter)) {
          filteredData = filteredData.filter(entry => entry[key as keyof Entry] === value)
        }
      }

      const total = filteredData.length

      if (offset !== undefined && limit !== undefined) {
        filteredData = filteredData.slice(offset, offset + limit)
      }

      await new Promise(resolve => setTimeout(resolve, 200))

      return {
        data: filteredData,
        total
      }
    }
  }
} satisfies Story
