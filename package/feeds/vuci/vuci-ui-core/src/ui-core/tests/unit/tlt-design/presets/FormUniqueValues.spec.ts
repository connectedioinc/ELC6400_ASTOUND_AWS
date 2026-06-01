import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { mergeDeep } from '../../mockFactory'
import FormUniqueValues from '@ui-core/tlt-design/presets/FormUniqueValues.vue'
import TltInputSearch from '@ui-core/tlt-design/form/core/tltInputSearch.vue'
import TltCheckBox from '@ui-core/tlt-design/form/core/TltCheckBox.vue'
import FormFilterPreset from '@ui-core/tlt-design/presets/FormFilterPreset.vue'
import TltInput from '@ui-core/tlt-design/form/core/tltInput.vue'
import TltButton from '@ui-core/tlt-design/form/core/TltButton.vue'
import { createTestingPinia } from '@pinia/testing'

type MountingOptions = ComponentMountingOptions<typeof FormUniqueValues>

const createWrapper = (props: Partial<MountingOptions['props']> = {}, options: Partial<MountingOptions> = {}) => {
  const testingPinia = createTestingPinia()

  const defaults = {
    global: {
      plugins: [testingPinia],
      stubs: {
        TltIcon: true
      },
      components: {
        TltInputSearch,
        TltCheckBox,
        FormFilterPreset,
        TltInput,
        TltButton
      },
      mocks: {
        $t: (msg: string) => msg
      }
    },
    props: {
      column: {
        dataIndex: 'test'
      },
      filters: {
        selected: [],
        applied: []
      },
      values: {
        all: {
          test: {}
        },
        shown: {
          test: {}
        }
      },
      ...props
    }
  }
  return mount(FormUniqueValues, mergeDeep(defaults, options))
}

describe('FormUniqueValues.vue', () => {
  it('renders component', () => {
    const wrapper = createWrapper()

    expect(wrapper.exists()).toBe(true)
  })

  it('renders options from values prop', () => {
    const values = {
      test: { count: 2, name: 'Test Option' },
      foo: { count: 1, name: 'Foo Option' }
    }
    const wrapper = createWrapper({ values })

    expect(wrapper.text()).toContain('Test Option')
    expect(wrapper.text()).toContain('Foo Option')
  })

  it('shows count for each option', () => {
    const values = {
      test: { count: 2, name: 'Test Option' }
    }
    const wrapper = createWrapper({ values })

    expect(wrapper.text()).toContain('2')
  })

  it('shows select all checkbox if more than 5 options', () => {
    const values = Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['opt' + i, { count: 1, name: 'Option ' + i }]))
    const wrapper = createWrapper({ values })

    expect(wrapper.find('#all-options-inputElement').exists()).toBe(true)
  })

  it('does not show select all checkbox if 5 or fewer options', () => {
    const values = Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['opt' + i, { count: 1, name: 'Option ' + i }]))
    const wrapper = createWrapper({ values })

    expect(wrapper.find('#all-options-inputElement').exists()).toBe(false)
  })

  it('filters options by search', async () => {
    const values = {
      test: { count: 2, name: 'Test Option' },
      foo: { count: 1, name: 'Foo Option' }
    }
    const wrapper = createWrapper({ values })

    const input = wrapper.findComponent(TltInputSearch)

    await input.setValue('Foo')

    expect(wrapper.text()).toContain('Foo Option')
    expect(wrapper.text()).not.toContain('Test Option')
  })

  it('updates selected when option is checked', async () => {
    const values = {
      test: { count: 2, name: 'Test Option' },
      foo: { count: 1, name: 'Foo Option' }
    }
    const wrapper = createWrapper({ values })

    const checkboxes = wrapper.findAllComponents(TltCheckBox as any)
    await checkboxes[0].find('input').setValue(true)

    expect(wrapper.emitted('update:selected')?.[0][0]).toEqual(['test'])
  })

  it('selects all when select all checkbox is checked', async () => {
    const values = Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['opt' + i, { count: 1, name: 'Option ' + i }]))
    const wrapper = createWrapper({ values })

    const selectAll = wrapper.findComponent(TltCheckBox as any)
    await selectAll.find('input').setValue(true)

    expect(wrapper.emitted('update:selected')?.[0][0]).toHaveLength(6)
  })

  it('emits reset event on form reset', async () => {
    const values = Object.fromEntries(Array.from({ length: 6 }, (_, i) => ['opt' + i, { count: 1, name: 'Option ' + i }]))
    const wrapper = createWrapper({ values, selected: ['opt1', 'opt2'] })

    const form = wrapper.find('form')
    await form.trigger('reset')

    expect(wrapper.emitted('reset')).toBeTruthy()
    expect(wrapper.emitted('update:selected')?.[0][0]).toEqual([])
  })

  it('emits apply event on form submit', async () => {
    const wrapper = createWrapper({ selected: ['test'] })

    const form = wrapper.find('form')
    await form.trigger('submit')

    expect(wrapper.emitted('apply')?.[0][0]).toEqual(['test'])
  })

  it('resets form when submitted without selected options', async () => {
    const wrapper = createWrapper({ values: { test: { count: 1, name: 'Test Option' } }, selected: [] })

    const form = wrapper.find('form')
    await form.trigger('submit')

    expect(wrapper.emitted('reset')).toBeTruthy()
  })

  it('hides search input if searchValue prop is set', () => {
    const wrapper = createWrapper({ searchValue: 'foo' })

    expect(wrapper.findComponent(TltInputSearch).exists()).toBe(false)
  })
})
