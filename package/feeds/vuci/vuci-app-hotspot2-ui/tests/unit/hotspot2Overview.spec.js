import Hotspot2Overview from '../../src/views/services/Hotspot2Overview.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('Hotspot2Overview.vue', () => {
  it('parses bulkResponse into objects and shows errors when needed', async () => {
    const wrapper = createWrapper(Hotspot2Overview)
    const dividedResponse = [
      [{ success: true, data: { test1: 'test1Value' } }, { success: false }],
      [{ success: false }, { success: true, data: { test2: 'test2Value' } }]
    ]
    const formItems = [
      { id: 'item1', ssid: 'My item #1' },
      { id: 'item2', ssid: 'My item #2' }
    ]
    const sections = ['section1', 'section2']
    const expectedRes = {
      item1_section1: { test1: 'test1Value' },
      item2_section2: { test2: 'test2Value' }
    }
    wrapper.vm.$message.error = vi.fn()
    const errorSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.divideArray = vi.fn().mockReturnValueOnce(dividedResponse)
    const result = await wrapper.vm.parseBulkResponse(formItems, sections, 'ssid', [])

    expect(result).toEqual(expectedRes)
    expect(errorSpy).toHaveBeenNthCalledWith(1, 'Failed to load data from "section2" endpoint in "My item #1" section')
    expect(errorSpy).toHaveBeenNthCalledWith(2, 'Failed to load data from "section1" endpoint in "My item #2" section')
  })
  it('sends error on failed bulkGet', async () => {
    const wrapper = createWrapper(Hotspot2Overview)
    wrapper.vm.buildBulkRequest = vi.fn().mockReturnValueOnce([])
    wrapper.vm.$message.error = vi.fn()
    const errorSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValueOnce()
    const result = await wrapper.vm.afterLoad({})
    expect(result).toEqual({})
    expect(errorSpy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('returns parsed response if bulkGet is successful', async () => {
    const wrapper = createWrapper(Hotspot2Overview)
    const returnedObject = {
      item1_section1: { test1: 'test1Value' },
      item2_section2: { test2: 'test2Value' }
    }
    wrapper.vm.buildBulkRequest = vi.fn().mockReturnValueOnce([])
    wrapper.vm.$message.error = vi.fn()
    const errorSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: true, data: [{ id: 'test' }] }, {}, {}])
    wrapper.vm.parseBulkResponse = vi.fn().mockReturnValueOnce(returnedObject)
    const result = await wrapper.vm.afterLoad({})
    expect(result).toEqual(returnedObject)
    expect(wrapper.vm.wirelessInterfaces).toEqual([{ id: 'test' }])
    expect(errorSpy).not.toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('invokes error message when wireless request is unsuccessful', async () => {
    const wrapper = createWrapper(Hotspot2Overview)
    const returnedObject = {
      item1_section1: { test1: 'test1Value' },
      item2_section2: { test2: 'test2Value' }
    }
    wrapper.vm.buildBulkRequest = vi.fn().mockReturnValueOnce([])
    wrapper.vm.$message.error = vi.fn()
    const errorSpy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: false }, {}, {}])
    wrapper.vm.parseBulkResponse = vi.fn().mockReturnValueOnce(returnedObject)
    const result = await wrapper.vm.afterLoad({})
    expect(result).toEqual(returnedObject)
    expect(wrapper.vm.wirelessInterfaces).toEqual([])
    expect(errorSpy).toHaveBeenCalledWith('Failed to load wireless interfaces')
    expect(errorSpy).not.toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('returns formOptions', () => {
    const wrapper = createWrapper(Hotspot2Overview)
    expect(wrapper.vm.getFormOptions()).toEqual({
      wirelessInterfaces: []
    })
  })
  it('makes request array for bulk request', async () => {
    const wrapper = createWrapper(Hotspot2Overview)
    const formItems = [{ id: 'item1' }, { id: 'item2' }, { id: 'item3' }]
    const sections = ['section1', 'section2', 'section3']
    const expectedResult = [
      '/api/myEndpoint/item1/section1/config',
      '/api/myEndpoint/item1/section2/config',
      '/api/myEndpoint/item1/section3/config',
      '/api/myEndpoint/item2/section1/config',
      '/api/myEndpoint/item2/section2/config',
      '/api/myEndpoint/item2/section3/config',
      '/api/myEndpoint/item3/section1/config',
      '/api/myEndpoint/item3/section2/config',
      '/api/myEndpoint/item3/section3/config'
    ]
    const endpoint = '/api/myEndpoint'
    const result = await wrapper.vm.buildBulkRequest(endpoint, formItems, sections)
    expect(result).toEqual(expectedResult)
  })
  it('devides array into equal parts', async () => {
    const wrapper = createWrapper(Hotspot2Overview)
    const array = [
      '/api/myEndpoint/item1/section1',
      '/api/myEndpoint/item1/section2',
      '/api/myEndpoint/item1/section3',
      '/api/myEndpoint/item2/section1',
      '/api/myEndpoint/item2/section2',
      '/api/myEndpoint/item2/section3',
      '/api/myEndpoint/item3/section1',
      '/api/myEndpoint/item3/section2',
      '/api/myEndpoint/item3/section3'
    ]
    const expectedResult = [
      ['/api/myEndpoint/item1/section1', '/api/myEndpoint/item1/section2', '/api/myEndpoint/item1/section3'],
      ['/api/myEndpoint/item2/section1', '/api/myEndpoint/item2/section2', '/api/myEndpoint/item2/section3'],
      ['/api/myEndpoint/item3/section1', '/api/myEndpoint/item3/section2', '/api/myEndpoint/item3/section3']
    ]
    const result = await wrapper.vm.divideArray(array, 3)
    expect(result).toEqual(expectedResult)
  })
})
