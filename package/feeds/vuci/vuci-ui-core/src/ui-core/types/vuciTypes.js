/**
 * @typedef {{type: FormActions, payload: any[]}} ErrorObject
 */
/**
 * @typedef {'create'|'edit'|'delete'|'get'} FormActions
 */
/**
 * @typedef {Object} VuciXHRMethods
 * @property {{() => { endpoints: string[]; dataKey: string }[]}} get - returns section endpoint data, if form actions does not include get, null is returned
 * @property {{() => Promise<SavedSectionItem>}} edit - saveData method in VuciSections, but exposed as edit to VuciForm
 * @property {{() => { promises: Promise<import('axios').AxiosResponse>[], createdSectionsNames: {sectionName: string, index: number}[]}}} create - create section wrapper
 * @property {{(sid: string) => void}} delete - section deletion methods
 */
/**
 * Exposable VuciSection data that can be seen from VuciFormAPI component
 * @typedef {Object} VuciSection
 * @property {string} dataKey - string representing uciData[dataKey] with which VuciSection works
 * @property {string} sectionId - main section identifier. defaults to id
 * @property {((type:FormActions, error: ErrorObject) => string)} handleError
 * @property {(response: import('axios').AxiosResponse[], formBulk: boolean) => Promise<MergeObject>} getSavedData
 * @property {VuciXHRMethods} callMethod
 * @property {() => Promise<boolean>} validate invokes all input validations in vuciSection
 * @property {() => void} updateAfterSave
 * @property {() => void} load - invokes all input loads
 * @property {boolean} visible
 * @property {boolean} saveable flag indicating whether the section information should be sent to back-end when saving data
 */
/**
 * UCI Section data object
 * @typedef {{id: string, '.type': string, [key: string]: any}} UCISection
 */

/**
 * @typedef {Object} SavedSectionItem
 * @property {{[key: string]: any[]}} data
 */

/**
 * Mergeable objects structure which can merged to uciData
 * @typedef {Object} MergeObject
 * @property {boolean} overwrite - indicates whether merge data should have priority over real object data while merging
 * @property { { [key:string]: UCISection[] } } data - UCI section data
 */

/**
 * @typedef {Object} XHRUploadResponse
 * @property {boolean} success flag indicates if the request was successful
 * @property {string} name - name of the file
 * @property {{data: { path: string }}} result - XHR request response object
 * @property {string} [handler] - error handler returned string. OPTIONAL
 */

/**
 * @typedef MenuItem
 * @prop {MenuItem[]} children
 * @prop {string[]} acls
 * @prop {number} index
 * @prop {string} title
 * @prop {string} path
 * @prop {string} [redirect]
 * @prop {string} [view]
 * @prop {boolean} read_access
 * @prop {boolean} write_access
 * @prop {import('vue-router').RouteMeta} meta
 */

export const fTypes = {}
