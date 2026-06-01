import { makeProp, makeProps } from '@ui-core/utils/props.js'

describe('Prop creation helpers', () => {
  describe('makeProp', () => {
    const stubFn = () => 'test'
    it('creates expected prop object from given arguments', () => {
      const { type, required, defaultValue, validator } = { type: Object, required: false, defaultValue: {}, validator: undefined }
      const result = makeProp(type, defaultValue, required, validator)
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('default')
      expect(result).not.toHaveProperty('required')
      expect(result).not.toHaveProperty('validator')
    })
    it('creates expected prop object from given arguments', () => {
      const { type, required, defaultValue, validator } = { type: Object, required: vi.fn(), defaultValue: {}, validator: vi.fn() }
      const result = makeProp(type, defaultValue, required, validator)
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('default')
      expect(result).toHaveProperty('validator')
      expect(result).not.toHaveProperty('required')
    })
    it('creates expected prop object from given arguments', () => {
      const { type, required, defaultValue, validator } = { type: Object, required: true, defaultValue: {}, validator: vi.fn() }
      const result = makeProp(type, defaultValue, required, validator)
      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('default')
      expect(result).toHaveProperty('validator')
      expect(result).toHaveProperty('required')
    })
    it.each([
      { type: Object, required: true, defaultValue: {}, validator: vi.fn(), expected: { type: Object, required: true, default: expect.any(Function), validator: expect.any(Function) } },
      { type: Array, required: true, defaultValue: [], validator: undefined, expected: { type: Array, required: true, default: expect.any(Function) } },
      { type: Number, required: false, defaultValue: 5, validator: undefined, expected: { type: Number, default: 5 } },
      { type: String, required: false, defaultValue: 'test', validator: undefined, expected: { type: String, default: 'test' } }
    ])('case %#: creates expected prop object from given arguments', arg => {
      const { type, required, defaultValue, validator, expected } = arg
      const result = makeProp(type, defaultValue, required, validator)
      expect(result).toEqual(expected)
    })
    it.each([
      { defaultValue: {}, type: Object, expectedDefault: {} },
      { defaultValue: [], type: Array, expectedDefault: [] },
      { defaultValue: [{ with: 'item' }], type: Array, expectedDefault: [{ with: 'item' }] },
      { defaultValue: stubFn, type: Function, expectedDefault: stubFn() }
    ])('default value will be wrapped in function call', ({ defaultValue, type, expectedDefault }) => {
      const result = makeProp(type, defaultValue)
      expect(result.default()).toEqual(expectedDefault)
    })
  })
  describe('makeProps', () => {
    it('creates a lot of props at once from given object', () => {
      const result = makeProps({
        section: [[Object, Array], []]
      })
      expect(result).toEqual({
        section: {
          type: [Object, Array],
          default: expect.any(Function)
        }
      })
      expect(result.section.default()).toEqual([])
    })
  })
})
