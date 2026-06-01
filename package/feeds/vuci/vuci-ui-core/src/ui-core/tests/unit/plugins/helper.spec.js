import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import * as helper from '@ui-core/plugins/helper'
import { useMessages } from '@/stores/messages'
import helperPlugin from '@ui-core/plugins/helper'
import { session } from '@ui-core/plugins/session'
import { axios } from '@ui-core/plugins/axios'
import i18n from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'
import '@ui-core/utils/string-format'

vi.mock('@ui-core/plugins/axios', () => ({
  axios: {
    post: vi.fn(),
    cancelRequests: vi.fn()
  }
}))

const findObjectTestInputs = [
  [
    {
      success: false,
      errors: [
        {
          source: 'Authorization',
          error: 'Unauthorized user',
          code: 121
        }
      ]
    },
    {
      success: false,
      errors: [
        {
          source: 'Authorization',
          error: 'Unauthorized user',
          code: 122
        }
      ]
    },
    {
      success: false,
      errors: [
        {
          source: 'Authorization',
          error: 'Unauthorized user',
          code: 123
        }
      ]
    }
  ],
  [
    {
      object1: 'aa'
    },
    {
      object1: {
        status: 500,
        message: 'success'
      }
    }
  ]
]
describe('helper.js', () => {
  process.env.VUE_APP_PROXY = 'http://192.168.1.1'
  const methods = Object.keys(helper)
  const store = {
    spinning: 0,
    device: 'TRB1',
    board: {
      network: {
        lan: {
          default_ip: '192.168.1.1'
        },
        mgmt: {
          default_ip: '192.168.1.2'
        }
      }
    }
  }
  let app
  beforeEach(() => {
    app = {
      config: {
        globalProperties: {
          $spin: {},
          $reconnect: {}
        }
      }
    }
    setActivePinia(createTestingPinia({ initialState: { main: store } }))
    i18n.install(app)
    helperPlugin.install(app)
  })
  it.each`
    entry           | result
    ${'$reconnect'} | ${'reconnect'}
  `('export $entry to Vue default during install', ({ entry, result }) => {
    expect(app.config.globalProperties[entry]).toEqual(helper[result])
  })

  it.each`
    method
    ${'reconnect'}
    ${'checkNetwork'}
    ${'checkDuplicates'}
    ${'capitalize'}
  `('plugin contain and export $method method', ({ method }) => {
    expect(methods.includes(method)).toEqual(true)
  })

  it('method checkNetwork. Check if method turn on spinner', () => {
    const store = useMainStore()
    store.spinning = 0
    helper.checkNetwork()
    expect(store.spin).toHaveBeenCalledWith()
  })
  describe('method ping', () => {
    beforeEach(vi.useFakeTimers)
    afterEach(vi.useRealTimers)
    it('throws error when it does not receive successful ping back in time', async () => {
      const timeout = 3000
      const address = 'http://1.1.1.1'
      const wrapper = async () => {
        const res = helper.ping(address, { timeout })
        vi.advanceTimersByTime(5000)
        return await res
      }
      await expect(wrapper()).rejects.toThrowError('Timeout')
    })
    it('resolves to true when ping is received', async () => {
      const mockImgElement = {
        addEventListener: vi.fn((eventname, callback) => {
          setTimeout(callback, 100)
        })
      }
      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockImgElement)
      const wrapper = async () => {
        const res = helper.ping('213')
        vi.advanceTimersByTime(5000)
        return await res
      }
      await expect(wrapper()).resolves.toEqual(true)
    })
  })
  it('method reconnect. Start spinner', async () => {
    vi.useFakeTimers()
    const store = useMainStore()
    store.spinning = 0
    helper.reconnect('Rebooting', { protocol: 'http:' })
    expect(store.spin).toHaveBeenCalledWith({ tip: 'Rebooting', fullOpacity: true })
    vi.useRealTimers()
  })

  it.each([
    {
      expected: findObjectTestInputs[0][2].errors[0],
      input: findObjectTestInputs[0],
      predicate: item => item.code === 123
    },
    {
      expected: findObjectTestInputs[1][1].object1,
      input: findObjectTestInputs[1],
      predicate: item => item.status === 500
    }
  ])('findbject finds deeply nested object', ({ expected, input, predicate }) => {
    expect(helper.findObject(input, null, { customPredicate: predicate })).toEqual(expected)
  })

  it.each`
    model                            | result              | condition
    ${{ name: 'test1', port: '20' }} | ${['name', 'port']} | ${'Find duplicates in new section model.'}
    ${{ name: 'test2', port: '30' }} | ${[]}               | ${'Pass new section model with duplicates check.'}
  `('method checkDuplicates. $condition', ({ model, result }) => {
    const restrictedValues = ['name', 'port']
    const data = [{ name: 'test1', port: '20' }]
    const res = helper.checkDuplicates(restrictedValues, data, model)
    expect(res).toEqual(result)
  })

  it('method capitalize. Check if method return string with first uppercase letter', () => {
    expect(helper.capitalize('test')).toEqual('Test')
  })

  it.each([
    {
      cb: () => {
        throw new Error('error')
      },
      res: [null, new Error('error')]
    },
    { cb: () => 'data', res: ['data', null] }
  ])('catchFn', ({ cb, res }) => {
    const result = helper.catchFn(cb)
    expect(result).toEqual(res)
  })
  it.each([
    { sessionItemValue: 'fail', result: 'fail' },
    { sessionItemValue: '{ "name": "string"}', result: { name: 'string' } },
    { sessionItemValue: null, result: null }
  ])('fromStorage', ({ sessionItemValue, result }) => {
    sessionStorage.setItem('test', sessionItemValue)
    const res = helper.fromStorage('test')
    expect(res).toEqual(result)
  })

  it('invokes copyToClipboard method and checks copied text', () => {
    const clipboard = vi.fn()
    navigator.clipboard = {
      writeText: clipboard
    }
    helper.copyToClipboard('test')
    expect(clipboard).toHaveBeenCalledTimes(1)
    expect(clipboard).toHaveBeenCalledWith('test')
  })
  it.each([
    { chunkCount: 10, chunkLengths: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10] },
    { chunkCount: 6, chunkLengths: [17, 17, 17, 17, 17, 15] },
    { chunkCount: 5, chunkLengths: [20, 20, 20, 20, 20] },
    { chunkCount: 4, chunkLengths: [25, 25, 25, 25] },
    { chunkCount: 3, chunkLengths: [34, 34, 32] }
  ])('chunks array into $chunkCount chunks', ({ chunkCount, chunkLengths }) => {
    const array = Array.from({ length: 100 }, (_, i) => i + 1)
    const result = helper.toChunks(array, { chunkCount })
    expect(result.length).toEqual(chunkCount)
    result.forEach((r, i) => {
      expect(r.length).toEqual(chunkLengths[i])
    })
  })
  it.each([
    { chunkSize: 10, chunkCount: 10 },
    { chunkSize: 15, chunkCount: 7 },
    { chunkSize: 6, chunkCount: 17 },
    { chunkSize: 2, chunkCount: 50 }
  ])('chunks array into chunks of $chunkSize size', ({ chunkSize, chunkCount }) => {
    const array = Array.from({ length: 100 }, (_, i) => i + 1)
    const result = helper.toChunks(array, { chunkSize })
    expect(result.length).toEqual(chunkCount)
  })

  it('shows error on reboot when it throws error', async () => {
    const message = useMessages()
    axios.post = vi.fn().mockRejectedValueOnce()
    const spyError = vi.spyOn(message, 'error')
    const spyReconnect = vi.spyOn(helper, 'reconnect')
    await helper.reboot()
    expect(spyError).toHaveBeenCalled()
    expect(spyReconnect).not.toHaveBeenCalled()
  })
  it("doesn't show error reboot and tries to reconnect when it doesn't throw error", async () => {
    vi.useFakeTimers()
    const message = useMessages()
    const logoutSpy = vi.spyOn(session, 'logout').mockResolvedValueOnce(true)
    axios.post = vi.fn().mockResolvedValueOnce()
    const spyError = vi.spyOn(message, 'error')
    vi.spyOn(document, 'createElement').mockReturnValueOnce({
      addEventListener: vi.fn().mockImplementation((_ev, cb) => {
        setTimeout(cb, 100)
      })
    })
    await helper.reboot()
    await vi.advanceTimersByTimeAsync(1000000)
    expect(spyError).not.toHaveBeenCalled()
    expect(logoutSpy).toHaveBeenCalled()
    vi.useRealTimers()
  })
  it.each`
    data                                          | ascending | expectedResult
    ${[{ a: 'abc' }, { a: 'aaa' }, { a: 'z' }]}   | ${true}   | ${[{ a: 'aaa' }, { a: 'abc' }, { a: 'z' }]}
    ${[{ a: 'z' }, { a: 'abc' }, { a: 'aaa' }]}   | ${false}  | ${[{ a: 'z' }, { a: 'abc' }, { a: 'aaa' }]}
    ${[{ a: 'z' }, { a: '' }, { a: 'a' }]}        | ${true}   | ${[{ a: 'a' }, { a: 'z' }, { a: '' }]}
    ${[{ a: 'z' }, { a: '' }, { a: 'a' }]}        | ${false}  | ${[{ a: '' }, { a: 'z' }, { a: 'a' }]}
    ${[{ a: '12340' }, { a: '2' }, { a: '900' }]} | ${true}   | ${[{ a: '2' }, { a: '900' }, { a: '12340' }]}
    ${[{ a: '12340' }, { a: '2' }, { a: '900' }]} | ${false}  | ${[{ a: '12340' }, { a: '900' }, { a: '2' }]}
  `('sorts collection #%#', ({ data, ascending, expectedResult }) => {
    expect(helper.sortCollection(data, 'a', ascending)).toEqual(expectedResult)
  })
})
