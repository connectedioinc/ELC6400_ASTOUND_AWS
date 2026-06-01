import { axios } from '@ui-core/plugins/axios'
import { isArray } from './inspect'

export type Requests<T> = {
  baseUrl: string
  get: () => Promise<T[]>
  create: (payload: T) => Promise<T>
  remove: (id: string | number | (number | string)[]) => Promise<boolean>
  update: {
    (payload: T): Promise<T>
    (payload: T[]): Promise<T[]>
  }
}

export function requestFactory<T = any>(baseUrl: string) {
  return {
    baseUrl: baseUrl,
    get: getFactory<T[]>(baseUrl),
    show: (id: string) => axios.get(`${baseUrl}/${id}`).then(result => result.data as T),
    create: postFactory<T>(baseUrl),
    remove: removeFactory(baseUrl),
    update: updateFactory<T>(baseUrl)
  }
}

export function getFactory<T>(url: string) {
  return async () => {
    return axios.get(url).then(result => {
      return result.data as T
    })
  }
}

export function postFactory<T>(url: string) {
  return async (payload: T) => {
    return axios.post(url, { data: payload }).then(response => {
      return response.data as T
    })
  }
}

export function updateFactory<T>(url: string) {
  async function update(payload: T): Promise<T>
  async function update(payload: T[]): Promise<T[]>
  async function update(payload: T | T[]): Promise<T | T[]> {
    const isMulti = isArray(payload)
    const data = isMulti ? payload : /** data must be array, otherwise API fails */ [payload]
    const response = await axios.put<T[]>(url, { data })
    if (isMulti) return response.data
    return response.data[0]
  }
  return update
}

export function removeFactory(url: string) {
  return async (id: string | number | (number | string)[]) => {
    const ids = [id].flat()
    return axios.delete(url, { data: { data: ids } }).then(() => true)
  }
}
