import AvlInput from '../../src/views/services/AvlInput'
import createWrapper from '@tests/unit/mockFactory'
const ioResponse = [
  {
    id: 'one',
    type: 'gpio',
    direction: 'in',
    name_with_pins: 'One (1)'
  },
  {
    id: 'two',
    type: 'adc',
    direction: 'out',
    name_with_pins: 'Two (2)'
  }
]

describe('AvlInput.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(AvlInput)
    wrapper.vm.$io.getPinsInfo = vi.fn()
    wrapper.vm.$io.filterIO = vi.fn()
    wrapper.vm.$io.getPinsInfo.mockResolvedValueOnce(ioResponse)
    wrapper.vm.$io.filterIO.mockResolvedValueOnce(ioResponse)
  })
  it('check that correct event is displayed', () => {
    expect(wrapper.vm.displayEvent({ event: 'bull' })).toEqual('N/A')
    expect(wrapper.vm.displayEvent({ event: 'no' })).toEqual('Input active')
    expect(wrapper.vm.displayEvent({ event: 'nc' })).toEqual('Input low')
    expect(wrapper.vm.displayEvent({ event: 'both' })).toEqual('Both')
    expect(wrapper.vm.displayEvent({ event: 'in' })).toEqual('In (0V - 0V)')
    expect(wrapper.vm.displayEvent({ event: 'out' })).toEqual('Out (0V - 0V)')
    expect(wrapper.vm.displayEvent({ event: 'in', min: 15 })).toEqual('In (15V - 0V)')
    expect(wrapper.vm.displayEvent({ event: 'out', max: 15 })).toEqual('Out (0V - 15V)')
  })
  it('displays correctPriority', () => {
    wrapper.setData({
      priorities: {
        first: 'FIRST!!!'
      }
    })
    expect(wrapper.vm.displayPriority('first')).toEqual('FIRST!!!')
    expect(wrapper.vm.displayPriority('none')).toEqual('N/A')
  })
  it('displays IoName if found, else - just given value', () => {
    wrapper.setData({
      ioList: [{ id: 'din1', name_with_pins: 'OUTPUT 1' }]
    })
    expect(wrapper.vm.displayIOName('value')).toEqual('value')
    expect(wrapper.vm.displayIOName('din1')).toEqual('OUTPUT 1')
  })
  it("update triggers changes GpioType's value", () => {
    expect(wrapper.vm.isGpioType).toEqual(false)
    wrapper.setData({
      ioList: [{ id: 'notBullseye', type: 'gpio' }]
    })
    wrapper.vm.updateTriggers('notBullseye')
    expect(wrapper.vm.isGpioType).toBeTruthy()
    wrapper.vm.updateTriggers('bullseye')
    expect(wrapper.vm.isGpioType).toBeFalsy()
  })
  it.each([
    [{ io_name: 'test', priority: 'test', event: 'test' }, false],
    [{}, true]
  ])('validates section', (value, response) => {
    const val = wrapper.vm.validateSection(value)
    expect(val.invalid).toEqual(response)
  })
  it('checks if afterLoad returns error message when request is unsuccessful', async () => {
    wrapper.vm.$axios.get = vi.fn()
    wrapper.vm.$axios.get.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('Failed to load I/O data')
  })
})
