import fs from 'fs'
import { rules } from '../../src/validation-rules'
import '@ui-core/utils/string-format'

vi.mock('@ui-core/plugins/i18n', () => {
  return {
    __esModule: true,
    i18n: {
      t: text => text
    }
  }
})
const filePath = 'tests/validation_cases.json'

/** @type {{ [key:string]: { cases: {name: string, test_value: any, result: boolean, args?: any[] }[] }  }} */
const validatorCases = JSON.parse(fs.readFileSync(filePath)).validators

Object.keys(validatorCases).forEach(key => {
  // max_bytes is missing textEncoder
  if (!rules[key]) return
  describe('It tests validation rule:' + key, () => {
    const testCases = validatorCases[key]
    testCases.cases.forEach(testCase => {
      test(testCase.name, () => {
        const extraArgs = testCase.args ? testCase.args : []
        const result = rules[key].call(null, testCase.test_value, ...extraArgs)
        expect(!!result.isValid).toBe(testCase.result)
      })
    })
  })
})
