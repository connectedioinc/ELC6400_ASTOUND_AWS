import WebfilterSite from '../../src/views/services/WebfilterSite.vue'
import createWrapper from '@tests/unit/mockFactory'
describe('WebFilterSite.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(WebfilterSite, { data: () => ({ networkOptions: [] }) })
  })
  it.each([
    [
      true,
      [
        { success: true, data: [] },
        { success: true, data: [] }
      ],
      0
    ],
    [false, [{ success: false, data: [] }, { success: false }], 2]
  ])('invokes load data error messages when %s', async (status, data, response) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    const spy2 = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy2).toHaveBeenCalledTimes(response)
  })
  it('invokes error message when bulkGet fails', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.afterLoad()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each`
    value                | givesToValidator
    ${'*.myHost.com'}    | ${'a.myHost.com'}
    ${'*.'}              | ${'a.'}
    ${'*.lt'}            | ${'a.lt'}
    ${'test.myHost.com'} | ${'test.myHost.com'}
    ${'test.*.com'}      | ${'test.*.com'}
    ${'*.*.com'}         | ${'a.*.com'}
    ${'*.*.*'}           | ${'a.*.*'}
    ${'test.myHost.*'}   | ${'test.myHost.*'}
    ${'*test.com'}       | ${'*test.com'}
  `('gives to validator $givesToValidator" when gets value: "$host"', async ({ value, givesToValidator }) => {
    wrapper.vm.formData.block = [value]
    const spy = vi.spyOn(wrapper.vm.$VuciValidator, 'value', 'set')
    wrapper.vm.validateHostname(value)
    expect(spy).toBeCalledWith(givesToValidator)
  })
  it.each`
    value                | isValid
    ${'*.myHost.com'}    | ${true}
    ${'test.myHost.com'} | ${true}
    ${'test.*.com'}      | ${false}
    ${'a*.myHost.com'}   | ${false}
  `('returns isValid: $isValid when value: "$value"', async ({ value, isValid }) => {
    const result = wrapper.vm.validateWildCard(value)
    expect(result.isValid).toBe(isValid)
  })
  it('loads uploaded hosts from a file', () => {
    wrapper.setData({
      formData: {
        block: []
      }
    })
    const mockResponse = {
      status: 0,
      data: [
        {
          '.type': 'block',
          host: 'test1',
          enabled: '1'
        },
        {
          '.type': 'block',
          host: 'test2',
          enabled: '1'
        },
        {
          '.type': 'block',
          host: 'test3',
          enabled: '1'
        },
        {
          '.type': 'block',
          host: 'test4',
          enabled: '1'
        }
      ]
    }
    const expected = [
      { '.type': 'block', enabled: '1', host: 'test1' },
      { '.type': 'block', enabled: '1', host: 'test2' },
      { '.type': 'block', enabled: '1', host: 'test3' },
      { '.type': 'block', enabled: '1', host: 'test4' }
    ]
    wrapper.vm.onUpload({ res: mockResponse })
    expect(wrapper.vm.formData.block).toEqual(expected)
  })
  it.each`
    value        | isValid  | enabledHotspot
    ${'hotspot'} | ${true}  | ${true}
    ${'hotspot'} | ${false} | ${false}
    ${'all'}     | ${true}  | ${true}
    ${'all'}     | ${true}  | ${false}
    ${'lan2'}    | ${true}  | ${true}
    ${'lan2'}    | ${true}  | ${false}
  `('returns isValid: $isValid when value: "$value"', async ({ value, isValid, enabledHotspot }) => {
    wrapper.vm.enabledHotspot = enabledHotspot
    const result = wrapper.vm.validateHotspot(value)
    expect(result.isValid).toBe(isValid)
  })
  it('return validation message when hotspot is not enabled', () => {
    wrapper.vm.enabledHotspot = false
    const result = wrapper.vm.validateHotspot('hotspot')
    expect(result.isValid).toBe(false)
    expect(result.message).toBe('Hotspot instance must be enabled')
  })
  it('should show error message when hotspot is selected but not enabled', () => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.validateHotspot('hotspot')
    expect(spy).toBeCalledWith('Hotspot instance must be enabled')
  })
  it('should show error', async () => {
    const errorMsg = 'Cannot create more than 1000 sections'
    const err = {
      data: {
        errors: [
          {
            error: errorMsg
          }
        ]
      }
    }
    const res = wrapper.vm.handleError(err)
    expect(res).toBe(errorMsg)
  })
  it.each([
    [
      'parent-child relationships',
      {
        block: [{ host: 'parent1' }, { host: 'parent2' }, { host: 'child1', phost: 'parent1' }, { host: 'child2', phost: 'parent1' }, { host: 'child3', phost: 'parent2' }]
      },
      [
        {
          host: 'parent1',
          _children: [
            { host: 'child1', phost: 'parent1' },
            { host: 'child2', phost: 'parent1' }
          ]
        },
        {
          host: 'parent2',
          _children: [{ host: 'child3', phost: 'parent2' }]
        }
      ]
    ],
    [
      'mixed parent-child and standalone items',
      {
        block: [{ host: 'parent1' }, { host: 'child1', phost: 'parent1' }, { host: 'standalone1' }, { host: 'standalone2' }]
      },
      [
        {
          host: 'parent1',
          _children: [{ host: 'child1', phost: 'parent1' }]
        },
        { host: 'standalone1' },
        { host: 'standalone2' }
      ]
    ],
    ['empty block array', { block: [] }, []],
    [
      'no parent-child relationships',
      {
        block: [{ host: 'item1' }, { host: 'item2' }, { host: 'item3' }]
      },
      [{ host: 'item1' }, { host: 'item2' }, { host: 'item3' }]
    ]
  ])('should process %s correctly', (_, form, expected) => {
    wrapper.vm.$refs.vuciForm.initialForm = {}
    wrapper.setData({
      formData: form
    })
    wrapper.vm.extraLoad(form)
    wrapper.vm.$refs.vuciForm.initialForm = { block: form.block }
    expect(form.block).toEqual(expected)
  })
  it('loads data', async () => {
    const existingData = [{ id: '1', host: 'existing-host' }]
    wrapper.vm.formData.block = existingData
    const webfilterStatus = [{ id: '1', host: 'test' }]
    wrapper.vm.$axios.get = vi.fn().mockResolvedValue({ data: webfilterStatus })
    wrapper.vm.extraLoad = vi.fn()
    await wrapper.vm.updateHostnames()
    expect(wrapper.vm.formData.block).toEqual(existingData)
  })
  it('shows error', async () => {
    wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.updateHostnames()
    expect(spy).toBeCalled()
  })
  it.each`
    code   | status
    ${'0'} | ${'Disabled'}
    ${'1'} | ${'Enabled'}
  `('returns "$status" when code: "$code"', ({ code, status }) => {
    const result = wrapper.vm.parseEnabled(code)
    expect(result).toBe(status)
  })
  it('displays show message when delete is clicked', async () => {
    const data = [{ id: 'test' }]
    wrapper.vm.formData = { block: data }
    wrapper.vm.checkedSections = data
    wrapper.vm.$axios.delete = vi.fn()
    wrapper.vm.$axios.delete.mockResolvedValueOnce([{ success: true, data }])
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.onDeleteClick(data)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockClear()
  })
  it.each([
    {
      name: 'filters out child IDs when parent is selected',
      block: [
        {
          id: 'cfg027fd0',
          host: 'datmuseum.azurecr.io',
          _children: [
            {
              id: 'cfg037fd0',
              host: 'r0910weu-5-az.westeurope.cloudapp.azure.com',
              phost: 'datmuseum.azurecr.io'
            }
          ]
        },
        {
          id: 'cfg047fd0',
          host: 'asd'
        },
        {
          id: 'cfg057fd0',
          host: 'dsa'
        }
      ],
      input: ['cfg027fd0', 'cfg037fd0', 'cfg047fd0', 'cfg057fd0'],
      expected: ['cfg027fd0', 'cfg047fd0', 'cfg057fd0']
    },
    {
      name: 'keeps child ID when parent is not selected',
      block: [
        {
          id: 'cfg027fd0',
          host: 'datmuseum.azurecr.io',
          _children: [
            {
              id: 'cfg037fd0',
              host: 'r0910weu-5-az.westeurope.cloudapp.azure.com',
              phost: 'datmuseum.azurecr.io'
            }
          ]
        }
      ],
      input: ['cfg037fd0'],
      expected: ['cfg037fd0']
    }
  ])('$name', ({ block, input, expected }) => {
    wrapper.vm.formData.block = block
    expect(wrapper.vm.filterCheckedSections(input)).toEqual(expected)
  })
})
