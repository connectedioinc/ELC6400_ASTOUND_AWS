import { axe, render, screen } from '@ui-core/tests/utils'
import BaseTextareaTest from './BaseTextarea.test.vue'

describe('BaseTextarea', () => {
  it('should be accessible', async () => {
    const { container } = render(BaseTextareaTest)
    expect(await axe(container)).toHaveNoViolations()
  })
  it('should be able to set textarea as required', () => {
    render(BaseTextareaTest, { props: { required: true } })
    expect(screen.getByLabelText(/input label/i)).toBeRequired()
  })
  it('should be able to set textarea as disabled', async () => {
    const { user } = render(BaseTextareaTest, { props: { disabled: true } })
    await user.click(screen.getByLabelText(/input label/i))
    expect(screen.getByRole('textbox')).not.toHaveFocus()
    expect(screen.getByLabelText(/input label/i)).toBeDisabled()
  })
  it('should be focusable but not allow user input when readonly', async () => {
    const { user } = render(BaseTextareaTest, { props: { readonly: true } })
    await user.click(screen.getByLabelText(/input label/i))
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
    await user.type(input, 'text value')
    expect(input).toHaveValue('')
  })
  it('should trigger callbacks, but  not focus the control', async () => {
    const leadingCb = vi.fn()
    const { user } = render(BaseTextareaTest, { props: { trailingCb: leadingCb } })
    const buttons = screen.getAllByRole('button')
    expect(leadingCb).not.toHaveBeenCalled()
    await user.click(buttons[0])
    expect(leadingCb).toHaveBeenCalled()
    expect(document.activeElement).toBe(buttons[0])
  })
})
