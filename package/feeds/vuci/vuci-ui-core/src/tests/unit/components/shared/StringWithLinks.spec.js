import createWrapper from '@tests/unit/mockFactory'
import StringWithLinks, { formatLink } from '@/components/shared/StringWithLinks.vue'

describe('StringWithLinks.vue', () => {
  let wrapper
  let wrapperOptions
  beforeEach(() => {
    wrapperOptions = {
      props: {
        text: ''
      }
    }
    wrapper = createWrapper(StringWithLinks, wrapperOptions)
  })

  it('Renders string', async () => {
    const text = 'Some text'
    await wrapper.setProps({ text })
    expect(wrapper.vm.parts).toEqual([text])
  })

  it('Renders external link', async () => {
    const text = 'Some text before %s some text after'.format(formatLink('http://google.com', 'Google'))
    await wrapper.setProps({ text })
    expect(wrapper.vm.parts).toHaveLength(3)
    expect(wrapper.vm.parts[0]).toEqual('Some text before ')
    expect(wrapper.vm.parts[1].props).toEqual(expect.objectContaining({ customName: 'Google', icon: 'external-link', path: 'http://google.com' }))
    expect(wrapper.vm.parts[2]).toEqual(' some text after')
  })

  it('Renders internal link with custom name', async () => {
    const text = 'Some text before %s some text after'.format(formatLink('/status/overview', 'My Overview'))
    await wrapper.setProps({ text })
    expect(wrapper.vm.parts).toHaveLength(3)
    expect(wrapper.vm.parts[0]).toEqual('Some text before ')
    expect(wrapper.vm.parts[1].props).toEqual(expect.objectContaining({ customName: 'My Overview', icon: null, path: '/status/overview' }))
    expect(wrapper.vm.parts[2]).toEqual(' some text after')
  })

  it('Renders internal link withouth custom name', async () => {
    const text = 'Some text before %s some text after'.format(formatLink('/status/overview'))
    await wrapper.setProps({ text })
    expect(wrapper.vm.parts).toHaveLength(3)
    expect(wrapper.vm.parts[0]).toEqual('Some text before ')
    expect(wrapper.vm.parts[1].props).toEqual(expect.objectContaining({ icon: null, path: '/status/overview' }))
    expect(wrapper.vm.parts[2]).toEqual(' some text after')
  })
})
