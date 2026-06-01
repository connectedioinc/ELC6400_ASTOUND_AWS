import Hotspot2Edit from '../../src/views/services/Hotspot2Edit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Hotspot2Edit.vue', () => {
  it.each`
    val                 | expectedRes
    ${'aaaaaa'}         | ${true}
    ${'aaaaaaaa'}       | ${true}
    ${'aaaaaaaaaa'}     | ${true}
    ${'aa'}             | ${false}
    ${'aaaaaaaaaaaaaa'} | ${false}
  `('returns $expectedRes when val: $val', ({ val, expectedRes }) => {
    const wrapper = createWrapper(Hotspot2Edit, {
      global: {
        provide: {
          formOptions: () => ({ wirelessInterfaces: [{ id: 'test' }] })
        }
      },
      props: { section: { id: 'test' } }
    })
    const result = wrapper.vm.roamingConsortiumValidation(val)
    expect(result.isValid).toBe(expectedRes)
  })
  it.each`
    val           | expectedRes
    ${'aaa'}      | ${true}
    ${'aaa aaa'}  | ${true}
    ${'aaa aa a'} | ${true}
    ${"aaa ' "}   | ${false}
    ${'aaa `'}    | ${false}
    ${'aaa "'}    | ${false}
  `('validate name with spaces', ({ val, expectedRes }) => {
    const wrapper = createWrapper(Hotspot2Edit, {
      global: {
        provide: {
          formOptions: () => ({ wirelessInterfaces: [{ id: 'test' }] })
        }
      },
      props: { section: { id: 'test' } }
    })
    const result = wrapper.vm.nameValidation(val)
    expect(result.isValid).toBe(expectedRes)
  })
  it('returns correct venue options when it exists', async () => {
    const wrapper = createWrapper(Hotspot2Edit, {
      global: {
        provide: {
          formOptions: () => ({ wirelessInterfaces: [{ id: 'test' }] })
        }
      },
      props: { section: { id: 'test', venue_group: '11' } }
    })
    const expectedRes = [
      ['0', 'Unspecified Outdoor'],
      ['1', 'Muni-mesh Network'],
      ['2', 'City Park'],
      ['3', 'Rest Area'],
      ['4', 'Traffic Control'],
      ['5', 'Bus Stop'],
      ['6', 'Kiosk']
    ]
    const res = wrapper.vm.venueTypeOptions
    expect(res).toEqual(expectedRes)
  })
  it("returns empty array when venue_group doesn't exists", async () => {
    const wrapper = createWrapper(Hotspot2Edit, {
      global: {
        provide: {
          formOptions: () => ({ wirelessInterfaces: [{ id: 'test' }] })
        }
      },
      props: { section: { id: 'test', venue_group: '100000' } }
    })
    const res = wrapper.vm.venueTypeOptions
    expect(res).toEqual([])
  })
  it('returns wirelessDevice from form when it exists', async () => {
    const wrapper = createWrapper(Hotspot2Edit, {
      global: {
        provide: {
          formOptions: () => ({ wirelessInterfaces: [{ id: 'test' }] })
        }
      },
      props: { section: { id: 'test' } }
    })
    wrapper.vm.formData = { wirelessDevice: { id: '000' } }
    const res = wrapper.vm.wirelessDevice
    expect(res).toEqual(wrapper.vm.formData.wirelessDevice)
  })
  it('returns empty object from form when it exists', async () => {
    const wrapper = createWrapper(Hotspot2Edit, {
      global: {
        provide: {
          formOptions: () => ({ wirelessInterfaces: [{ id: 'test' }] })
        }
      },
      props: { section: { id: 'test' } }
    })
    const res = wrapper.vm.wirelessDevice
    expect(res).toEqual({})
  })
})
