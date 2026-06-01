import { ref, nextTick, reactive } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import * as TableComponents from '../'
import FormFilterPreset from '@ui-core/tlt-design/presets/FormFilterPreset.vue'
import FormFilterColumns from '@ui-core/tlt-design/presets/FormFilterColumns.vue'
import FormFilterColumn from '@ui-core/tlt-design/presets/FormFilterColumn.vue'
import FormUniqueValues from '@ui-core/tlt-design/presets/FormUniqueValues.vue'
import FormRange from '@ui-core/tlt-design/presets/FormRange.vue'
import FormSort from '@ui-core/tlt-design/presets/FormSort.vue'
import FormBulkActions from '@ui-core/tlt-design/presets/FormBulkActions.vue'
import TltSearchForm from '@ui-core/tlt-design/form/core/TltSearchForm.vue'
import TltDnd from '@ui-core/tlt-design/layout/TltDnd.vue'
import TltCard from '@ui-core/tlt-design/layout/TltCard.vue'
import TltButton from '@ui-core/tlt-design/form/core/TltButton.vue'
import TltPagination from '@ui-core/tlt-design/layout/TltPagination.vue'
import TltInputSearch from '@ui-core/tlt-design/form/core/tltInputSearch.vue'
import TltInput from '@ui-core/tlt-design/form/core/tltInput.vue'
import ConditionalWrapper from '@ui-core/components/ConditionalWrapper.vue'
import ListLayout from '@ui-core/components/layout/ListLayout.vue'
import Empty from '@ui-core/components/layout/Empty.vue'
import utils from '@/plugins/utils'
import { mergeDeep } from '@ui-core/tests/unit/mockFactory'
import TltDropdown from '@ui-core/tlt-design/layout/TltDropdown.vue'
import TltOptionGroup from '@ui-core/tlt-design/layout/TltOptionGroup.vue'
import TltCheckBox from '@ui-core/tlt-design/form/core/TltCheckBox.vue'
import { useLocalStorage } from '@vueuse/core'

vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: {
        request: { use: () => {} },
        response: { use: () => {} }
      }
    })
  },
  isAxiosError: () => {}
}))

vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    useRouter: () => ({
      currentRoute: ref('')
    }),
    useRoute: () =>
      reactive({
        path: '',
        query: {}
      })
  }
})

vi.mock('@vueuse/core', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    useLocalStorage: vi.fn((_: string, initialValue: object) => ref(initialValue))
  }
})

vi.mock('@vueuse/router', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...(actual as any),
    useRouteQuery: vi.fn((key: string) => ref(''))
  }
})

type MountingOptions = ComponentMountingOptions<typeof TableComponents.TltTable>

const createWrapper = (props: Partial<MountingOptions['props']> = {}, options: Partial<MountingOptions> = {}) => {
  const mainStore = {
    readOnlyPage: false
  }

  const piniaStore = createTestingPinia({
    initialState: {
      main: mainStore
    }
  })

  const defaultOptions = {
    global: {
      plugins: [piniaStore, utils],
      stubs: {
        TltIcon: true,
        TltPopover: true,
        TltCollapseTransition: { template: '<div><slot /></div>' },
        TltContentBox: { template: '<div><slot /></div>' },
        TltTooltip: { template: '<div><slot /></div>' },
        TltSelect: { template: '<div><slot /></div>' },
        TltHint: { template: '<span><slot /></span>' },
        TltOverflowHint: { template: '<span><slot /></span>' }
      },
      components: {
        ...TableComponents,
        FormFilterPreset,
        FormFilterColumns,
        FormFilterColumn,
        FormSort,
        FormRange,
        FormUniqueValues,
        FormBulkActions,
        TltDnd,
        TltCard,
        TltSearchForm,
        TltButton,
        TltPagination,
        ConditionalWrapper,
        TltInputSearch,
        TltInput,
        ListLayout,
        Empty,
        TltDropdown,
        TltOptionGroup,
        TltCheckBox
      },
      mocks: {
        $t: (key: string) => key,
        $store: mainStore,
        $log: (msg: string) => console.log(msg)
      }
    },
    props: {
      id: 'table',
      columns: [{ dataIndex: 'name' }, { dataIndex: 'age' }, { dataIndex: 'email' }],
      dataSource: [],
      ...props
    }
  }

  return mount(TableComponents.TltTable, mergeDeep(defaultOptions, options))
}

