// @vitest-environment happy-dom
import { render, axe } from '@ui-core/tests/utils'
import UploadTest from './Upload.test.vue'

describe('Upload', () => {
  it('should render correctly', async () => {
    const { container } = render(UploadTest)
    expect(await axe(container)).toHaveNoViolations()
  })
  it('outer label should point to input', async () => {
    const { getByLabelText } = render(UploadTest)
    const getInputByLabelText = () => getByLabelText(/test label/i)
    expect(getInputByLabelText).not.toThrow()
    const inputByOuterLabel = getInputByLabelText()
    expect(inputByOuterLabel).toBeInTheDocument()
  })
})
