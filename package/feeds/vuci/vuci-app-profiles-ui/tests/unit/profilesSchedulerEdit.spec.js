import ProfilesSchedulerEdit from '../../src/views/system/ProfilesSchedulerEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import profilesScheduler from '../../src/views/system/profilesScheduler.js'

describe('ProfilesSchedulerEdit.vue', () => {
  const section = { period: 'week' }
  const data = {
    model: '1',
    name: 'start_time',
    uciSection: {
      name: 'test',
      period: 'week',
      start_day: '1',
      start_time: '12:00',
      end_day: '2',
      end_time: '13:00',
      enabled: '1'
    }
  }
  it('returns period options (week days)', () => {
    const wrapper = createWrapper(ProfilesSchedulerEdit, { global: { provide: { profileNamesWithIds: () => [] } }, props: { section } })
    const week = [
      ['1', 'Monday'],
      ['2', 'Tuesday'],
      ['3', 'Wednesday'],
      ['4', 'Thursday'],
      ['5', 'Friday'],
      ['6', 'Saturday'],
      ['0', 'Sunday']
    ]
    expect(wrapper.vm.dayOpts).toEqual(week)
  })
  it('returns period options (month days)', () => {
    section.period = 'month'
    const wrapper = createWrapper(ProfilesSchedulerEdit, { global: { provide: { profileNamesWithIds: () => [] } }, props: { section } })
    const month = []
    for (let i = 1; i <= 31; i++) {
      month.push([`${i}`, `${i}`])
    }
    expect(wrapper.vm.dayOpts).toEqual(month)
  })
  it('checks if enable can be turned on', async () => {
    const wrapper = createWrapper(ProfilesSchedulerEdit, { global: { provide: { profileNamesWithIds: () => [] } }, props: { section: data.uciSection } })
    wrapper.vm.customProfile = true
    const formData = {
      scheduler: [
        {
          enabled: '1',
          period: 'week'
        }
      ]
    }
    vi.spyOn(profilesScheduler, 'validateOverlap').mockReturnValue(false)
    wrapper.vm.profilesScheduler = data.uciSection
    wrapper.vm.formData = formData
    const res = await wrapper.vm.onBeforeSave()
    expect(res).toBe(true)
  })
  it('checks if onBeforeSave returns reject message when interval overlaps', () => {
    const data = {
      model: '1',
      name: 'start_time',
      uciSection: {
        name: 'test',
        period: 'week',
        start_day: '1',
        start_time: '12:00',
        end_day: '2',
        end_time: '13:00',
        enabled: '1'
      },
      computed: {
        customProfile: true
      }
    }
    const wrapper = createWrapper(ProfilesSchedulerEdit, { global: { provide: { profileNamesWithIds: () => [] } }, props: { section: data.uciSection } })
    const spy = vi.spyOn(profilesScheduler, 'validateOverlap').mockReturnValue(true)
    expect(wrapper.vm.onBeforeSave()).rejects.toEqual('Scheduler interval overlaps with already enabled interval of same time')
    spy.mockClear()
  })
  it('checks if onBeforeSave returns reject message when intervals have different period types', () => {
    const data = {
      model: '1',
      name: 'start_time',
      uciSection: {
        name: 'test',
        period: 'week',
        start_day: '1',
        start_time: '12:00',
        end_day: '2',
        end_time: '13:00',
        enabled: '1'
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
    const wrapper = createWrapper(ProfilesSchedulerEdit, { global: { provide: { profileNamesWithIds: () => [] } }, props: { section: data.uciSection } })
    const spy = vi.spyOn(profilesScheduler, 'validateOverlap').mockReturnValue(false)
    wrapper.vm.formData = formData
    expect(wrapper.vm.onBeforeSave()).rejects.toEqual('Only intervals of the same period type can be active at one time')
    spy.mockClear()
  })
})
