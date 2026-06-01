import { isArray, isPlainObject } from './inspect'

const formHelper = {}

// in case more merge option defaults will be needed in future
const mergeDefaults = {
  identifier: 'id'
}

/**
 * Merges two sections into one another. if sections object does not contain a key from newSections - a new key will be added
 * @param {Record<string, any[]>} sections - data sections to merge to
 * @param {Record<string, any[]>} newSections - data sections that will be merged to sections param
 * @param {{identifier?: string}} options - optional options that will change behavior when merging
 * @returns {Record<string, any[]>} - new object with two objects merged into each other
 */
formHelper.mergeSections = function (sections, newSections, options) {
  const { identifier } = Object.assign({}, mergeDefaults, options)
  const localSections = { ...sections }

  for (let [dataKey, localSection] of Object.entries(localSections)) {
    if (!newSections[dataKey]) continue
    localSection = [...localSection]

    for (const newSection of newSections[dataKey]) {
      const children = formHelper.deepFind(localSection, value => {
        if (!isArray(value)) return false

        if (isPlainObject(newSection)) return newSection[identifier] && value.some(v => v[identifier] && v[identifier] === newSection[identifier])
        if (isArray(newSection)) return value.some(v => v[identifier] && newSection.some(s => s[identifier] && v[identifier] === s[identifier]))
      })

      if (!children) {
        if (localSection.every(section => section[identifier])) {
          localSection.push(newSection)
        } else localSection[0] = newSection
        continue
      }

      const index = children.findIndex(s => {
        if (isArray(newSection)) return s[identifier] && newSection.some(n => n[identifier] && s[identifier] === n[identifier])
        return s[identifier] === newSection[identifier]
      })

      if (!isArray(newSection)) {
        for (const [key, value] of Object.entries(children[index])) {
          if (key in newSection) continue
          newSection[key] = value
        }
      }
      children[index] = newSection
    }
    localSections[dataKey] = localSection
  }

  Object.keys(newSections).forEach(dataKey => {
    if (!localSections[dataKey]) {
      localSections[dataKey] = newSections[dataKey]
    }
  })
  return localSections
}

formHelper.deepFind = (obj, predicate) => {
  if (predicate(obj)) return obj
  for (const value of Object.values(obj)) {
    if (typeof value !== 'object') continue
    const found = formHelper.deepFind(value, predicate)
    if (found) return found
  }
}

formHelper.deepFilter = (arr, predicate) => {
  const filtered = []
  for (const obj of arr) {
    if (predicate(obj)) filtered.push(obj)
    for (const [key, value] of Object.entries(obj)) {
      if (!isArray(value)) continue
      const found = formHelper.deepFilter(value, predicate)
      if (found) {
        obj[key] = found
      }
    }
  }
  return filtered
}

// Decrements all uci section names by one if they are higher than the refPoint
formHelper.decrementSections = function (sections, refPoint, identifier = 'id') {
  // Since some section id's are counted as actual config names,
  // section id check is required to ensure that incorrect name won't get decremented
  if (sections.some(section => !section[identifier].match(/^cfg[a-f0-9]{6}$/))) return
  sections.forEach(section => {
    if (compareNames(section[identifier], refPoint)) {
      section[identifier] = decrementSectionName(section[identifier])
    }
  })
}
formHelper.createSID = function (sections, identifier = 'id') {
  let sid
  do {
    sid = 'new' + parseInt((Math.random() * 0xffffff).toFixed(0)).toString(16)
  } while (sections.some(section => section[identifier] === sid))
  return sid
}

function hexToInt(string) {
  return parseInt(string, 16)
}

// compares custom .name uci values. Returns false if first is lower, returns true if second is lower
function compareNames(first, second) {
  const extractedIndices = [first.substring(3, 5), second.substring(3, 5)]
  return hexToInt(extractedIndices[0]) > hexToInt(extractedIndices[1])
}

// Decrements section name i.e: cfg0fac9b -> cfg0eac9b
function decrementSectionName(sectionName) {
  let index = hexToInt(sectionName.substring(3, 5))
  index--
  index = index.toString(16)
  if (index.length < 2) {
    index = `0${index}`
  }
  return sectionName.replaceAt(3, index)
}

export default formHelper
