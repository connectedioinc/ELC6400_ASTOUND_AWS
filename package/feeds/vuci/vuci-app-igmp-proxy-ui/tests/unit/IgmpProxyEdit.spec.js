import IgmpProxyEdit from '../../src/views/services/IgmpProxyEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

const interfaces = [{ id: 'lan' }, { id: 'wan6' }, { id: 'wan' }]
const firewallZones = [{ name: 'lan' }, { name: 'wan' }]

const options = {
  interfaces,
  zones: firewallZones
}

const props = {
  section: {
    id: 'aaa'
  }
}
describe('IgmpProxyEdit.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(IgmpProxyEdit, { props, global: { provide: { formOptions: () => options } } })
  })
  it.each`
    dataOptions        | expected         | dataText
    ${'interfaceOpts'} | ${interfaces}    | ${'interfaces'}
    ${'zoneOpts'}      | ${firewallZones} | ${'firewall zones'}
  `('check if "$dataText" data is loaded', async ({ dataOptions, expected }) => {
    await expect(wrapper.vm[dataOptions]).toEqual(expected)
  })
  it('if section direction not equal upstream', async () => {
    await wrapper.setProps({ section: { direction: 'downstream' } })
    await expect(wrapper.vm.onBeforeSave()).resolves.toEqual()
  })
  it('shows error message if direction upstream exists in the list', async () => {
    await wrapper.setProps({ section: { id: 'cfg03e6c1', direction: 'upstream' } })
    wrapper.vm.formData.igmpproxy = [{ id: 'cfg03e6c2', direction: 'upstream' }]
    await expect(wrapper.vm.onBeforeSave()).rejects.toEqual('Only a single instance with upstream direction can be saved.')
  })
  it('resolves if direction upstream not exists in the list', async () => {
    await wrapper.setProps({ section: { id: 'cfg03e6c1', direction: 'upstream' } })
    wrapper.vm.formData.igmpproxy = [{ id: 'cfg03e6c1', direction: 'downstream' }]
    await expect(wrapper.vm.onBeforeSave()).resolves.toEqual()
  })
})
