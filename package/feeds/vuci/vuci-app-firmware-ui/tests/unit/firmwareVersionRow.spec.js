import FirmwareVersionRow from '../../src/views/system/FirmwareVersionRow.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('FirmwareVersionRow tests', () => {
  let wrapper
  const defaultProps = {
    value: '1.0.0',
    type: 'stable',
    downloadUrl: null,
    firmwareUpdateInfo: {},
    changelogUrl: 'https://example.com/changelog'
  }
  beforeEach(() => {
    wrapper = createWrapper(FirmwareVersionRow, {
      props: defaultProps
    })
  })
  it.each([
    ['stable', true],
    ['latest', false]
  ])('isStable returns %s when type is "%s"', async (type, expected) => {
    await wrapper.setProps({ type })
    expect(wrapper.vm.isStable).toBe(expected)
  })
  it.each([
    [
      'stable',
      'This version has been tested through both internal QA processes and large-scale user deployments. All known issues have been resolved based on user reports and testing feedback. It is also deployed in mass production.'
    ],
    [
      'latest',
      'This is the most recent firmware release, featuring the latest updates, features, and fixes. While it has passed internal testing, it has not yet undergone widespread deployment or user validation. It may still contain undiscovered issues. We recommend testing on a small number of devices before considering broader updates.'
    ]
  ])('firmwareDescription returns correct description for %s firmware', async (type, expected) => {
    await wrapper.setProps({ type })
    expect(wrapper.vm.firmwareDescription).toBe(expected)
  })
  it.each([
    ['stable', null],
    ['latest', 'If no critical issues are found, the latest firmware is promoted to stable after 4-6 weeks.']
  ])('promotionText returns %s for %s firmware', async (type, expected) => {
    await wrapper.setProps({ type })
    expect(wrapper.vm.promotionText).toBe(expected)
  })
  it.each([
    ['stable firmware with stable_version', 'stable', { stable_version: '2.0.0' }, "New stable firmware version '2.0.0' is available for download."],
    ['latest firmware with version', 'latest', { version: '3.0.0' }, "Latest firmware version '3.0.0' is available for download."]
  ])('downloadHintText returns correct text for %s', async (description, type, firmwareUpdateInfo, expected) => {
    await wrapper.setProps({ type, firmwareUpdateInfo })
    expect(wrapper.vm.downloadHintText).toBe(expected)
  })
  it.each([
    ['returns base URL when stable_date is missing', { stable_version: 'RUT_R_00.07.12', stable_date: undefined }, 'https://example.com/changelog', 'https://example.com/changelog'],
    ['returns base URL when stable_date is N/A', { stable_version: 'RUT_R_00.07.12', stable_date: 'N/A' }, 'https://example.com/changelog', 'https://example.com/changelog'],
    [
      'returns formatted URL with version and date',
      { stable_version: 'RUT_R_00.07.12', stable_date: '2024-01-15' },
      'https://example.com/changelog#Changelog',
      'https://example.com/changelog#RUT_R_00.07.12_|_2024.01.15'
    ]
  ])('stableChangeLogURL: %s', async (description, firmwareUpdateInfo, changelogUrl, expected) => {
    await wrapper.setProps({ firmwareUpdateInfo, changelogUrl })
    expect(wrapper.vm.stableChangeLogURL).toBe(expected)
  })
})
