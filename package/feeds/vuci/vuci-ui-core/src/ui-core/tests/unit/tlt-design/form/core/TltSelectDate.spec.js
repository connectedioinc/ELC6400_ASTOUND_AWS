import TltSelectDate from '@ui-core/tlt-design/form/core/select/TltSelectDate.vue'
import createWrapper from '../../../mockFactory'

describe('TltSelectDate.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltSelectDate, {
      props: { modelValue: [] },
      global: {
        mocks: {
          $localDate: vi.fn().mockReturnValue('1')
        }
      }
    })
  })
  it('checks if year value increased', async () => {
    wrapper.vm.setValue = { day: 1, month: 1, year: 2024 }
    await wrapper.vm.changeYear(1)
    expect(wrapper.vm.setValue).toEqual({ day: 1, month: 1, year: 2025 })
  })
  it('checks if selected day is end day', () => {
    const day = { number: 1, month: 1, year: 2025 }
    wrapper.vm.endValue = { day: 1, month: 1, year: 2025 }
    expect(wrapper.vm.selectedEnd(day)).toBe(true)
  })
  it('checks if selected day is start day', () => {
    const day = { number: 1, month: 1, year: 2025 }
    wrapper.vm.startValue = { day: 1, month: 1, year: 2025 }
    expect(wrapper.vm.selectedStart(day)).toBe(true)
  })
  it.each([
    ['its between start and end days', { number: 10, month: 1, year: 2025 }, { day: 5, month: 1, year: 2025 }, { day: 15, month: 1, year: 2025 }, true],
    ['month between start and end months', { number: 10, month: 2, year: 2025 }, { day: 5, month: 1, year: 2025 }, { day: 15, month: 3, year: 2025 }, true],
    ['month is not between start and end months', { number: 10, month: 1, year: 2025 }, { day: 5, month: 2, year: 2025 }, { day: 15, month: 3, year: 2025 }, false],
    ['year is between start and end years', { number: 10, month: 1, year: 2025 }, { day: 5, month: 2, year: 2021 }, { day: 15, month: 3, year: 2026 }, true],
    ['year is between start and end years', { number: 10, month: 1, year: 2025 }, { day: 5, month: 2, year: 2024 }, { day: 15, month: 3, year: 2026 }, true],
    ['year is same as start year', { number: 10, month: 1, year: 2025 }, { day: 5, month: 1, year: 2025 }, { day: 15, month: 3, year: 2026 }, true],
    ['year is not between start and end years', { number: 10, month: 1, year: 2024 }, { day: 5, month: 1, year: 2025 }, { day: 15, month: 1, year: 2025 }, false],
    ['day is not between start and end days', { number: 4, month: 1, year: 2025 }, { day: 5, month: 1, year: 2025 }, { day: 15, month: 1, year: 2025 }, false]
  ])('checks if day is highlighted when %s', (text, day, start, end, response) => {
    wrapper.vm.startValue = start
    wrapper.vm.endValue = end
    expect(wrapper.vm.intervalHighlight(day)).toBe(response)
  })
  it('checks if clear resets values correctly', async () => {
    await wrapper.vm.clear(true)
    expect(wrapper.vm.startValue).toEqual({})
    expect(wrapper.vm.endValue).toEqual({})
    expect(wrapper.vm.setValue).toEqual({ year: 1, month: 0, day: 1 })
    expect(wrapper.vm.selected.value).toEqual([])
    expect(wrapper.vm.displayValue).toEqual('Select a date')
  })
  it('checks if onClose resets values correctly when modelValue is empty', async () => {
    await wrapper.vm.onClose()
    expect(wrapper.vm.startValue).toEqual({})
    expect(wrapper.vm.endValue).toEqual({})
    expect(wrapper.vm.setValue).toEqual({ year: 1, month: 0, day: 1 })
    expect(wrapper.vm.selected.value).toEqual([])
    expect(wrapper.vm.open).toBe(false)
  })
})
