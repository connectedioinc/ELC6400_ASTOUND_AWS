import HttpsDnsProxy from '../../src/views/network/HttpsDnsProxy.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('HttpsDnsProxy.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(HttpsDnsProxy)
  })
  it.each`
    config                                                                                               | expextedPreset
    ${{ bootstrap_dns: ['8.8.8.8'], resolver_url: 'https://dns.google/dns-query', listen_port: '5053' }} | ${''}
    ${{ bootstrap_dns: ['8.8.8.8', '8.8.4.4'], resolver_url: 'https://cloudflare-dns.com/dns-query' }}   | ${''}
    ${{ bootstrap_dns: ['8.8.8.8', '8.8.4.4'], resolver_url: 'https://dns.google/dns-query' }}           | ${'google'}
  `('finds presets that is same as config #%#', ({ config, expextedPreset }) => {
    expect(wrapper.vm.findPreset(config)).toEqual(expextedPreset)
  })
  it('applies preset to config', () => {
    const startingConfig = {
      bootstrap_dns: '',
      resolver_url: '',
      listen_port: '5053'
    }
    const changedConfig = {
      bootstrap_dns: ['8.8.8.8', '8.8.4.4'],
      resolver_url: 'https://dns.google/dns-query',
      listen_port: '5053'
    }
    wrapper.vm.applyPreset(startingConfig, wrapper.vm.presets.google)
    expect(startingConfig).toEqual(changedConfig)
  })
  it('apples preset it preset was change to non empty one', () => {
    const startingConfig = {
      bootstrap_dns: '',
      resolver_url: '',
      listen_port: '5053'
    }
    const changedConfig = {
      bootstrap_dns: ['8.8.8.8', '8.8.4.4'],
      resolver_url: 'https://dns.google/dns-query',
      listen_port: '5053'
    }
    wrapper.vm.onPresetChange('google', startingConfig)
    expect(startingConfig).toEqual(changedConfig)
  })
  it('does not apply preset when empty string is sent', () => {
    const startingConfig = {
      bootstrap_dns: '',
      resolver_url: '',
      listen_port: '5053'
    }
    const changedConfig = {
      bootstrap_dns: '',
      resolver_url: '',
      listen_port: '5053'
    }
    wrapper.vm.onPresetChange('', startingConfig)
    expect(startingConfig).toEqual(changedConfig)
  })
  it('returns default port', () => {
    const proxy = { bootstrap_dns: '', resolver_url: '' }
    wrapper.vm.formData.proxies = [{}, {}, proxy]
    expect(wrapper.vm.getDefaultPort(proxy)).toEqual('5055')
  })
  it.each`
    url                                       | expectedResult
    ${'https://cloudflare-dns.com/dns-query'} | ${0}
    ${'http://cloudflare-dns.com'}            | ${0}
    ${'https://cloudflare-dns.com'}           | ${1}
  `('returns warnings #%#', ({ url, expectedResult }) => {
    expect(wrapper.vm.getResolverWarining(url)).lengthOf(expectedResult)
  })
})
