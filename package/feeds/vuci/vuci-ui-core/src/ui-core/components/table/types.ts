import type { PromptOptions } from '@/stores/messages'
import type { Props as TltButtonProps } from '@ui-core/tlt-design/form/core/TltButton.vue'
import type { Hint } from '@ui-core/tlt-design/widgets/TltHint.vue'
import type { DropdownOption } from '@ui-core/tlt-design/layout/TltDropdown.vue'

export type AcceptableValue = Record<string, any>

export type ColumnWidth = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | 'auto' | (string & {})

export interface ColumnSlots {
  customHeader: string
}

export interface ColumnActionOptions {
  /**
   * Flag which determines whether this column can be sorted
   */
  sort?: boolean
  filter?: {
    /**
     * Type of form to render for filtering column data
     */
    type?: FilterType
    customName?: string
  }
  bulk?: SelectAction<(string | number)[]>
}

export interface TableColumn<T extends AcceptableValue = AcceptableValue> {
  /**
   * Table column title, will be displayed in table header
   */
  title?: string
  /**
   * String representation on data object property which to display under that column
   */
  dataIndex: string
  /**
   * Text that will be shown when hovered on header
   */
  help?: string
  /**
   * Flag, determining whether help text should be interpreted as html
   */
  rawhtml?: boolean
  /**
   * Function to display the value
   */
  displayFn?: (value: string, rowData: T) => string
  actions?: ColumnActionOptions
  /**
   * Width of the column. Set to 'auto' to fully expand the column
   */
  width?: ColumnWidth
  /**
   * Determines whether column is shown
   */
  show?: boolean
  /**
   * Sets the column hidden by default, which can be shown via column list menu
   */
  hidden?: boolean
  /**
   * Sets the column locked by default
   */
  locked?: boolean
  /**
   * Whether the column appears in the column configuration menu
   */
  configurable?: boolean
  scopedSlots?: Partial<ColumnSlots>
  /**
   * Controls whether the column header is visible in mobile header.
   */
  displayInMobileHeader?: boolean
}

export interface ColumnState {
  dataIndex: string
  element?: HTMLElement | null
  /**
   * Whether the column has detached from document flow when locked
   */
  detached: boolean
  /**
   * Offset of the column from the left side of the table when locked (sum of locked column widths to the left)
   */
  left: number
  /**
   * Offset of the column from the right side of the table when locked (sum of locked column widths to the right)
   */
  right: number
}

export interface ColumnOptions {
  dataIndex: string
  shown: boolean
  /**
   * Controls whether the column is stickied to the table viewport
   */
  locked: boolean
}

export interface SortingOptions {
  dataIndex: string | null
  direction: -1 | 0 | 1
}

interface FilterCommonOptions {
  dataIndex?: string
  fn: ((value: any) => boolean) | null
}

export type FilterUniqueValues = string[]

export interface FilterUniqueValuesOptions extends FilterCommonOptions {
  type: 'uniqueValues'
  selected: FilterUniqueValues
  applied: FilterUniqueValues
}

export type FilterRange = { from: number | null; to: number | null }
export interface FilterRangeOptions extends FilterCommonOptions {
  type: 'range'
  selected: FilterRange
  applied: FilterRange
}

export type FilterOptions = FilterUniqueValuesOptions | FilterRangeOptions

export type FilterType = 'uniqueValues' | 'range'

export interface Action<T = any> {
  id: string
  label?: string
  buttonProps?: TltButtonProps
  callback?: (data: T) => void | Promise<void>
  dropdownOptions?: DropdownOption<T>[]
  /**
   * Shows a prompt that informs user how many items will be affected by the action.
   */
  showPrompt?: boolean | 'mobile' | 'desktop'
  /**
   * Used to customize the prompt message.
   * Passed options will be merged with the default prompt options.
   */
  prompt?: PromptOptions | ((data: T) => PromptOptions)
  hints?: Hint | Hint[]
}

export type ActionOption<T = any> = { key: any; label: string; callback: (data: T, key: T) => void }

export type SelectAction<T = any> = {
  id: string
  label: string
  allowCreate?: boolean
} & (
  | {
      options: ActionOption<T>[]
    }
  | {
      options: Omit<ActionOption<T>, 'callback'>[]
      callback: (data: T, key: T) => void
    }
)

export type DataTransformKey<T extends AcceptableValue> = 'column-sorting' | `column-${TableColumn<T>['dataIndex']}-filter` | 'search'

export type DataLoaderParams<T extends AcceptableValue> = {
  offset?: number
  limit?: number
  search?: string
  sorting?: { sortby: keyof T; orderby: 'asc' | 'desc' } | {}
  filter?: Record<string, string[]>
}

export type DataLoaderFunction<T extends AcceptableValue> = (params: DataLoaderParams<T>) => Promise<{ data: T[]; total: number }>
