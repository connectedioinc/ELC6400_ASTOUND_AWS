import TltLogsModal from '@ui-core/tlt-design/layout/TltLogsModal.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Search functionality', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltLogsModal)
  })
  it.each`
    logs                                                                                                | search          | result
    ${'Line with error message\nLine with warning message\nLine with info message\nAnother error line'} | ${'error'}      | ${'Line with error message\nAnother error line'}
    ${'Line with error message\nLine with warning message\nLine with info message\nAnother error line'} | ${'ERROR'}      | ${'Line with error message\nAnother error line'}
    ${'Line with error message\nLine with warning message\nLine with info message\nAnother error line'} | ${''}           | ${'Line with error message\nLine with warning message\nLine with info message\nAnother error line'}
    ${'Line with error message\nLine with warning message\nLine with info message\nAnother error line'} | ${'ERRORERROR'} | ${''}
  `('returns formated placeholder', async ({ logs, search, result }) => {
    await wrapper.setProps({ logs })
    wrapper.vm.searchValue = search
    expect(wrapper.vm.filteredLogs).toEqual(result)
  })
})
