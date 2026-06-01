import type { App } from 'vue'
import axios, { isAxiosError } from 'axios'
import type { AxiosError, InternalAxiosRequestConfig, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { session } from './session'
import { checkNetwork, findObject, toChunks } from '@ui-core/plugins/helper'
import { useMessages } from '@/stores/messages'
import { i18n } from '@ui-core/plugins/i18n'
import { useMainStore } from '@/stores/main'
import router from '@/router'
import { isObject, isString, isArray } from '@ui-core/utils/inspect'

declare module 'axios' {
  interface AxiosRequestConfig {
    _request_id?: string
    preventCancel?: boolean
    cancellable?: boolean
    condition?: boolean | string
    awaitNetwork?: boolean
  }
  interface GenericAbortSignal {
    reason?: AbortReason
  }
}

interface CustomAxiosInstance extends AxiosInstance {
  request<T = any, R = ApiResponse<T>, D = any>(config: AxiosRequestConfig<D>): Promise<R>
  get<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
  delete<T = any, R = ApiResponse<T>, D = any>(url: string, config?: AxiosRequestConfig<D>): Promise<R>
  post<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>
  put<T = any, R = ApiResponse<T>, D = any>(url: string, data?: D, config?: AxiosRequestConfig<D>): Promise<R>
  bulk: (data: any, options?: AxiosRequestConfig) => Promise<Array<ApiResponse | ApiErrorResponse>>
  bulkGet: (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => Promise<Array<ApiResponse | ApiErrorResponse>>
  bulkPost: (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => Promise<Array<ApiResponse | ApiErrorResponse>>
  bulkPut: (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => Promise<Array<ApiResponse | ApiErrorResponse>>
  bulkDelete: (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => Promise<Array<ApiResponse | ApiErrorResponse>>
  isAxiosError: typeof isAxiosError
  cancelRequests: typeof cancelRequests
  loadPackages: () => Promise<ApiResponse<string[]>>
  logout: () => void
}

export interface ApiResponse<T = any> {
  success: true
  data: T
  metadata?: {
    total?: number
  }
}

export interface ApiErrorResponse {
  success: false
  errors: ApiError[]
}

export interface ApiError {
  /** Type/category of error */
  source: string
  /** Error message describing what's wrong */
  error: string
  /** Response error code. More info on possible codes can be found in standard_codes.lua file. */
  code: number
}

export interface ApiBulkRequest {
  /** Flag indicating if network connection should be checked after request has been sent */
  awaitNetwork?: boolean
  /** Condition if request needs to be skiped and faked */
  condition?: Function | boolean | string | string[]
  endpoint: string
  data?: any | any[]
}

type ApiBulkResponse = ApiResponse<ApiResponse[] | ApiErrorResponse[]>

// if server responds with any of these codes, failed request should be sent again to back-end
// possible returnable codes - https://github.com/axios/axios/blob/3a7c363e540e388481346e0c0a3c80e8318dbf5d/lib/core/AxiosError.js#L58
const RETRY_CODES = ['ERR_NETWORK']
const fakeResponses: Record<string, number[]> = {}
const fakeData = { success: true, data: [] } as const
const methods = ['GET', 'POST', 'PUT', 'DELETE'] as const
type Method = (typeof methods)[number]

const axiosPlugin = axios.create({
  // A custom query params encoder is used to encode spaces as `%20` instead of `+`.
  paramsSerializer: {
    encode: encodeURIComponent
  }
}) as CustomAxiosInstance
const axiosRawPlugin = axios.create()

axiosPlugin.isAxiosError = isAxiosError

export type AbortReason = 'navigation' | 'request'

export let controller = new AbortController()
export function cancelRequests(reason: AbortReason) {
  controller.abort(reason)
  // assingning new abort controller, because the old one would always abort future requests
  controller = new AbortController()
}
axiosPlugin.cancelRequests = cancelRequests

async function parseRequests(requests: Array<ApiBulkRequest | string>, method: Method, condition?: boolean, id?: string) {
  const store = useMainStore()
  const parsedRequests: ReturnType<typeof formatRequest>[] = []
  if (id) fakeResponses[id] = []
  if (condition && store.loadPackages) {
    await axiosPlugin.loadPackages()
  }
  requests.forEach((req, index) => {
    if (!isObject(req)) return parsedRequests.push(formatRequest(req, method))
    if (req.condition === undefined || resolveCondition(req.condition)) return parsedRequests.push(formatRequest(req.endpoint, method))
    if (id) fakeResponses[id].push(index)
  })
  return parsedRequests
}

function formatRequest(endpoint: string, method: Method) {
  return {
    endpoint,
    method
  }
}

axiosPlugin.loadPackages = async () => {
  const store = useMainStore()
  const response = await axiosPlugin.get<string[]>('/api/system/device/packages/status', { preventCancel: true })
  store.setPackages(response.data)
  return response
}

async function requestInterceptor(config: InternalAxiosRequestConfig) {
  const store = useMainStore()
  if (config.preventCancel !== true) config.signal = controller.signal
  if (config.cancellable) store.spinner.cancelButton = true
  config.headers['X-CSRF-PROTECTION'] = 1
  if (!config.condition) return config
  if (store.loadPackages) await axiosPlugin.loadPackages()
  if (resolveCondition(config.condition)) return config
  config.adapter = config => {
    return new Promise(resolve => {
      return resolve({
        data: fakeData,
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config,
        request: {}
      })
    })
  }
  return config
}

async function responseInterceptor(response: AxiosResponse) {
  const id = response.config?._request_id
  if (id) {
    if (fakeResponses[id]?.length > 0) fakeResponses[id].forEach(index => response.data.data?.splice(index, 0, fakeData))
    delete fakeResponses?.[id]
  }
  if (response.config.awaitNetwork) await checkNetwork()
  return response.data
}

async function errorInterceptor(error: AxiosError<ApiError | ApiError[]>) {
  const message = useMessages()
  if (error.code && RETRY_CODES.includes(error.code)) {
    try {
      const res = await retryRequest(error.config!)
      return responseInterceptor(res)
    } catch (e) {
      message.error(i18n.t('Could not reach device'))
      throw error
    }
  }
  if (error.response?.status === 401 || (isArray(error.response?.data) && error.response?.data.some(err => err.code === 123))) {
    axiosPlugin.logout()
    throw error
  }
  if (error.response?.status === 403) {
    const err = error.response.data
    if ('errors' in err && Array.isArray(err.errors)) setPasswordRenew(err.errors[0].code)
  }
  if ('code' in error) setPasswordRenew(Number(error.code))
  if (error.code === 'ERR_CANCELED') {
    // Return promise that will never settle, so that further .then() or .catch() will not execute.
    if (error.config?.signal?.reason === 'navigation') return new Promise(() => {})
    // we're hiding the trace, so the users' console won't show stack trace of canceled requests.
    if (error.config?.signal?.reason === 'request') return new Promise(() => message.error(i18n.t('Data request cancelled')))
    const wrap = new Error(error.code)
    wrap.stack = ''
    throw wrap
  }
  if (error.code !== 'ECONNABORTED') throw error
  const store = useMainStore()
  const vuciImg = document.createElement('img')
  vuciImg.addEventListener('load', () => {
    window.clearInterval(interval)
    store.spin(false)
    message.error(i18n.t('Request timeout'))
    throw error
  })
  const interval = setInterval(() => {
    vuciImg.src = `http://${window.location.host}/favicon.ico?r=${Math.random()}`
  }, 1000)
}

// handles errors when password needs to be renewed (first login or password expired)

function setPasswordRenew(code: number) {
  const store = useMainStore()
  if (code === 124) store.passwordPolicy.current_days_left = '0'
  if (code === 125) store.firstLogin = true
}

function dataTransform(inputData: unknown) {
  try {
    return isString(inputData) ? JSON.parse(inputData) : inputData
  } catch {
    return null
  }
}

/**
 * @throws throws error if after repeating request multiple times no valid data could be returned
 */
function retryRequest<T = any>(config: AxiosRequestConfig<T>, options?: { delay?: number; retry?: number; retryCondition: (response: ApiResponse<T>) => boolean }) {
  const _delay = options?.delay || 3000
  const _retryTimes = options?.retry || 5
  config.data = dataTransform(config?.data || null)
  return new Promise<AxiosResponse<T>>((resolve, reject) => {
    async function repeat(times: number) {
      try {
        resolve(await axiosRawPlugin(config))
      } catch (e: any) {
        const shouldRetry = options?.retryCondition(e) ?? true
        if (times >= _retryTimes || !shouldRetry) return reject(e)
        setTimeout(() => repeat(times + 1), _delay)
      }
    }
    setTimeout(() => repeat(0), _delay)
  })
}

axiosPlugin.logout = function () {
  const message = useMessages()
  if (router.currentRoute.value.path === '/login') return
  const errorMessage = message.error(i18n.t('Session expired'))
  setTimeout(() => {
    if (router.currentRoute.value.path === '/login') return message.remove(errorMessage)
    session.loginError = i18n.t('Your session has expired, please log in again.')
    // resets spinner if error occurs on logout
    session.logout({ spinnerReset: true })
  }, 1000)
}

axiosPlugin.interceptors.request.use(requestInterceptor)
axiosRawPlugin.interceptors.request.use(requestInterceptor)
axiosPlugin.interceptors.response.use(responseInterceptor, errorInterceptor)

const sendBulk = (data: any[], options?: AxiosRequestConfig) => axiosPlugin.post<ApiResponse[]>('/api/bulk', { data }, { ...options })
const handleBulkResponse = (responses: ApiBulkResponse) => {
  if (!responses) {
    import.meta.env.DEV && console.trace()
    return []
  }
  const error = analyzeBulk(responses.data)
  if (error) {
    throw errorInterceptor(error)
  }
  return responses.data
}

axiosPlugin.bulk = async (requests: ApiBulkRequest[] | string[], options?: AxiosRequestConfig) => {
  const chunkCount = Math.ceil(requests.length / 100)
  if (chunkCount > 1) {
    const chunks = toChunks(requests, { chunkCount })
    const _requests = chunks.map(chunk => sendBulk(chunk, options))

    const responses = await Promise.all(_requests)
    const validResponses = responses.filter(res => res && 'data' in res)

    return handleBulkResponse({
      success: true as const,
      data: validResponses.flatMap(res => res.data)
    })
  }
  const response = await sendBulk(requests, options)
  return handleBulkResponse(response)
}
axiosPlugin.bulkGet = async (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => {
  const id = (Math.random() * 0xffff).toFixed()

  const parsedRequests = await parseRequests(
    requests,
    'GET',
    requests.some(req => isObject(req) && req.condition),
    id
  )

  if (!parsedRequests.length) return requests.map(() => fakeData)

  return axiosPlugin.bulk(parsedRequests, { _request_id: id, ...options })
}
axiosPlugin.bulkPost = async (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => {
  const parsedRequests = await parseRequests(requests, 'POST')
  if (!parsedRequests.length) return requests.map(() => fakeData)

  return axiosPlugin.bulk(parsedRequests, options)
}
axiosPlugin.bulkPut = async (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => {
  const parsedRequests = await parseRequests(requests, 'PUT')
  if (!parsedRequests.length) return requests.map(() => fakeData)

  return axiosPlugin.bulk(parsedRequests, options)
}
axiosPlugin.bulkDelete = async (requests: Array<ApiBulkRequest | string>, options?: AxiosRequestConfig) => {
  const parsedRequests = await parseRequests(requests, 'DELETE')
  if (!parsedRequests.length) return requests.map(() => fakeData)

  return axiosPlugin.bulk(parsedRequests, options)
}

/**
 * Resolves given condition and returns true if condition is met, false otherwise
 * @param condition - Condition to check for
 * @returns True if condition resolves to true, false otherwise
 */
function resolveCondition(condition: Function | boolean | string | string[]) {
  const store = useMainStore()
  const error = () => {
    throw Error(`[resolveCondition]: unsupported condition type given: ${typeof condition}. Supported types: Function, boolean, string, string[]}`)
  }
  switch (typeof condition) {
    case 'boolean':
      return condition
    case 'function':
      return condition()
    case 'string':
      return store.hasPackages(condition)
    case 'object':
      return Array.isArray(condition) ? store.hasPackages(condition) : error()
    default:
      return error()
  }
}

/**
 * Analyzes bulk request, if it returned error code 123, returns false, meaning request processing should be terminated.
 * @param data - Bulk request response data
 * @returns Returns true when all bulk requests were authorized
 */
function analyzeBulk(data: ApiResponse[] | ApiErrorResponse[]) {
  let error = null
  error = findObject(data, null, {
    customPredicate: (item: any) => [100, 120, 123, 124, 125].includes(item?.code)
  })
  return error
}

export { axiosPlugin as axios, axiosRawPlugin as axiosRaw, parseRequests, formatRequest, fakeResponses, analyzeBulk, retryRequest }

export default {
  install(app: App) {
    app.config.globalProperties.$axios = axiosPlugin
  }
}
