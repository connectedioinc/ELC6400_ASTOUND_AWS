import formHelper from '@ui-core/utils/form-helper'
import '@ui-core/utils/string-format'

describe('form-helper.js', () => {
  it.each`
    sections                                                           | decrementedSections | refPoint | condition
    ${[{ id: 'cfg01c21d' }, { id: 'cfg03c21d' }, { id: 'cfg04c21d' }]}
    ${[{ id: 'cfg01c21d' }, { id: 'cfg02c21d' }, { id: 'cfg03c21d' }]}
    ${'cfg02c21d'}                                                     | ${'Single digit'}
    ${[{ id: 'cfg11c21d' }, { id: 'cfg13c21d' }, { id: 'cfg14c21d' }]}
    ${[{ id: 'cfg11c21d' }, { id: 'cfg12c21d' }, { id: 'cfg13c21d' }]}
    ${'cfg12c21d'}                                                     | ${'Multiple digit'}
  `('Method decrementSections. Decrements all uci section names by one if they are higher than the refPoint. $condition', async ({ sections, decrementedSections, refPoint }) => {
    formHelper.decrementSections(sections, refPoint)
    expect(sections).toEqual(decrementedSections)
  })

  it('Method createSID. Creates new section identifier.', () => {
    const sections = []
    for (let i = 0; i < 1000; i++) {
      const hexId = i.toString(16).padStart(6, '0')
      sections.push({ id: `new${hexId}` })
    }
    const result = formHelper.createSID(sections)
    expect(sections.map(s => s.id)).not.toContain(result)
  })

  describe('Method mergeSections', () => {
    it('Add section to dataKey if not found', () => {
      const dataObject = {
        test: [{ id: 'cfgtest1', host: '1.1.1.1', time: '5', _md5: '111111' }]
      }
      const responseObject = {
        test: [{ id: 'cfgtest2', host: '2.2.2.2', time: '5', _md5: '111111' }]
      }
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual({
        test: [
          { id: 'cfgtest1', host: '1.1.1.1', time: '5', _md5: '111111' },
          { id: 'cfgtest2', host: '2.2.2.2', time: '5', _md5: '111111' }
        ]
      })
    })

    it("Don't merge dataKey if no same dataKey returned", () => {
      const dataObject = {
        test: [{ id: 'cfgtest1', host: '1.1.1.1', time: '5', _md5: '111111' }],
        test2: [{ id: 'cfgtest2', host: '1.1.1.1', time: '5', _md5: '111111' }]
      }
      const responseObject = {
        test: [{ id: 'cfgtest1', host: '2.2.2.2', time: '5', _md5: '111111' }]
      }
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual({
        test: [{ id: 'cfgtest1', host: '2.2.2.2', time: '5', _md5: '111111' }],
        test2: [{ id: 'cfgtest2', host: '1.1.1.1', time: '5', _md5: '111111' }]
      })
    })

    it('merge deep nested sections', () => {
      const dataObject = {
        test: [{ id: 'cfgtest1', host: '1.1.1.1', time: '5', _md5: '111111' }],
        test2: [
          {
            id: 'cfgtest2',
            host: '1.1.1.1',
            time: '5',
            _md5: '111111',
            _children: [{ id: 'cfgtest3', host: '1.1.1.1', time: '5', _md5: '111111', _children: [{ id: 'cfgtest4', host: '1.1.1.1', time: '5', _md5: '111111' }] }]
          }
        ]
      }
      const responseObject = {
        test2: [{ id: 'cfgtest4', host: '2.2.2.2', time: '5', _md5: '111111' }]
      }
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual({
        test: [{ id: 'cfgtest1', host: '1.1.1.1', time: '5', _md5: '111111' }],
        test2: [
          {
            id: 'cfgtest2',
            host: '1.1.1.1',
            time: '5',
            _md5: '111111',
            _children: [{ id: 'cfgtest3', host: '1.1.1.1', time: '5', _md5: '111111', _children: [{ id: 'cfgtest4', host: '2.2.2.2', time: '5', _md5: '111111' }] }]
          }
        ]
      })
    })

    it('merges when dataObject is empty', () => {
      const dataObject = {}
      const responseObject = {
        test: [{ id: 'cfgtest1', host: '1.1.1.1' }]
      }
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual(responseObject)
    })

    it('merges when responseObject is empty', () => {
      const dataObject = {
        test: [{ id: 'cfgtest1', host: '1.1.1.1' }]
      }
      const responseObject = {}
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual(dataObject)
    })

    it('merges with undefined values in responseObject', () => {
      const dataObject = {
        test: [{ id: 'cfgtest1', host: '1.1.1.1', time: '5' }]
      }
      const responseObject = {
        test: [{ id: 'cfgtest1', host: undefined, time: undefined }]
      }
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual({
        test: [{ id: 'cfgtest1', host: undefined, time: undefined }]
      })
    })

    it('does not mutate original objects', () => {
      const dataObject = {
        test: [{ id: 'cfgtest1', host: '1.1.1.1' }]
      }
      const responseObject = {
        test: [{ id: 'cfgtest1', host: '2.2.2.2' }]
      }
      const dataCopy = JSON.parse(JSON.stringify(dataObject))
      const responseCopy = JSON.parse(JSON.stringify(responseObject))
      formHelper.mergeSections(dataObject, responseObject)
      expect(dataObject).toEqual(dataCopy)
      expect(responseObject).toEqual(responseCopy)
    })

    it('merges arrays with multiple objects', () => {
      const dataObject = {
        test: [
          { id: 'cfgtest1', host: '1.1.1.1' },
          { id: 'cfgtest2', host: '2.2.2.2' }
        ]
      }
      const responseObject = {
        test: [
          { id: 'cfgtest1', host: '3.3.3.3' },
          { id: 'cfgtest3', host: '4.4.4.4' }
        ]
      }
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual({
        test: [
          { id: 'cfgtest1', host: '3.3.3.3' },
          { id: 'cfgtest2', host: '2.2.2.2' },
          { id: 'cfgtest3', host: '4.4.4.4' }
        ]
      })
    })

    it('merges without identifier', () => {
      const dataObject = {
        test: [{ host: '1.1.1.1', time: '5' }]
      }
      const responseObject = {
        test: [{ host: '2.2.2.2', time: '5' }]
      }
      expect(formHelper.mergeSections(dataObject, responseObject)).toEqual({
        test: [{ host: '2.2.2.2', time: '5' }]
      })
    })
  })
})
