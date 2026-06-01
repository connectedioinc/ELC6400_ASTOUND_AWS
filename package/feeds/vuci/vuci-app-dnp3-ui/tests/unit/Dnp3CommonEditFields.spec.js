import createWrapper from '@tests/unit/mockFactory'
import Dnp3CommonInterfaceFields from '../../src/views/services/Dnp3CommonEditFields'

describe('Dnp3CommonEditFields.vue', () => {
  const propsData = {
    section: { id: 'dsdqe233', '.type': 'instance', device: 'foo' },
    formData: { dsdqe233: { '.type': 'instance', id: 'dsdqe233' } },
    tcpClient: true,
    status: [],
    devices: []
  }

  it.each`
    otherSections                                                    | isValid  | tcp
    ${[{ local_addr: '1.1.1.1', id: 'fffffff' }]}                    | ${false} | ${true}
    ${[{ local_addr: '2.2.2.2', id: 'fffffff' }]}                    | ${true}  | ${true}
    ${[{ local_addr: '1.1.1.1', id: 'aaaaaaaaa' }]}                  | ${true}  | ${true}
    ${[{ local_addr: '2.2.2.2', id: 'aaaaaaaaa' }]}                  | ${true}  | ${true}
    ${[{ device: 'test', local_addr: '1.1.1.1', id: 'aaaaaaaaab' }]} | ${false} | ${false}
    ${[{ local_addr: '2.2.2.2', id: 'aaaaaaaaa' }]}                  | ${true}  | ${false}
  `('returns isValid: $isValid when otherSections: $otherSections', async ({ otherSections, isValid, tcp }) => {
    const wrapper = createWrapper(Dnp3CommonInterfaceFields, { propsData })
    await wrapper.setProps({
      tcpClient: tcp,
      formData: { dnp3: otherSections },
      section: { local_addr: '1.1.1.1', id: 'aaaaaaaaa', device: 'test' }
    })
    const result = wrapper.vm.validateAddress('1.1.1.1')
    expect(result.isValid).toBe(isValid)
  })
})
