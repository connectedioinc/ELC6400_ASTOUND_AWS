export function arrayAt(this: Array<any>, index: number) {
  index = Math.trunc(index) || 0
  if (index < 0) index += this.length
  return this[index]
}
if (!Array.prototype.at) {
  Array.prototype.at = arrayAt
}

export function structuredClone<T = any>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(item => structuredClone(item)) as T
  const clonedObj = { ...obj }
  for (const key in clonedObj) {
    clonedObj[key] = structuredClone(clonedObj[key])
  }
  return clonedObj
}
if (!window.structuredClone) {
  window.structuredClone = structuredClone
}
