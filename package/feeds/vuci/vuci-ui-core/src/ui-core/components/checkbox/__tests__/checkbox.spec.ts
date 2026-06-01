import { axe, render, screen } from '@ui-core/tests/utils'
import { describe, it } from 'vitest'
import CheckboxTest from './Checkbox.test.vue'
import CheckboxWithIndeterminateTest from './CheckboxWithIndeterminate.test.vue'

describe('Checkbox component test', () => {
  describe('Checkbox group', () => {
    it('should have no violations', async () => {
      const { container } = render(CheckboxTest)
      expect(await axe(container)).toHaveNoViolations()
    })
    it('should allow to select multiple values', async ({ expect }) => {
      const { user } = render(CheckboxTest)
      const options = screen.getAllByRole('checkbox')
      const values = screen.getByTestId('selectedValues')

      await user.click(options[0])
      await user.click(options[1])

      const selected = screen.getAllByRole('checkbox', { checked: true })

      expect(values).toHaveTextContent(/salmon/i)
      expect(values).toHaveTextContent(/chicken/i)

      expect(selected).toHaveLength(2)
    })
    describe('with indeterminate', () => {
      it('indeterminate checkbox should be unchecked when nothing is selected', () => {
        render(CheckboxWithIndeterminateTest)
        const [indeterminate, ...items] = screen.getAllByRole('checkbox')

        expect(indeterminate).not.toBeChecked()
        items.forEach(i => expect(i).not.toBeChecked())
      })
      it('indeterminate checkbox should be in mixed state when more than one is selected', async ({ expect }) => {
        const { user } = render(CheckboxWithIndeterminateTest)
        const [indeterminate, ...items] = screen.getAllByRole('checkbox')
        await user.click(items[0])

        expect(indeterminate).toHaveAccessibleName(expect.stringContaining('Indeterminate'))

        expect(items[0]).toBeChecked()
        expect(indeterminate).toBePartiallyChecked()
      })
      it('indeterminate checkbox should be checked when all available options are selected', async ({ expect }) => {
        const { user } = render(CheckboxWithIndeterminateTest)
        const [indeterminate, ...items] = screen.getAllByRole('checkbox')

        await Promise.all(items.map(async i => await user.click(i)))

        expect(items[0]).toBeChecked()
        expect(indeterminate).toBeChecked()
      })
    })
  })
})
