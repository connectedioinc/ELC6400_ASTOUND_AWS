import { getActionErrorTranslate, isUpgradeFailed } from '../../src/components/services/packageSharedUtils'

vi.mock('@ui-core/composables/useI18n', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useTranslate: vi.fn(() => t => t)
  }
})

describe('packageSharedUtils', () => {
  it.each([
    [1, 'download', 'Invalid package.'],
    [1, 'upload', 'Invalid file.'],
    [-1, 'download', 'Package installation failed. Check your internet connection or try to update package list.'],
    [-1, 'upload', 'Package installation failed.']
  ])('getActionErrorTranslate(%p, %p) returns "%s"', (error, component, expected) => {
    expect(getActionErrorTranslate(error, component)).toBe(expected)
  })

  it.each([
    [{ type: 8, upgrade: true }, true],
    [{ type: 1, upgrade: true }, false],
    [{ type: 1, upgrade: false }, false]
  ])('isUpgradeFailed(%o) returns %p', (pkg, expected) => {
    expect(isUpgradeFailed(pkg)).toBe(expected)
  })
})
