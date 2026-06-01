import { axe, render, screen } from '@ui-core/tests/utils'
import BaseInputTest from './BaseInput.test.vue'

describe('BaseInput', () => {
  it('should be accessible', async () => {
    const { container } = render(BaseInputTest)
    expect(await axe(container)).toHaveNoViolations()
  })
  it('should be able to set input as required', () => {
    render(BaseInputTest, { props: { required: true } })
    const input = screen.getByLabelText(/input label/i)
    expect(input).toBeRequired()
  })
  it('should be able to set input as disabled', async () => {
    const { user } = render(BaseInputTest, { props: { disabled: true } })
    await user.click(screen.getByLabelText(/input label/i))
    expect(screen.getByRole('textbox')).not.toHaveFocus()
    expect(screen.getByLabelText(/input label/i)).toBeDisabled()
  })
  it('should be focusable but not allow user input when readonly', async () => {
    const { user } = render(BaseInputTest, { props: { readonly: true } })
    await user.click(screen.getByLabelText(/input label/i))
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
    await user.type(input, 'text value')
    expect(input).toHaveValue('')
  })
  it('should trigger callbacks, but  not focus the control', async () => {
    const leadingCb = vi.fn()
    const { user } = render(BaseInputTest, { props: { leadingCb, trailingCb: leadingCb } })
    const buttons = screen.getAllByRole('button')
    expect(leadingCb).not.toHaveBeenCalled()
    await user.click(buttons[0])
    expect(leadingCb).toHaveBeenCalled()
    await user.click(buttons[1])
    expect(leadingCb).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(buttons[1])
  })
})