describe('TltTable', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders table element', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('renders correct number of columns', () => {
    const columns = [{ dataIndex: 'name' }, { dataIndex: 'age' }, { dataIndex: 'email' }]
    const wrapper = createWrapper({ columns })

    expect(wrapper.findAll('th').length).toBe(3)
  })

  it('renders correct column headers', () => {
    const columns = [
      { dataIndex: 'name', title: 'Name' },
      { dataIndex: 'age', title: 'Age' },
      { dataIndex: 'email', title: 'Email' }
    ]
    const wrapper = createWrapper({ columns })

    const headers = wrapper.findAll('th').map(header => header.text())

    expect(headers).toEqual(['Name', 'Age', 'Email'])
  })

  it('renders empty row when dataSource is empty', () => {
    const wrapper = createWrapper()

    expect(wrapper.findAll('tbody tr').length).toBe(1)
    expect(wrapper.text()).toContain('This section contains no values yet')
  })

  it('renders rows when dataSource is provided', async () => {
    const dataSource = [
      { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
      { id: 2, name: 'Jane Doe', age: 25, email: 'jane@example.com' }
    ]
    const wrapper = createWrapper({ dataSource })

    await nextTick()

    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('renders correct data in rows', async () => {
    const dataSource = [
      { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
      { id: 2, name: 'Jane Doe', age: 25, email: 'jane@example.com' }
    ]
    const wrapper = createWrapper({ dataSource })

    await nextTick()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].findAll('td').map(td => td.text())).toEqual(['John Doe', '30', 'john@example.com'])
    expect(rows[1].findAll('td').map(td => td.text())).toEqual(['Jane Doe', '25', 'jane@example.com'])
  })

  it('renders displayFn', async () => {
    const columns = [
      { dataIndex: 'name', displayFn: (value: string) => value + ' test' },
      { dataIndex: 'age', displayFn: (value: string) => String(Number(value) + 1) },
      { dataIndex: 'email', displayFn: (value: string) => value.replace('example', 'test') }
    ]
    const dataSource = [
      { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
      { id: 2, name: 'Jane Doe', age: 25, email: 'jane@example.com' }
    ]
    const wrapper = createWrapper({ columns, dataSource })

    await nextTick()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].findAll('td').map(td => td.text())).toEqual(['John Doe test', '31', 'john@test.com'])
    expect(rows[1].findAll('td').map(td => td.text())).toEqual(['Jane Doe test', '26', 'jane@test.com'])
  })

  it('applies column width', () => {
    const columns = [{ dataIndex: 'name', width: 'base' }, { dataIndex: 'age', width: 'sm' }, { dataIndex: 'email' }]
    const wrapper = createWrapper({ columns })

    const headers = wrapper.findAll('th')
    expect(headers[0].attributes('class')).toContain('w-56')
    expect(headers[1].attributes('class')).toContain('w-36')
    expect(headers[2].attributes('class')).toContain('w-[120px]')
  })

  it('renders collapsable card when title is provided', () => {
    const wrapper = createWrapper({ title: 'Table Title' })

    expect(wrapper.findComponent(TltCard).exists()).toBe(true)
  })

  describe('Table Actions', () => {
    it('renders refresh and column options actions', () => {
      const wrapper = createWrapper({ title: 'Table Title' })

      expect(wrapper.findComponent(TableComponents.TableAction as any).exists()).toBe(true)
      expect(wrapper.findComponent(TableComponents.TableAction as any).props('iconLeft')).toBe('refresh')
      expect(wrapper.findComponent(TableComponents.TableAction as any).props('label')).toBe('Refresh')

      expect(wrapper.findComponent(TableComponents.TableColumnsConfig).exists()).toBe(true)
    })

    it('emits refresh event when refresh action is clicked', async () => {
      const wrapper = createWrapper({ title: 'Table Title' })

      await wrapper
        .findComponent(TableComponents.TableAction as any)
        .find('button')
        .trigger('click')

      expect(wrapper.emitted('refresh')).toBeTruthy()
    })

    it('renders custom action slot', () => {
      const wrapper = createWrapper(
        { title: 'Table Title', tableActions: ['refresh', 'custom-action', 'column-list'] },
        {
          slots: {
            'custom-action': { template: '<TableAction id="custom">Custom Action</TableAction>' }
          }
        }
      )

      const actions = wrapper.findAllComponents(TableComponents.TableAction as any)
      expect(actions.length).toBe(3)
    })

    it('renders actions dropdown', () => {
      const wrapper = createWrapper({
        title: 'Table Title',
        tableActions: [
          'refresh',
          {
            id: 'dropdown-action',
            label: 'Action',
            dropdownOptions: [{ label: 'Option 1' }, { label: 'Option 2' }]
          },
          'column-list'
        ]
      })

      const actions = wrapper.findAllComponents(TableComponents.TableAction as any)
      expect(actions[1].text()).toContain('Action')

      const dropdown = actions[1].findComponent(TltDropdown)
      expect(dropdown.exists()).toBe(true)
      expect(dropdown.text()).toContain('Option 1')
      expect(dropdown.text()).toContain('Option 2')
    })

    describe('Search', () => {
      it('renders search input when search is enabled', () => {
        const wrapper = createWrapper({ title: 'Table Title', search: true })

        expect(wrapper.findComponent(TableComponents.TableSearch).exists()).toBe(true)
      })

      it('renders search input when search value is provided', () => {
        const wrapper = createWrapper({ title: 'Table Title', search: 'search test' })

        expect(wrapper.findComponent(TableComponents.TableSearch).exists()).toBe(true)
      })

      it('renders search input when pagination is lazy', () => {
        const wrapper = createWrapper({ title: 'Table Title', dataSource: () => Promise.resolve({ data: [], total: 0 }) })

        expect(wrapper.findComponent(TableComponents.TableSearch).exists()).toBe(true)
      })

      it('renders search input when there are more than 10 rows', async () => {
        const dataSource = Array.from({ length: 12 }, (_, index) => ({ id: index, name: 'John Doe', age: 30, email: 'john@example.com' }))
        const wrapper = createWrapper({ title: 'Table Title', dataSource })

        await nextTick()

        expect(wrapper.findComponent(TableComponents.TableSearch).exists()).toBe(true)
      })

      it('does not render search input when search is false', async () => {
        const dataSource = Array.from({ length: 12 }, (_, index) => ({ id: index, name: 'John Doe', age: 30, email: 'john@example.com' }))
        const wrapper = createWrapper({ title: 'Table Title', dataSource, search: false })

        await nextTick()

        expect(wrapper.findComponent(TableComponents.TableSearch).exists()).toBe(false)
      })

      it.each([
        { value: '', count: 4 },
        { value: 'jane', count: 1 },
        { value: 'example', count: 4 },
        { value: 25, count: 2 },
        { value: 'doe test', count: 2 }
      ])('searches for $value', async ({ value: searchValue, count }) => {
        const columns = [
          { dataIndex: 'name', title: 'Name', displayFn: (value: string) => value + ' test' },
          { dataIndex: 'age', title: 'Age' },
          { dataIndex: 'email', title: 'Email' }
        ]
        const dataSource = [
          {
            id: 1,
            name: 'John Doe',
            age: 30,
            email: 'john@example.com'
          },
          {
            id: 2,
            name: 'Jane Doe',
            age: 25,
            email: 'jane@example.com'
          },
          {
            id: 3,
            name: 'Alice Smith',
            age: 25,
            email: 'alice@example.com'
          },
          {
            id: 4,
            name: 'Bob Johnson',
            age: 28,
            email: 'bob@example.com'
          }
        ]
        const wrapper = createWrapper({ title: 'Table Title', columns, dataSource, search: true })

        const searchInput = wrapper.getByTestId('input-search')
        await searchInput.setValue(searchValue)

        const searchButton = wrapper.get('form')
        await searchButton.trigger('submit.prevent')

        const rows = wrapper.findAll('tbody tr')
        expect(rows.length).toBe(count)
      })
    })
  })

  describe('Bulk Actions rendering', () => {
    it('renders bulk actions column when selected array is provided', async () => {
      const dataSource = [{ id: 1, name: 'John Doe', age: 30, email: 'john@example.com' }]
      const wrapper = createWrapper({ selected: [], dataSource })

      await nextTick()

      const headerBulkActionsCell = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any)
      const bulkActionsCells = wrapper.findAllComponents(TableComponents.TableCellBulkActions as any)

      expect(headerBulkActionsCell.exists()).toBe(true)
      expect(bulkActionsCells.length).toBe(1)
      expect(bulkActionsCells[0].exists()).toBe(true)
    })

    it('renders bulk actions bar when bulk actions are provided', () => {
      const bulkActions = [{ id: 'delete', label: 'Delete', icon: 'delete' }]
      const wrapper = createWrapper({ bulkActions })

      expect(wrapper.findComponent(TableComponents.TableBulkActions as any).exists()).toBe(true)
    })

    it('renders bulk actions column when bulk actions are provided', async () => {
      const bulkActions = [{ id: 'delete', label: 'Delete', icon: 'delete' }]
      const dataSource = [{ id: 1, name: 'John Doe', age: 30, email: 'john@example.com' }]
      const wrapper = createWrapper({ bulkActions, dataSource })

      await nextTick()

      const headerBulkActionsCell = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any)
      const bulkActionsCells = wrapper.findAllComponents(TableComponents.TableCellBulkActions as any)

      expect(headerBulkActionsCell.exists()).toBe(true)
      expect(bulkActionsCells.length).toBe(1)
      expect(bulkActionsCells[0].exists()).toBe(true)
    })

    it('renders bulk actions column when at least one column has bulk edit action', async () => {
      const columns = [{ dataIndex: 'name', actions: { bulk: { id: 'test', label: 'test', options: [] } } }, { dataIndex: 'age' }, { dataIndex: 'email' }]
      const dataSource = [{ id: 1, name: 'John Doe', age: 30, email: 'john@example.com' }]
      const wrapper = createWrapper({ dataSource, columns })

      await nextTick()

      const headerBulkActionsCell = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any)
      const bulkActionsCells = wrapper.findAllComponents(TableComponents.TableCellBulkActions as any)

      expect(headerBulkActionsCell.exists()).toBe(true)
      expect(bulkActionsCells.length).toBe(1)
      expect(bulkActionsCells[0].exists()).toBe(true)
      expect(wrapper.findComponent(FormBulkActions).exists()).toBe(true)
    })

    it('renders bulk actions column when rows are sortable', async () => {
      const dataSource = [{ id: 1, name: 'John Doe', age: 30, email: 'john@example.com' }]
      const wrapper = createWrapper({ dataSource, sortable: true })

      await nextTick()

      const headerBulkActionsCell = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any)
      const bulkActionsCells = wrapper.findAllComponents(TableComponents.TableCellBulkActions as any)

      expect(headerBulkActionsCell.exists()).toBe(true)
      expect(bulkActionsCells.length).toBe(1)
      expect(bulkActionsCells[0].exists()).toBe(true)
    })

    it('renders bulk actions column when there are nested rows', async () => {
      const dataSource = [{ id: 1, name: 'John Doe', age: 30, email: 'john@example.com', _children: [{ id: 2, name: 'Jane Doe', age: 25, email: 'jane@example.com' }] }]
      const wrapper = createWrapper({ dataSource, sortable: true })

      await nextTick()

      const headerBulkActionsCell = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any)
      const bulkActionsCells = wrapper.findAllComponents(TableComponents.TableCellBulkActions as any)

      expect(headerBulkActionsCell.exists()).toBe(true)
      expect(bulkActionsCells.length).toBe(1)
      expect(bulkActionsCells[0].exists()).toBe(true)
    })

    it('selects all rows in page when header checkbox is clicked once and there is a single page', async () => {
      const dataSource = [
        { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
        { id: 2, name: 'Jane Doe', age: 25, email: 'jane@example.com' }
      ]
      const wrapper = createWrapper({ selected: [], dataSource })

      await nextTick()

      const headerCheckbox = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any).find('input')

      await headerCheckbox.setValue(true)

      expect(wrapper.emitted('update:selected')?.[0][0]).toEqual([1, 2])
    })

    it('selects all rows in page when header checkbox is clicked once and there are multiple pages', async () => {
      const dataSource = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: 'John Doe', age: 30, email: 'john@example.com' }))
      const wrapper = createWrapper({
        selected: [],
        dataSource,
        pagination: true
      })

      await nextTick()

      const headerCheckbox = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any).findComponent(TltCheckBox as any)
      const input = headerCheckbox.find('input')

      await input.setValue(true)

      expect(wrapper.emitted('update:selected')?.[0][0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    })

    it('selects all rows in other pages when all rows are selected in page', async () => {
      const dataSource = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: 'John Doe', age: 30, email: 'john@example.com' }))
      const wrapper = createWrapper({
        selected: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        dataSource,
        pagination: true
      })

      await nextTick()

      const headerCheckbox = wrapper.findComponent(TableComponents.TableHeaderCellBulkActions as any).findComponent(TltCheckBox as any)
      const input = headerCheckbox.find('input')

      await input.setValue(false)

      expect(wrapper.emitted('update:selected')?.[0][0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    })

    it('renders bulk actions buttons', async () => {
      const bulkActions = [{ id: 'delete', label: 'Delete', icon: 'delete' }]
      const wrapper = createWrapper({ bulkActions, selected: [1] })

      await nextTick()

      const bulkActionsComponent = wrapper.findComponent(TableComponents.TableBulkActions as any)
      expect(bulkActionsComponent.exists()).toBe(true)

      const buttons = bulkActionsComponent.findAllComponents(TltButton)
      expect(buttons.length).toBe(1)
      expect(buttons[0].text()).toBe('Delete')
    })

    it('renders bulk actions dropdown', async () => {
      const bulkActions = [
        { id: 'edit', label: 'Edit' },
        { id: 'delete', label: 'Delete' },
        { id: 'export', label: 'Export' },
        { id: 'notify', label: 'Notify' },
        { id: 'notify2', label: 'Notify2' }
      ]
      const wrapper = createWrapper({ bulkActions, selected: [1] })

      await nextTick()

      const bulkActionsComponent = wrapper.findComponent(TableComponents.TableBulkActions as any)
      expect(bulkActionsComponent.exists()).toBe(true)

      const buttons = bulkActionsComponent.findAllComponents(TableComponents.TableAction as any)
      expect(buttons.length).toBe(4) // 3 buttons + 1 dropdown with 2 options
      expect(buttons[0].text()).toBe('Edit')
      expect(buttons[1].text()).toBe('Delete')
      expect(buttons[2].text()).toBe('Export')

      const dropdown = buttons[3].findComponent(TltDropdown)
      expect(dropdown.exists()).toBe(true)
      expect(dropdown.text()).toContain('Notify')
      expect(dropdown.text()).toContain('Notify2')
    })
  })

  describe('Row Actions rendering', () => {
    it('renders when row actions is provided', async () => {
      const dataSource = [{ id: 1, name: 'John Doe', age: 30, email: 'john@example.com' }]
      const rowActions = [{ id: 'edit', label: 'Edit', icon: 'edit' }]
      const wrapper = createWrapper({ dataSource, rowActions })

      await nextTick()

      const rowActionsComponent = wrapper.findComponent(TableComponents.TableRowActions)
      expect(rowActionsComponent.exists()).toBe(true)

      expect(rowActionsComponent.findAllComponents(TableComponents.TableRowAction)).toHaveLength(1)
    })

    it('renders row actions dropdown', async () => {
      const rowActions = [
        { id: 'action-1', label: 'Edit' },
        { id: 'action-2', label: 'Delete' },
        { id: 'action-3', label: 'Export' },
        { id: 'action-4', label: 'Action 4' },
        { id: 'action-5', label: 'Action 5' },
        { id: 'action-6', label: 'Default' }
      ]
      const dataSource = [{ id: 1, name: 'John Doe', age: 30, email: 'john@example.com' }]
      const wrapper = createWrapper({ dataSource, rowActions })

      await nextTick()

      const rowActionsComponent = wrapper.findComponent(TableComponents.TableRowActions)
      expect(rowActionsComponent.exists()).toBe(true)

      const buttons = rowActionsComponent.findAllComponents(TltDropdown)
      expect(buttons.length).toBe(1) // one dropdown with 5 options

      const dropdown = buttons[0].findComponent(TltDropdown)
      expect(dropdown.exists()).toBe(true)
      expect(dropdown.text()).toContain('Edit')
      expect(dropdown.text()).toContain('Delete')
      expect(dropdown.text()).toContain('Export')
      expect(dropdown.text()).toContain('Action 4')
      expect(dropdown.text()).toContain('Action 5')
      expect(dropdown.text()).toContain('Default')
    })
  })

  describe('Pagination rendering', () => {
    it('renders pagination when pagination is enabled', () => {
      const wrapper = createWrapper({ pagination: true })

      expect(wrapper.findComponent(TableComponents.TablePagination).exists()).toBe(true)
    })

    it('renders pagination when pagination is lazy', () => {
      const wrapper = createWrapper({ dataSource: () => Promise.resolve({ data: [], total: 0 }) })

      expect(wrapper.findComponent(TableComponents.TablePagination).exists()).toBe(true)
    })

    it('emits default perPage value', () => {
      const wrapper = createWrapper({ pagination: true })

      expect(wrapper.emitted('update:perPage')?.[0][0]).toEqual(10)
    })

    it('emits perPage value, clamped to closest perPage option', async () => {
      const wrapper = createWrapper({ pagination: true, initialPerPage: 20 })

      expect(wrapper.emitted('update:perPage')?.[0][0]).toEqual(25)
    })
  })

  describe('Sorting by column', () => {
    const dataSource = [
      { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
      { id: 2, name: 'Jane Doe', age: 25, email: 'jane@example.com' },
      { id: 3, name: 'Alice Smith', age: 35, email: 'alice@example.com' },
      { id: 4, name: 'Bob Johnson', age: 28, email: 'bob@example.com' },
      { id: 5, name: 'Charlie Brown', age: 22, email: 'charlie@example.com' }
    ]

    it('sorts ascending by name', async () => {
      const wrapper = createWrapper({
        dataSource,
        columns: [
          {
            dataIndex: 'name',
            actions: { sort: true }
          },
          { dataIndex: 'age' },
          { dataIndex: 'email' }
        ]
      })

      await wrapper.getByTestId('button-name-table-action').trigger('click')

      const sortedRowsText = wrapper.findAll('tbody tr').map(row => row.findAll('td').map(td => td.text()))

      expect(sortedRowsText).toEqual([
        ['Alice Smith', '35', 'alice@example.com'],
        ['Bob Johnson', '28', 'bob@example.com'],
        ['Charlie Brown', '22', 'charlie@example.com'],
        ['Jane Doe', '25', 'jane@example.com'],
        ['John Doe', '30', 'john@example.com']
      ])
    })

    it('sorts descending by name', async () => {
      const wrapper = createWrapper({
        dataSource,
        columns: [
          {
            dataIndex: 'name',
            actions: { sort: true }
          },
          { dataIndex: 'age' },
          { dataIndex: 'email' }
        ]
      })

      const sortButton = wrapper.getByTestId('button-name-table-action')
      await sortButton.trigger('click')
      await sortButton.trigger('click')

      const sortedRowsText = wrapper.findAll('tbody tr').map(row => row.findAll('td').map(td => td.text()))

      expect(sortedRowsText).toEqual([
        ['John Doe', '30', 'john@example.com'],
        ['Jane Doe', '25', 'jane@example.com'],
        ['Charlie Brown', '22', 'charlie@example.com'],
        ['Bob Johnson', '28', 'bob@example.com'],
        ['Alice Smith', '35', 'alice@example.com']
      ])
    })

    it('cannot sort by non-sortable column', async () => {
      const wrapper = createWrapper({
        dataSource,
        columns: [{ dataIndex: 'name', actions: { sort: false } }, { dataIndex: 'age' }, { dataIndex: 'email' }]
      })

      const nameSortButton = wrapper.findByTestId('button-name-table-action')
      const ageSortButton = wrapper.findByTestId('button-age-table-action')

      expect(nameSortButton.exists()).toBe(false)
      expect(ageSortButton.exists()).toBe(false)
    })

    it('sorts by displayFn', async () => {
      let index = 10
      const wrapper = createWrapper({
        dataSource,
        columns: [
          {
            dataIndex: 'name',
            displayFn: (value: string) => index-- + value,
            actions: { sort: true }
          },
          { dataIndex: 'age' },
          { dataIndex: 'email' }
        ]
      })

      await wrapper.getByTestId('button-name-table-action').trigger('click')

      const sortedRowsText = wrapper.findAll('tbody tr').map(row => row.findAll('td').map(td => td.text()))

      expect(sortedRowsText).toEqual([
        ['6Charlie Brown', '22', 'charlie@example.com'],
        ['7Bob Johnson', '28', 'bob@example.com'],
        ['8Alice Smith', '35', 'alice@example.com'],
        ['9Jane Doe', '25', 'jane@example.com'],
        ['10John Doe', '30', 'john@example.com']
      ])
    })
  })

  describe('Column configuration', () => {
    it('renders columns list', async () => {
      const wrapper = createWrapper({ title: 'Table Title' })

      const columnConfig = wrapper.findComponent(TableComponents.TableColumnsConfig)
      expect(columnConfig.exists()).toBe(true)

      await columnConfig.find('button').trigger('click')

      expect(wrapper.findByTestId('button-action-column-config').exists()).toBe(true)
      expect(columnConfig.findAll('li').length).toBe(3)
      expect(wrapper.find('thead').findAll('th').length).toBe(3)
    })

    it('hides a column', async () => {
      const wrapper = createWrapper({ title: 'Table Title' })

      expect(wrapper.find('thead').findAll('th').length).toBe(3)

      const columnConfig = wrapper.findComponent(TableComponents.TableColumnsConfig)
      await columnConfig.find('button').trigger('click')

      const columnsListItems = columnConfig.findAll('li')
      await columnsListItems[1].find('input').setValue(false)

      expect(columnConfig.text()).toContain('Visible columns (2 of 3)')

      expect(wrapper.find('thead').findAll('th').length).toBe(2)
      expect(wrapper.find('thead').text()).not.toContain('age')
    })

    it('locks column', async () => {
      const wrapper = createWrapper({ title: 'Table Title' })

      const columnConfig = wrapper.findComponent(TableComponents.TableColumnsConfig as any)
      ;(columnConfig.vm as any).isOverflowing = true
      await columnConfig.find('button').trigger('click')

      await columnConfig.find('li button').trigger('click')

      expect(wrapper.findComponent(TableComponents.TableHeaderCell as any).attributes('style')).toBeTruthy()
    })

    it('resets columns configuration', async () => {
      const wrapper = createWrapper({ title: 'Table Title' })

      expect(wrapper.find('thead').findAll('th').length).toBe(3)

      const columnConfig = wrapper.findComponent(TableComponents.TableColumnsConfig as any)
      await columnConfig.find('button').trigger('click')

      const columnsListItems = columnConfig.findAll('li')
      await columnsListItems[1].find('input').setValue(false)

      expect(columnConfig.text()).toContain('Visible columns (2 of 3)')
      expect(wrapper.find('thead').findAll('th').length).toBe(2)

      await columnConfig.findByTestId('button-reset-columns').trigger('click')

      expect(columnConfig.text()).toContain('Visible columns (3 of 3)')
      expect(wrapper.find('thead').findAll('th').length).toBe(3)
    })

    it('renders columns in saved order', async () => {
      vi.mocked(useLocalStorage).mockReturnValue(
        ref([
          { dataIndex: 'email', shown: true, locked: false },
          { dataIndex: 'name', shown: true, locked: false },
          { dataIndex: 'age', shown: true, locked: false }
        ])
      )

      const wrapper = createWrapper({ title: 'Table Title' })

      expect(wrapper.find('thead').findAll('th').length).toBe(3)

      const columnConfig = wrapper.findComponent(TableComponents.TableColumnsConfig)

      const columnsListItems = columnConfig.findAll('li')
      expect(columnsListItems[0].text()).toContain('Email')
      expect(columnsListItems[1].text()).toContain('Name')
      expect(columnsListItems[2].text()).toContain('Age')
    })

    it('selects single row when row is clicked', async () => {
      const dataSource = [
        { id: 1, name: 'John Doe', age: 30, email: 'john@example.com' },
        { id: 2, name: 'Jane Doe', age: 25, email: 'jane@example.com' }
      ]
      const wrapper = createWrapper({ dataSource, selectable: true })

      await nextTick()

      await wrapper.find('tbody tr').trigger('click')

      expect(wrapper.emitted('selected')?.[0][0]).toEqual(dataSource[0])
    })
  })
})
