// @vitest-environment happy-dom
import { it, expect, describe } from 'vitest'
import { render, axe, screen, within } from '@ui-core/tests/utils'
import SelectTest from './Select.test.vue'

const PLACEHOLDER = 'placeholder text'
const ID = 'test'

const createOptions = (length = 25) =>
  Array.from({ length }, (_, index) => ({
    value: index + 1,
    textContent: `option ${index + 1}`
  }))

const options5 = createOptions(5)

const createSelect = ({ modelValue = null, options = options5 }: { modelValue?: any; options?: any[] } = {}) =>
  render(SelectTest, {
    props: {
      modelValue,
      options: options,
      placeholder: PLACEHOLDER,
      id: ID
    }
  })
describe('Select', () => {
  it('should have no violations', async () => {
    const { container } = createSelect()
    expect(await axe(container)).toHaveNoViolations()
  })
  it('should render options listbox', async () => {
    const { user } = createSelect()
    expect(Select.listbox()).not.toBeVisible()
    const trigger = Select.trigger()
    const listbox = Select.listbox()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-controls', 'test--listbox')
    expect(listbox).not.toBeVisible()
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(listbox).toBeVisible()
  })
  describe('placeholder', () => {
    it('should be shown when no option is selected', () => {
      createSelect()
      expect(Select.trigger()).toHaveTextContent(PLACEHOLDER)
    })
    it('should not be shown when an option is selected', () => {
      createSelect({ modelValue: 1 })
      expect(Select.trigger()).not.toHaveTextContent(PLACEHOLDER)
    })
  })
  describe('Trigger keyboard interaction (no initial value selected)', () => {
    let user: ReturnType<typeof createSelect>['user']
    describe('When focus is in the combobox (SelectTrigger)', () => {
      beforeEach(async () => {
        const { user: _u } = createSelect()
        user = _u
        await user.tab()
      })
      it('combobox should be focused', () => {
        expect(Select.trigger()).toHaveFocus()
      })
      it('[ArrowDown] should focus on the first option', async () => {
        await user.keyboard('{ArrowDown}')
        expect(Select.listbox()).toBeVisible()
        expect(Select.options()[0]).toHaveFocus()
      })
      it('[ArrowUp] should focus on the last option', async () => {
        await user.keyboard('{ArrowUp}')
        expect(Select.listbox()).toBeVisible()
        expect(Select.options().at(-1)).toHaveFocus()
      })
      it('[Alt+ArrowDown] should display the popup without moving focus', async () => {
        const listbox = Select.listbox()
        expect(listbox).not.toBeVisible()
        await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
        expect(listbox).toBeVisible()
        expect(Select.trigger()).toHaveFocus()
      })
      it('[Alt+ArrowUp] should hide the popup, trigger remains focused', async () => {
        const listbox = Select.listbox()
        const trigger = Select.trigger()
        expect(listbox).not.toBeVisible()
        await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
        expect(listbox).toBeVisible()
        expect(trigger).toHaveFocus()
        await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
        expect(listbox).not.toBeVisible()
        expect(trigger).toHaveFocus()
      })
      it('[Escape] should close the combobox (options visible)', async () => {
        const trigger = Select.trigger()
        const listbox = Select.listbox()
        await user.keyboard('{ArrowDown}{Alt}')
        expect(listbox).toBeVisible()
        await user.keyboard('{Escape}')
        expect(trigger).toHaveFocus()
        expect(listbox).not.toBeVisible()
      })
      it('[Escape] should close the combobox (options not visible)', async () => {
        const trigger = Select.trigger()
        const listbox = Select.listbox()
        await user.keyboard('{Escape}')
        expect(trigger).toHaveFocus()
        expect(listbox).not.toBeVisible()
      })
      it('should focus the previous active descendant option', async () => {
        const trigger = Select.trigger()
        const listbox = Select.listbox()
        await user.keyboard('{ArrowDown}')
        await user.keyboard('{ArrowDown}')
        await user.keyboard('{ArrowDown}')
        const [, , option3] = Select.options()
        expect(listbox).toBeVisible()
        expect(option3).toHaveFocus()
        await user.keyboard('{Enter}')
        expect(trigger).toHaveFocus()
        expect(trigger).toHaveTextContent(option3.textContent)
        await user.keyboard('{ArrowDown}')
        expect(option3).toHaveFocus()
      })
    })
    describe('When focus is in the listbox (SelectListbox)', () => {
      let user: ReturnType<typeof createSelect>['user'], container: ReturnType<typeof createSelect>['container']
      beforeEach(async () => {
        const { user: u, container: c } = createSelect({ options: createOptions(25) })
        user = u
        container = c
        await user.tab()
        await user.keyboard('{ArrowDown}')
      })
      it('listbox should be visible and first option focused', async () => {
        const listbox = Select.listbox()
        const [option] = Select.options()
        expect(listbox).toBeVisible()
        expect(option).toHaveFocus()
        expect(await axe(container)).toHaveNoViolations()
      })
      it('[ArrowDown] should move focus to the next option', async () => {
        await user.keyboard('{ArrowDown}')
        const [option1, option2] = Select.options()
        expect(option1).not.toHaveFocus()
        expect(option2).toHaveFocus()
      })
      it('[ArrowUp] should move focus to the previous option', async () => {
        await user.keyboard('{ArrowUp}')
        const [option1, option2, ...rest] = Select.options()
        expect(option1).toHaveFocus()
        //check it does not loop
        expect(rest.at(-1)).not.toHaveFocus()
        // select the next option
        await user.keyboard('{ArrowDown}')
        expect(option2).toHaveFocus()
        await user.keyboard('{ArrowUp}')
        expect(option1).toHaveFocus()
      })
      it('[Enter] should accept the focused option, close the listbox popup, focus on the trigger', async () => {
        await user.keyboard('{Enter}')
        expect(Select.trigger()).toHaveTextContent('option 1')
        expect(Select.listbox()).not.toBeVisible()
        expect(Select.trigger()).toHaveFocus()
      })
      it('[Space] should accept the focused option, close the listbox popup, focus on the trigger', async () => {
        await user.keyboard('{Space}')
        expect(Select.trigger()).toHaveTextContent('option 1')
        expect(Select.listbox()).not.toBeVisible()
        expect(Select.trigger()).toHaveFocus()
      })
      it('[Escape] should close the listbox popup, focus on the trigger', async () => {
        await user.keyboard('{Escape}')
        expect(Select.listbox()).not.toBeVisible()
        expect(Select.trigger()).toHaveFocus()
      })
      it('[Tab] should accept the focused option, close the listbox popup, focus away', async () => {
        const trigger = Select.trigger()
        await user.keyboard('{Tab}')
        expect(Select.listbox()).not.toBeVisible()
        expect(trigger).not.toHaveFocus()
        expect(trigger).toHaveTextContent('option 1')
      })
      it('[Home] should focus on the first option', async () => {
        const listbox = Select.listbox()
        const [option1, , option3] = Select.options()
        await user.keyboard('{ArrowDown}{ArrowDown}')
        expect(option3).toHaveFocus()
        await user.keyboard('{Home}')
        expect(listbox).toBeVisible()
        expect(option1).toHaveFocus()
      })
      it('[End] should focus on the last option', async () => {
        const listbox = Select.listbox()
        const options = Select.options()
        const lastOption = options[options.length - 1]
        const firstOption = options[0]
        expect(firstOption).toHaveFocus()
        await user.keyboard('{End}')
        expect(lastOption).toHaveFocus()
        expect(listbox).toBeVisible()
      })
      it('[PageUp] should jump 10 options up (back)', async () => {
        const listbox = Select.listbox()
        const options = Select.options()
        const lastOption = options[options.length - 1]
        // focus the last option
        await user.keyboard('{End}')
        expect(lastOption).toHaveFocus()
        await user.keyboard('{PageUp}')
        expect(options[14]).toHaveFocus()
        await user.keyboard('{PageUp}')
        expect(options[4]).toHaveFocus()
        await user.keyboard('{PageUp}')
        expect(options[0]).toHaveFocus()
        expect(listbox).toBeVisible()
      })
      it('[PageDown] should jump 10 options down', async () => {
        const listbox = Select.listbox()
        const options = Select.options()
        expect(options[0]).toHaveFocus()
        await user.keyboard('{PageDown}')
        expect(options[10]).toHaveFocus()
        await user.keyboard('{PageDown}')
        expect(options[20]).toHaveFocus()
        await user.keyboard('{PageDown}')
        expect(options[24]).toHaveFocus()
        expect(listbox).toBeVisible()
      })
    })
  })
})

