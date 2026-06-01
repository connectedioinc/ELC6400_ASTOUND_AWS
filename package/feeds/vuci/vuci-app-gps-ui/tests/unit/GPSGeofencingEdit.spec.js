import GPSGeofencingEdit from '../../src/views/services/GPSGeofencingEdit'
import createWrapper from '@tests/unit/mockFactory'

const provide = { profiles: () => [] }
describe('GPSGeofencingEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(GPSGeofencingEdit, { props: { section: { id: 'abc' } }, global: { provide, mocks: { $map: { load: vi.fn(() => Promise.resolve()) } } } })
  })
  it('changes radius succesfuly', () => {
    wrapper.vm.renderGeofencing = vi.fn()
    wrapper.setData({ radius: 1 })
    expect(wrapper.vm.radius).toEqual(1)
    wrapper.vm.changeRadius({ model: '15' })
    expect(wrapper.vm.radius).toEqual(15)
  })

  it('changes latitude succesfuly', () => {
    wrapper.vm.renderGeofencing = vi.fn()
    wrapper.setData({
      center: [1, 2],
      circlePoint: [15, 5]
    })
    expect(wrapper.vm.center).toEqual([1, 2])
    expect(wrapper.vm.circlePoint).toEqual([15, 5])
    wrapper.vm.changeLatitude({ model: '15' })
    expect(wrapper.vm.center).toEqual([1, 15])
    expect(wrapper.vm.circlePoint).toEqual([15, 15])
  })

  it('changes longitude succesfuly', () => {
    wrapper.vm.renderGeofencing = vi.fn()
    wrapper.setData({
      center: [1, 2],
      circlePoint: [15, 5]
    })
    expect(wrapper.vm.center).toEqual([1, 2])
    expect(wrapper.vm.circlePoint).toEqual([15, 5])
    wrapper.vm.changeLongitude({ model: '25' })
    expect(wrapper.vm.center).toEqual([25, 2])
    expect(wrapper.vm.circlePoint).toEqual([25, 5])
  })
  it('checks if radius is calcultated', () => {
    wrapper.setData({
      circlePoint: [1, 2],
      radius: 100
    })
    expect(wrapper.vm.calculateRadius()).toEqual(99.4052488684445)
  })
  it('correct getLocation method behaviour on received data', () => {
    wrapper.vm.renderGeofencing = vi.fn()
    wrapper.setData({
      geofencingData: {
        geofences: [
          {
            id: 'abc',
            latitude: 0,
            longitude: 0
          }
        ]
      }
    })
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockResolvedValueOnce({
      data: {
        fix_status: '1',
        latitude: '15',
        longitude: '25'
      }
    })
    const spinSpy = vi.spyOn(wrapper.vm, '$spin')
    wrapper.vm.getLocation().then(() => {
      expect(wrapper.vm.center).toEqual([25, 15])
      expect(wrapper.vm.circlePoint).toEqual([25, 15])
      expect(spinSpy).toHaveBeenCalled(2)
    })
  })
  const profiles = [
    {
      id: 'test'
    }
  ]
  const props = {
    section: {}
  }
  it('updates service status value when ping_enabled changes', () => {
    const wrapper = createWrapper(GPSGeofencingEdit, { props, global: { provide: { profiles: () => profiles }, mocks: { $map: { load: vi.fn(() => Promise.resolve()) } } } })
    const value = wrapper.vm.serviceStatus
    expect(value)
    expect(wrapper.vm.profileOptions).toEqual([['', 'None'], 'test'])
  })
})
