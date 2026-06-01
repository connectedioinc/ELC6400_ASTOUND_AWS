import createWrapper from '@tests/unit/mockFactory'
import AzureIotHub from '../../src/views/services/AzureIotHub.vue'
import { axios } from '@ui-core/plugins/axios'
import { useMessages } from '@/stores/messages'

describe('AzureIotHub.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(AzureIotHub)
  })

  it('sets azureStatuses on successful axios get request', async () => {
    const mockData = { status: 'ok' }
    axios.get = vi.fn().mockResolvedValue({ data: mockData })
    await wrapper.vm.loadStatuses()
    expect(wrapper.vm.azureStatuses).toEqual(mockData)
  })

  it('successfully loads data', async () => {
    const mockDsCollections = { success: true, data: [{ id: 1 }] }
    const mockDsOutputs = { success: true, data: [{ id: 2 }] }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    axios.bulkGet = vi.fn().mockResolvedValue([mockDsCollections, mockDsOutputs])

    await wrapper.vm.loadData({})

    expect(wrapper.vm.dsCollections).toEqual([{ id: 1 }])
    expect(wrapper.vm.dsOutputs).toEqual([{ id: 2 }])
    expect(spy).not.toHaveBeenCalled()
  })
  it('handles failure in loading collections', async () => {
    const mockDsCollections = { success: false }
    const mockDsOutputs = { success: true, data: [{ id: 2 }] }

    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    axios.bulkGet = vi.fn().mockResolvedValue([mockDsCollections, mockDsOutputs])
    await wrapper.vm.loadData({})
    expect(spy).toHaveBeenCalledWith('Failed to load Data to Server collections')
  })
  it('handles unexpected errors', async () => {
    const message = useMessages()
    const spy = vi.spyOn(message, 'error')
    axios.bulkGet = vi.fn().mockRejectedValue(new Error('Network error'))
    await wrapper.vm.loadData({})
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it('correctly identifies missing options and adds their translations to missingOptions', () => {
    const section = {
      name: 'Example',
      description: ''
    }
    const translations = {
      name: 'Name',
      description: 'Description',
      category: 'Category'
    }
    const options = ['name', 'description', 'category']
    const missingOptions = []
    wrapper.vm.findMissingOptions(section, translations, options, missingOptions)
    expect(missingOptions).toEqual(['Description', 'Category'])
  })
  it('does not add options that are present in the section', () => {
    const section = {
      name: 'Example',
      description: 'This is a description.',
      category: ''
    }
    const translations = {
      name: 'Name',
      description: 'Description',
      category: 'Category'
    }
    const options = ['name', 'description', 'category']
    const missingOptions = []
    wrapper.vm.findMissingOptions(section, translations, options, missingOptions)
    expect(missingOptions).toEqual(['Category'])
  })
  it('ignores options without translations', () => {
    const section = {
      name: '',
      description: '',
      category: ''
    }
    const translations = {
      description: 'Description',
      category: 'Category'
    }
    const options = ['name', 'description', 'category', 'nonexistent']
    const missingOptions = []
    wrapper.vm.findMissingOptions(section, translations, options, missingOptions)
    expect(missingOptions).toEqual(['Description', 'Category'])
  })
})
