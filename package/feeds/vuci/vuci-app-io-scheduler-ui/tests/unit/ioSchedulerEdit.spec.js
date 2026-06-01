import IoSchedulerEdit from '../../src/views/services/IoSchedulerEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
const provide = {
  formOptions: () => {
    return {
      pins: [],
      validateEnable: [],
      errors: ['test']
    }
  },
  errors: () => {
    return { 1: 'test' }
  },
  pins: () => [],
  validateEnable: () => []
}
const weekdays = [
  ['1', 'Monday'],
  ['2', 'Tuesday'],
  ['3', 'Wednesday'],
  ['4', 'Thursday'],
  ['5', 'Friday'],
  ['6', 'Saturday'],
  ['0', 'Sunday']
]
let props = {
  section: {
    id: 'test1',
    enabled: '0'
  }
}
describe('IoSchedulerEdit.vue', () => {
  it.each([
    ['week', weekdays],
    ['month', 'month']
  ])('render days', (period, result) => {
    const wrapper = createWrapper(IoSchedulerEdit, {
      props: { section: { period } },
      global: {
        provide,
        mocks: {
          $scheduler: {
            generateMonthDays: vi.fn().mockReturnValueOnce('month')
          }
        }
      }
    })
    const days = wrapper.vm.days
    expect(days).toEqual(result)
  })
  it.each([
    [{ data: { errors: [{ code: 1 }] } }, 'test'],
    [{ data: { errors: [{ code: 3 }] } }, 'An unexpected error occurred']
  ])('returns error message', (error, message) => {
    const wrapper = createWrapper(IoSchedulerEdit, {
      props,
      global: {
        provide,
        mocks: {
          $scheduler: {
            generateMonthDays: vi.fn()
          }
        }
      }
    })
    expect(wrapper.vm.returnErrorMessage(error)).toEqual(message)
  })
  it('passes save validation', async () => {
    const wrapper = createWrapper(IoSchedulerEdit, {
      props,
      global: {
        provide,
        mocks: {
          $scheduler: {
            generateMonthDays: vi.fn()
          }
        }
      }
    })
    await expect(wrapper.vm.validateInterval()).resolves.toEqual()
  })
  it('passes save validation', async () => {
    props = {
      id: 'test1',
      enabled: '1',
      section: props.section
    }
    const wrapper = createWrapper(IoSchedulerEdit, {
      props,
      global: {
        provide,
        mocks: {
          $scheduler: {
            generateMonthDays: vi.fn()
          }
        }
      }
    })
    await expect(wrapper.vm.validateInterval()).resolves.toEqual()
  })
  it('fails validation when interval overlaps', async () => {
    props = {
      section: {
        id: 'test1',
        enabled: '1',
        pin: 'di'
      }
    }
    const wrapper = createWrapper(IoSchedulerEdit, {
      data: () => ({ formData: { scheduler: [] } }),
      props,
      global: {
        provide,
        mocks: {
          $scheduler: {
            generateMonthDays: vi.fn(),
            validateInterval: vi.fn().mockReturnValueOnce({ invalid: 1, error: 'overlap' })
          }
        }
      }
    })
    await expect(wrapper.vm.validateInterval()).rejects.toEqual('Scheduler interval overlaps with already enabled interval of same output pin')
  })
  it('fails validation when interval starting time is same as the ending time', async () => {
    props = {
      section: {
        id: 'test1',
        enabled: '1',
        pin: 'di'
      }
    }
    const wrapper = createWrapper(IoSchedulerEdit, {
      data: () => ({ formData: { scheduler: [] } }),
      props,
      global: {
        provide,
        mocks: {
          $scheduler: {
            generateMonthDays: vi.fn(),
            validateInterval: vi.fn().mockReturnValueOnce({ invalid: 1, error: 'startsameasend' })
          }
        }
      }
    })
    await expect(wrapper.vm.validateInterval()).rejects.toEqual('Scheduler interval starting time is the same as the ending time')
  })
  it('passes validation', async () => {
    props = {
      section: {
        id: 'test1',
        enabled: '1',
        pin: 'di'
      }
    }
    const wrapper = createWrapper(IoSchedulerEdit, {
      data: () => ({ formData: { scheduler: [{ id: 'test', enabled: '1', pin: 'di' }] } }),
      props,
      global: {
        provide,
        mocks: {
          $scheduler: {
            generateMonthDays: vi.fn(),
            validateInterval: vi.fn().mockReturnValueOnce({ invalid: 0, error: 'startsameasend' })
          }
        }
      }
    })
    await expect(wrapper.vm.validateInterval()).resolves.toEqual()
  })
})
