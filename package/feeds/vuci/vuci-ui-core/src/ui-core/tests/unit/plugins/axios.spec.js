import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import { useMessages } from '@/stores/messages'
import axiosPlugin, { axios, parseRequests, formatRequest, fakeResponses, analyzeBulk } from '@ui-core/plugins/axios'
import * as helper from '@ui-core/plugins/helper'
import { session } from '@ui-core/plugins/session'
import { useMainStore } from '@/stores/main'

describe('axios.js', () => {
  vi.mock('@ui-core/plugins/helper')
  let app
  vi.useFakeTimers()
  beforeEach(async () => {
    app = { config: { globalProperties: { $axios: {} } } }
    setActivePinia(
      createTestingPinia({
        initialState: {
          main: {
            packages: [],
            hasPackages: () => true,
            loadPackages: true
          }
        }
      })
    )
    axiosPlugin.install(app)
  })
  it('export default install. Assign exported plugin functions to $axios', () => {
    expect(app.config.globalProperties.$axios).toEqual(axios)
  })

  it.each`
    method
    ${'loadPackages'}
    ${'bulk'}
    ${'bulkGet'}
    ${'bulkPost'}
    ${'bulkPut'}
    ${'bulkDelete'}
  `('plugin contain and export $method method', async ({ method }) => {
    const methods = Object.keys(axios)
    expect(methods.includes(method)).toEqual(true)
  })

  it('method loadPackages. Load installed packages and save to store', async () => {
    const store = useMainStore()
    const packagesResponse = {
      success: true,
      data: ['/usr/lib/opkg/info/test.control', '/usr/lib/opkg/info/test2.control']
    }
    axios.get = vi.fn()
    axios.get.mockResolvedValueOnce(packagesResponse)
    await axios.loadPackages()
    expect(store.setPackages).toHaveBeenCalledWith(packagesResponse.data)
  })

  it.each`
    requests                                                                                                                                                                         | flag
    ${[{ endpoint: '/api/network/test1', method: 'GET' }, { endpoint: '/api/network/test2', method: 'GET' }, { endpoint: '/api/network/test3', method: 'GET' }]}                     | ${false}
    ${[{ endpoint: '/api/network/test1', method: 'GET' }, { endpoint: '/api/network/test2', method: 'GET', awaitNetwork: true }, { endpoint: '/api/network/test3', method: 'GET' }]} | ${true}
  `('method bulk. Invoke method and resolve data with awaitNetwork: $flag', async ({ requests }) => {
    const bulkResponse = {
      success: true,
      data: [
        { success: true, data: [] },
        { success: true, data: [] },
        { success: true, data: [] }
      ]
    }
    axios.post = vi.fn()
    axios.post.mockResolvedValueOnce(bulkResponse)
    const response = await axios.bulk(requests)
    expect(response).toEqual(bulkResponse.data)
  })

  it.each`
    method
    ${'bulkGet'}
    ${'bulkPost'}
    ${'bulkPut'}
    ${'bulkDelete'}
  `('method $method. Invoke method and resolve data', async ({ method }) => {
    const bulkResponse = {
      success: true,
      data: [
        { success: true, data: [] },
        { success: true, data: [] },
        { success: true, data: [] }
      ]
    }
    const requests = ['/api/network/test1', '/api/network/test2', '/api/network/test3']
    axios.bulk = vi.fn()
    axios.bulk.mockResolvedValueOnce(bulkResponse)
    const response = await axios[method](requests)
    expect(response).toEqual(bulkResponse)
  })

  it('method responseInterceptor. Return request response data', async () => {
    const response = {
      config: {
        url: '/api/network/test1',
        method: 'get',
        _request_id: '100'
      },
      data: {
        success: true,
        data: { test: 'test1' }
      }
    }
    const res = await axios.interceptors.response.handlers[0].fulfilled(response)
    expect(res).toEqual(response.data)
  })

  it('method responseInterceptor. With awaitNetwork flag check', async () => {
    vi.spyOn(helper, 'checkNetwork').mockImplementation(() => true)
    const response = {
      config: {
        url: '/api/network/test1',
        method: 'get',
        _request_id: '100',
        awaitNetwork: true
      },
      data: {
        success: true,
        data: { test: 'test1' }
      }
    }
    const res = await axios.interceptors.response.handlers[0].fulfilled(response)
    expect(res).toEqual(response.data)
  })

  it('method responseInterceptor. With fakeResponses', async () => {
    fakeResponses['12201'] = []
    fakeResponses['12201'].push(1)
    const response = {
      config: {
        _request_id: '12201'
      },
      data: {
        success: true,
        data: [{ success: true, data: ['Testas'] }]
      }
    }
    const res = await axios.interceptors.response.handlers[0].fulfilled(response)
    expect(res).toEqual({
      success: true,
      data: [
        { success: true, data: ['Testas'] },
        { success: true, data: [] }
      ]
    })
  })

  describe('method errorInterceptor', () => {
    it('handles error code FAIL', async () => {
      const response = {
        code: 'FAIL'
      }
      await axios.interceptors.response.handlers[0].rejected(response).catch(err => {
        expect(err).toEqual(response)
      })
    })
    it('logs out when at least one response errors with code 123', async () => {
      axios.logout = vi.fn().mockReturnValueOnce()
      const error = {
        response: { data: [{ code: 123 }] }
      }
      await axios.interceptors.response.handlers[0].rejected(error).catch(err => {
        expect(axios.logout).toHaveBeenCalled()
        expect(err).toEqual(error)
      })
    })
  })
  it('invokes session termination in logout method', () => {
    const message = useMessages()
    session.logout = vi.fn().mockResolvedValueOnce(true)
    const spy = vi.spyOn(message, 'error')
    axios.logout()
    setTimeout(() => {
      expect(spy).toHaveBeenCalled()
      expect(session.logout).toHaveBeenCalled()
    }, 2000)
  })

  it("analyze bulk request's response and looks for error code 123", () => {
    const arg = { data: 123 }
    vi.spyOn(helper, 'findObject').mockImplementation(() => null)
    analyzeBulk(arg)
    expect(helper.findObject).toHaveBeenCalledWith(arg, null, { customPredicate: expect.any(Function) })
  })

  it('method errorInterceptor. With code ECONNABORTED and image load', async () => {
    const vuciImg = document.createElement('img')
    const response = {
      code: 'ECONNABORTED'
    }
    vi.spyOn(document, 'createElement').mockReturnValue(vuciImg)
    axios.interceptors.response.handlers[0].rejected(response)
    vi.advanceTimersByTime(1000)
    expect(vuciImg.src).not.toBeNull()
  })
  it('method requestInterceptor. Check if method sets X-CSRF-PROTECTION header', async () => {
    const config = {
      condition: false,
      headers: { common: { Authorization: '' } }
    }
    const res = await axios.interceptors.request.handlers[0].fulfilled(config)
    expect(res.headers['X-CSRF-PROTECTION']).toEqual(1)
  })

  it('method requestInterceptor. Check if method format fake request data if condition fail', async () => {
    const store = useMainStore()
    store.packages = ['/usr/lib/opkg/info/test.control', '/usr/lib/opkg/info/test2.control']
    const config = {
      condition: 'test3',
      headers: { common: { Authorization: '' } }
    }
    const res = await axios.interceptors.request.handlers[0].fulfilled(config)
    expect(await res.adapter()).toEqual({
      data: { success: true, data: [] },
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      config: undefined,
      request: {}
    })
  })

  it('method requestInterceptor. Check if method return unchanged config if condition is true', async () => {
    const store = useMainStore()
    store.packages = ['/usr/lib/opkg/info/test.control', '/usr/lib/opkg/info/test2.control']
    const config = {
      condition: 'test2.control',
      headers: { common: { Authorization: '' } },
      adapter: () => {}
    }
    const res = await axios.interceptors.request.handlers[0].fulfilled(config)
    expect(res).toEqual(config)
  })

  it('method requestInterceptor. Load packages if there are none', async () => {
    const store = useMainStore()
    axios.loadPackages = vi.fn().mockReturnValue(true)
    store.packages = []
    const config = {
      condition: 'test3',
      headers: { common: { Authorization: '' } }
    }
    const spy = vi.spyOn(axios, 'loadPackages')
    await axios.interceptors.request.handlers[0].fulfilled(config)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('method parseRequests. Parse given requests for bulk request', async () => {
    const store = useMainStore()
    store.packages = ['/usr/lib/opkg/info/test.control', '/usr/lib/opkg/info/test2.control']
    store.hasPackages = pkg => store.packages.some(p => p.includes(pkg))
    axios.loadPackages = vi.fn().mockReturnValue(true)
    const requests = [{ endpoint: '/api/network/test1', condition: 'test3.control' }, { endpoint: '/api/network/test2', condition: 'test2.control' }, '/api/network/test3']
    const parsedRequests = await parseRequests(requests, 'GET', true, 100)
    expect(parsedRequests).toEqual([
      { endpoint: '/api/network/test2', method: 'GET' },
      { endpoint: '/api/network/test3', method: 'GET' }
    ])
  })

  it('method parseRequests. Load packages if there are none', async () => {
    axios.loadPackages = vi.fn().mockResolvedValueOnce(true)
    const requests = [{ endpoint: '/api/network/test1', condition: 'test3.control' }]
    const spy = vi.spyOn(axios, 'loadPackages')
    await parseRequests(requests, 'GET', true, 100)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('method formatRequest. Return formated endpoint and method object ', () => {
    expect(formatRequest('/api/network/test', 'GET')).toEqual({ endpoint: '/api/network/test', method: 'GET' })
  })
})
