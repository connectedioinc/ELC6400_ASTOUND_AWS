import { describe, it } from 'vitest'
import { axe, render, screen } from '@ui-core/tests/utils'
import RadioTest from './Radio.test.vue'

describe('Radio', () => {
  it('should have no accesibility violations', async () => {
    const { container } = render(RadioTest)
    expect(await axe(container)).toHaveNoViolations()
  })
  it('should have accessible labels', ({ expect }) => {
    render(RadioTest)

    const options = screen.getAllByRole('radio')

    options.forEach(o => expect(o).toHaveAccessibleName())
  })
  it('should only allow to select single option', async ({ expect }) => {
    const { user } = render(RadioTest)
    const options = screen.getAllByRole('radio')
    const selectedValue = screen.getByTestId('selected-value')

    expect(selectedValue).toBeEmptyDOMElement()

    await user.click(options[0])
    await user.click(options[1])

    expect(() => screen.getByRole('radio', { checked: true })).not.toThrow()

    expect(selectedValue).toHaveTextContent('chicken')
  })
})
