import createWrapper from '@tests/unit/mockFactory'
import Opcua from '../../src/views/services/Opcua.vue'
import * as opcuaUtils from '../../src/views/services/opcuaUtils.js'

const self = {
  server: [
    {
      id: 'Server',
      '.type': 'server'
    }
  ],
  group: [
    {
      id: 'Value',
      '.type': 'value_group'
    }
  ]
}
const serverNodes = [
  {
    id: '1',
    name: 'Node',
    '.type': 'server_node_Server'
  }
]
const groupValue = [
  {
    id: 'val',
    '.type': 'value_Value'
  }
]
const successfulBulk = [
  {
    success: true,
    data: { enabled: '1' }
  },
  {
    success: true,
    data: serverNodes
  },
  {
    success: true,
    data: groupValue
  }
]

function assertResultEqual(actual, expected) {
  if (expected.isValid) {
    expect(actual?.isValid).toBeTruthy()
  } else {
    expect(actual?.isValid).toBeFalsy()
    expect(actual?.message).toEqual(expected.message)
  }
}

describe('Opcua.vue', () => {
  it('deletes deleted server nodes', () => {
    const uciData = {
      serverNodes: [
        { '.type': 'server_node_1', id: '1' },
        { '.type': 'server_node_10', id: '10' }
      ],
      groupValue: [
        {
          server_node: '1',
          enabled: '1'
        }
      ]
    }
    const expectedUciData = {
      serverNodes: [{ '.type': 'server_node_10', id: '10' }],
      groupValue: [
        {
          enabled: '0',
          server_node: '1'
        }
      ]
    }
    const section = {
      id: 1
    }
    const wrapper = createWrapper(Opcua)
    wrapper.vm.onServerDelete(section, uciData)
    expect(uciData).toEqual(expectedUciData)
  })

  it('deletes deleted group values', () => {
    const uciData = {
      groupValue: [{ '.type': 'value_1' }, { '.type': 'value_10' }]
    }
    const expectedUciData = {
      groupValue: [{ '.type': 'value_10' }]
    }
    const section = {
      id: '1'
    }
    const wrapper = createWrapper(Opcua)
    wrapper.vm.onGroupDelete(section, uciData)
    expect(uciData).toEqual(expectedUciData)
  })
  it('check if first load is set', async () => {
    const wrapper = createWrapper(Opcua)
    wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true)
    expect(wrapper.vm.stateChanged).toBe(true)
  })
  it('check if state change is not set during first load', async () => {
    const wrapper = createWrapper(Opcua)
    wrapper.vm.$options.watch['globalEnabled.globalStatus'].call(wrapper.vm, true, 'firstLoad')
    expect(wrapper.vm.stateChanged).toBe(false)
  })
  it('check if message is shown', async () => {
    const wrapper = createWrapper(Opcua)
    const spyOn = vi.spyOn(wrapper.vm.$notification, 'info')
    wrapper.vm.stateChanged = true
    wrapper.vm.globalEnabled.globalStatus = false
    wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
    expect(spyOn).toHaveBeenCalledTimes(1)
  })
  it('check if message is removed', async () => {
    const wrapper = createWrapper(Opcua)
    const spyOn = vi.spyOn(wrapper.vm.$notification, 'remove')
    wrapper.vm.stateChanged = true
    wrapper.vm.globalEnabled.globalStatus = true
    wrapper.vm.$options.watch.modalOpen.call(wrapper.vm, false)
    expect(spyOn).toHaveBeenCalledTimes(1)
  })
  it('loads server node and value group data when API call is successful', async () => {
    const wrapper = createWrapper(Opcua)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(successfulBulk)
    const result = await wrapper.vm.loadData(self)
    expect(wrapper.vm.globalEnabled).toEqual({ globalStatus: true })
    expect(result).toEqual({ serverNodes, groupValue })
  })

  it('fails to load server node and value group data', async () => {
    const wrapper = createWrapper(Opcua)
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData(self)
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred.')
  })

  it.each`
    title                            | name       | returnedValue
    ${'hint if instance'}            | ${'Value'} | ${{ isValid: false, message: "Instance 'Value' already exists" }}
    ${"nothing if instance doesn't"} | ${'Test'}  | ${{ isValid: true }}
  `('displays $title exist with the same name', ({ name, returnedValue }) => {
    const wrapper = createWrapper(Opcua)
    wrapper.vm.formData = { groupValue: [{ name: 'Value' }] }
    const result = wrapper.vm.instanceExists(name, 'groupValue')
    expect(result).toEqual(returnedValue)
  })

  it.each([
    [10, { isValid: false, message: 'Server limit was reached (10 max)' }],
    [15, { isValid: false, message: 'Server limit was reached (10 max)' }],
    [5, { isValid: true }]
  ])('checks server limit validation', (length, response) => {
    const wrapper = createWrapper(Opcua)
    wrapper.vm.formData = { server: Array(length).fill(self.server[0]) }
    const result = wrapper.vm.serverLimit()
    assertResultEqual(result, response)
  })

  it.each([
    [20, { isValid: false, message: 'Group limit was reached (20 max)' }],
    [18, { isValid: true }]
  ])('checks group limit validation', (length, expected) => {
    const wrapper = createWrapper(Opcua)
    wrapper.vm.formData = { group: Array(length).fill(self.group[0]) }
    const result = wrapper.vm.groupLimit()
    assertResultEqual(result, expected)
  })

  it('returns Server data', () => {
    const wrapper = createWrapper(Opcua)
    const section = {
      '.type': 'server',
      enabled: '0',
      id: '1',
      name: 'aaa',
      timeout: '5000',
      url: 'http://www.example.com'
    }
    expect(wrapper.vm.getServerTestData(section)).toEqual({
      timeout: '5000',
      url: 'http://www.example.com'
    })
  })

  it('returns Value group data', () => {
    const section = {
      '.type': 'value_group',
      fail_mode: '0',
      fail_store: '1',
      id: '2',
      midfix: ',',
      name: 'iii',
      period: '60',
      postfix: ']',
      prefix: '[',
      replacement: 'null',
      scheduling_type: '0'
    }

    expect(opcuaUtils.getGroupTestData(section)).toEqual({
      fail_mode: '0',
      midfix: ',',
      postfix: ']',
      prefix: '[',
      replacement: 'null'
    })
  })
})
