import { axios, type ApiResponse, type ApiBulkRequest, type ApiErrorResponse } from '@ui-core/plugins/axios'
import type { ObjectUpdate, ObjectCreate, SavedObject } from '@/types/generalTypes'

type Request = ApiBulkRequest & { method: 'POST' | 'GET' | 'DELETE' | 'PUT' }
type ErrorlessResponse = ApiResponse & { data: any }

export default {
  /** checks if API returned errors */
  checkNoErrors(responses: Array<ApiResponse | ApiErrorResponse>): responses is ErrorlessResponse[] {
    return responses.every(e => e.success)
  },

  /**
   * Returns diff between API version and live version. Used to feed PUT request
   * @returns  returns diff or undefined if there is no new things
   */
  _getObjDiff<T>(apiObj: SavedObject<T>, liveObj: SavedObject<T> | ObjectUpdate<T>): SavedObject<T> | undefined {
    /** @type {any} */
    const res = JSON.parse(JSON.stringify(liveObj))
    Object.entries(apiObj).forEach(([key, value]) => {
      if (key === 'id') return
      // kinda mehh but should always include changed data but might include when not needed
      if (typeof res[key] === 'string' ? res[key] === value : JSON.stringify(res[key]) === JSON.stringify(value)) delete res[key]
    })
    if (Object.keys(res).length === 0) return undefined
    return res
  },

  /** Controls shared sections by merging, seperating or creating them */
  sharedConfigHelper<T>(settings: {
    /** general object endpoint */
    endpoint: string
    /** object index that was used before */
    oldObj?: SavedObject<T>
    /** do not delete or touch old object as is used by others. */
    oldImportant?: boolean
    /** object that can be used now */
    newObj?: SavedObject<T>
    /** main data to be used when changing or creating new obj */
    data: ObjectUpdate<T> | ObjectCreate<T>
    /** additional data used only for creation */
    createData?: ObjectCreate<T>
  }): Request[] {
    const res: Request[] = []
    const { oldObj, newObj, oldImportant, data, createData } = settings
    if (newObj) {
      const diff = this._getObjDiff(newObj, data)
      if (diff) res.push({ method: 'PUT', endpoint: `${settings.endpoint}/${newObj.id}`, data: diff })

      if (oldObj === newObj || !oldObj || oldImportant) return res
      res.push({ method: 'DELETE', endpoint: `${settings.endpoint}/${oldObj.id}` })
    } else if (oldObj && !oldImportant) {
      const diff = this._getObjDiff(oldObj, data)
      if (diff) res.push({ method: 'PUT', endpoint: `${settings.endpoint}/${oldObj.id}`, data: diff })
    } else {
      res.push({ method: 'POST', endpoint: `${settings.endpoint}`, data: { ...data, ...(createData ?? {}) } })
    }
    return res
  },
  /**
   * Returns object array after API response updates
   * @param arr - array to update
   */
  updateLocalArray<T>(arr: SavedObject<T>[], requests: Request[], responses: ErrorlessResponse[]) {
    requests.forEach((request, index) => {
      const responseData = Array.isArray(responses[index].data) ? responses[index].data : [responses[index].data]
      if (request.method === 'DELETE')
        /** @type {string[] | {id: string}[]} */ responseData.forEach(deletedElement => {
          const deletedId = typeof deletedElement === 'string' ? deletedElement : deletedElement.id
          const index = arr.findIndex(e => e.id === deletedId)
          arr.splice(index, 1)
        })
      else if (request.method === 'POST') arr.push(...responseData)
      else if (request.method === 'PUT')
        /** @type {SavedObject<T>[]} */ responseData.forEach(newElement => {
          const index = arr.findIndex(e => e.id === newElement.id)
          arr[index] = newElement
        })
    })
  },
  /** Does bulk request and updates config depending on response */
  async makeRequests<T>(configs: SavedObject<T>[], requests: Request[]) {
    if (requests.length === 0) return
    const responses = await axios.bulk(requests)
    if (!this.checkNoErrors(responses)) throw Error()
    this.updateLocalArray(configs, requests, responses)
  },
  /** Does bulk request and updates config depending on response */
  async makeRequestsNoUpdate(requests: Request[]): Promise<ErrorlessResponse[]> {
    if (requests.length === 0) return []
    const responses = await axios.bulk(requests)
    if (!this.checkNoErrors(responses)) throw Error()
    return responses
  },
  getNextId(configs: SavedObject<unknown>[], prefix: string): string {
    let id = `${prefix}0`
    let index = 0
    while (configs.some(c => c.id === id)) {
      index++
      id = `${prefix}${index}`
    }
    return id
  }
}