const renderMultiSelect = ({ modelValue = null }: { modelValue?: any[] | null } = {}) =>
  render(SelectTest, {
    props: {
      options: options5,
      placeholder: PLACEHOLDER,
      modelValue,
      multiple: true
    }
  })

describe('Multiselect', () => {
  it('should show placeholder when selected options length is 0', () => {
    renderMultiSelect()
    expect(Select.trigger()).toHaveTextContent(PLACEHOLDER)
  })
  it('should show selected options when selected options length is greater than 0', () => {
    renderMultiSelect({ modelValue: [1, 2] })
    expect(Select.trigger()).toHaveTextContent('option 1, option 2')
  })
  // mainly the only difference is that the user can select multiple options and popup remains open on selection.
  describe('Keyboard navigation', () => {
    let user: ReturnType<typeof createSelect>['user']
    beforeEach(async () => {
      const { user: u } = renderMultiSelect()
      user = u
      await user.tab()
      await user.keyboard('{ArrowDown}')
    })
    it('[Enter] should accept the focused option, do not close the listbox popup, focus remains on the option', async () => {
      const [option1, option2] = Select.options()
      expect(option1).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(Select.listbox()).toBeVisible()
      expect(option1).toHaveFocus()
      await user.keyboard('{ArrowDown}')
      expect(option2).toHaveFocus()
      await user.keyboard('{Enter}')
      expect(screen.getAllByRole('option', { selected: true })).toHaveLength(2)
      await user.keyboard('{Escape}')
      expect(Select.trigger()).toHaveFocus()
      expect(Select.listbox()).not.toBeVisible()
      expect(Select.trigger()).toHaveTextContent('option 1, option 2')
    })
    it('[Enter + Enter] should allow to deselect the focused option', async () => {
      const [option1, option2] = Select.options()
      expect(option1).toHaveFocus()
      await user.keyboard('{Enter}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      expect(option2).toHaveAttribute('aria-selected', 'true')
      expect(Select.trigger()).toHaveTextContent('option 1, option 2')
      await user.keyboard('{Enter}')
      expect(option2).toHaveAttribute('aria-selected', 'false')
      expect(Select.trigger()).toHaveTextContent('option 1')
      expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1)
    })
  })
})

class Select {
  static trigger = () => screen.getByRole('combobox')
  static listbox = (hidden = true) => screen.getByRole('listbox', { hidden })
  static options = (hidden = false) => within(Select.listbox()).getAllByRole('option', { hidden })
  static placeholder = () => screen.getByTestId('select--placeholder')
}
