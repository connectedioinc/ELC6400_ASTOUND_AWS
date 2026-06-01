import ProfilesScheduler from '../../src/views/system/ProfilesScheduler.vue'
import createWrapper from '@tests/unit/mockFactory'
import profilesScheduler from '../../src/views/system/profilesScheduler.js'

describe('ProfilesScheduler.vue', () => {
  it('returns period name', () => {
    const wrapper = createWrapper(ProfilesScheduler)
    expect(wrapper.vm.loadPeriod('week')).toEqual('Weekdays')
    expect(wrapper.vm.loadPeriod('month')).toEqual('Month days')
    expect(wrapper.vm.loadPeriod('test')).toEqual('-')
  })
  it('returns beginning or ending of interval (week day, month day)', () => {
    const data = {
      name: 'start_time',
      uciSection: {
        period: 'week',
        start_day: '1',
        start_time: '12:00',
        end_day: '2',
        end_time: '13:00'
      }
    }
    const wrapper = createWrapper(ProfilesScheduler)
    expect(wrapper.vm.loadInterval('', data)).toEqual('Every Monday, 12:00')
    data.name = 'end_time'
    expect(wrapper.vm.loadInterval('', data)).toEqual('Every Tuesday, 13:00')
    data.uciSection.period = 'month'
    expect(wrapper.vm.loadInterval('', data)).toEqual('Every 2nd day of month, 13:00')
    data.name = 'start_time'
    expect(wrapper.vm.loadInterval('', data)).toEqual('Every 1st day of month, 12:00')
    data.uciSection.start_day = '3'
    expect(wrapper.vm.loadInterval('', data)).toEqual('Every 3rd day of month, 12:00')
    data.uciSection.start_day = '29'
    data.uciSection.force_last = '1'
    expect(wrapper.vm.loadInterval('', data)).toEqual('Every last day of month, 12:00')
    data.uciSection.period = 'something'
    expect(wrapper.vm.loadInterval('', data)).toEqual('-')
  })
  it('displays error message when getProfileNames API get call is not successful', async () => {
    const wrapper = createWrapper(ProfilesScheduler)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadProfileNames()
    expect(spy).toHaveBeenCalledWith('Failed to load profile names')
    spy.mockClear()
  })
  it('returns array of profile ids and names', async () => {
    const profile = [{ profile_id: '0', id: 'default' }]
    const wrapper = createWrapper(ProfilesScheduler)
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({ success: true, data: profile })
    await wrapper.vm.loadProfileNames()
    expect(wrapper.vm.customProfile).toEqual(true)
  })
  it('returns error message when no custom profile is available', () => {
    const wrapper = createWrapper(ProfilesScheduler, {
      computed: {
        customProfile() {
          return true
        }
      }
    })
    expect(wrapper.vm.errorHandler.create()).toEqual('Scheduler instances can be created only if atleast one custom profile is available')
  })
  it('checks if enable can be turned on', () => {
    const wrapper = createWrapper(ProfilesScheduler)
    const data = {
      model: '1',
      name: 'start_time',
      uciSection: {
        name: 'test',
        period: 'week',
        start_day: '1',
        start_time: '12:00',
        end_day: '2',
        end_time: '13:00'
      },
      computed: {
        customProfile: true
      }
    }
    const formData = {
      scheduler: [
        {
          enabled: '1',
          period: 'week'
        }
      ]
    }
    const spy = vi.spyOn(profilesScheduler, 'validateOverlap').mockReturnValue(true)
    const spy2 = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.formData = formData
    wrapper.vm.validateEnable(data)
    expect(spy2).toHaveBeenCalledWith('Scheduler interval overlaps with already enabled interval of same time')
    spy.mockClear()
    spy2.mockClear()
  })
  it("checks if enable can be turned on when doesn't overlap", () => {
    const wrapper = createWrapper(ProfilesScheduler)
    const data = {
      model: '1',
      name: 'start_time',
      uciSection: {
        name: 'test',
        period: 'week',
        start_day: '1',
        start_time: '12:00',
        end_day: '2',
        end_time: '13:00'
      },
      computed: {
        customProfile: true
      }
    }
    const formData = {
      scheduler: [
        {
          enabled: '1',
          period: 'month'
        }
      ]
    }
    const spy = vi.spyOn(profilesScheduler, 'validateOverlap').mockReturnValue(false)
    const spy2 = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.formData = formData
    wrapper.vm.validateEnable(data)
    expect(spy2).toHaveBeenCalledWith('Only intervals of the same period type can be active at one time')
    spy.mockClear()
    spy2.mockClear()
  })
  it('returns time number from day and time', () => {
    createWrapper(ProfilesScheduler)
    expect(profilesScheduler.getTimeNumber('1', '12:30')).toEqual(11230)
  })
  it('checks if intervals overlap', () => {
    createWrapper(ProfilesScheduler)
    expect(profilesScheduler.intervalRangesOverlap(11550, 11830, 11230, 21200)).toEqual(true)
    expect(profilesScheduler.intervalRangesOverlap(11550, 11830, 11230, 11600)).toEqual(true)
    expect(profilesScheduler.intervalRangesOverlap(11550, 11830, 11550, 11830)).toEqual(true)
    expect(profilesScheduler.intervalRangesOverlap(11230, 21200, 11550, 21100)).toEqual(true)
    expect(profilesScheduler.intervalRangesOverlap(11230, 21200, 21550, 21830)).toEqual(false)
  })
  it('returns profile name', () => {
    const wrapper = createWrapper(ProfilesScheduler)
    wrapper.vm.profiles = [['default', 'Default']]
    const res = wrapper.vm.loadName('default')
    expect(res).toEqual('Default')
  })
})
