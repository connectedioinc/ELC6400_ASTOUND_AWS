import { describe, it, expect, beforeEach } from 'vitest'
import { createCollection } from '../collection'
import { reactive } from 'vue'
import { getFileContents } from '../file'

const getCollection = () => {
  const collection = createCollection<{ name: string }>()
  return collection
}

describe('collection.ts', () => {
  let c: ReturnType<typeof getCollection>
  beforeEach(() => {
    c = getCollection()
    c.setData([{ name: 'John' }, { name: 'Jane' }])
    // trigger getters before testing to see if they really work
    c.visible.value
    c.changed.value
    c.added.value
    c.removed.value
  })
  it('should be able to create a collection with predicted return type', () => {
    const c = getCollection()
    expect(reactive(c)).toEqual(
      expect.objectContaining({
        updatedAt: 0,
        removed: [],
        added: [],
        changed: [],
        visible: []
      })
    )
  })
  it('should be able to setData', () => {
    const c = getCollection()
    expect(c.visible.value).toHaveLength(0)
    c.setData([{ name: 'John' }, { name: 'Jane' }])
    expect(c.visible.value).toHaveLength(2)
    expect(c.added.value).toHaveLength(0)
  })
  describe('create', () => {
    it('should be able to hard add data', () => {
      const entry = c.create({ name: 'create' })
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: entry.id, data: { name: 'create' }, state: 'pristine' }))
      expect(c.added.value).toHaveLength(0)
    })
  })
  describe('softCreate', () => {
    it('should be able to softly add data', () => {
      const entry = c.softCreate({ name: 'create' })
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: entry.id, data: { name: 'create' }, state: 'new' }))
      expect(c.added.value).toContainEqual(expect.objectContaining({ id: entry.id, data: { name: 'create' }, state: 'new' }))
    })
  })
  describe('softUpdate', () => {
    it('should be able to softly update data', () => {
      const [item] = c.visible.value
      expect(c.visible.value).toHaveLength(2)
      expect(c.changed.value).toHaveLength(0)

      expect(c.softUpdate(item.id, { name: 'Johnny' })).toBeTruthy()

      expect(c.visible.value).toHaveLength(2)
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: item.id, data: { name: 'Johnny' } }))
      expect(c.changed.value).toEqual([expect.objectContaining({ id: item.id, state: 'changed', data: { name: 'Johnny' } })])
    })
    it('should return false when updating non-existing item', () => {
      expect(c.softUpdate(123546, { name: 'Johnny' })).toBeFalsy()
    })
    it('should not allow updating softly removed items', () => {
      const [item] = c.visible.value
      c.softRemove(item.id)
      expect(c.softUpdate(item.id, { name: 'Johnny' })).toBeFalsy()
      const matcher = expect.objectContaining({ id: item.id, data: { name: 'Johnny' }, state: 'changed' })
      expect(c.changed.value).not.toContainEqual(matcher)
      expect(c.removed.value).toContainEqual(expect.objectContaining({ id: item.id, state: 'removed', data: { name: 'John' } }))
    })
    it('should not change state of softly created items', () => {
      const newItem = c.softCreate({ name: 'test' })
      expect(c.softUpdate(newItem.id, { name: 'Johnny' })).toBeTruthy()
      const matcher = expect.objectContaining({ id: newItem.id, data: { name: 'Johnny' } })
      expect(c.changed.value).not.toContainEqual(matcher)
      expect(c.added.value).toContainEqual(matcher)
    })
  })
  describe('update', () => {
    it('should be able to update pristine entry', () => {
      const [item] = c.visible.value
      expect(item.state).toBe('pristine')
      expect(c.update(item.id, { name: 'Johnny' })).toBeTruthy()
      expect(item.state).toBe('pristine')
      const matcher = expect.objectContaining({ id: item.id, data: { name: 'Johnny' } })
      expect(c.changed.value).not.toContainEqual(matcher)
      expect(c.visible.value).toContainEqual(matcher)
    })
    it('should be able to update updated entry', () => {
      const [item] = c.visible.value
      expect(item.state).toBe('pristine')
      expect(c.update(item.id, { name: 'Johnny' })).toBeTruthy()
      expect(c.update(item.id, { name: 'Johnny-boy' })).toBeTruthy()
      expect(item.state).toBe('pristine')
      const matcher = expect.objectContaining({ id: item.id, data: { name: 'Johnny-boy' } })
      expect(c.changed.value).not.toContainEqual(matcher)
      expect(c.visible.value).toContainEqual(matcher)
    })
    it('should not be able to update new entry (softCreate)', () => {
      const newEntry = c.softCreate({ name: 'Johnny' })
      expect(newEntry.state).toBe('new')
      expect(c.update(newEntry.id, { name: 'Johnny-boy' })).toBeFalsy()
      expect(newEntry.state).toBe('new')
      expect(c.changed.value).not.toContainEqual(expect.objectContaining({ id: newEntry.id }))
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: newEntry.id, data: { name: 'Johnny' } }))
    })
    it('should not be able to update removed entry (softRemove)', () => {
      const [item] = c.visible.value
      c.softRemove(item.id)
      expect(c.update(item.id, { name: 'Johnny-boy' })).toBeFalsy()
      expect(c.changed.value).not.toContainEqual(expect.objectContaining({ id: item.id }))
      expect(c.removed.value).toContainEqual(expect.objectContaining({ id: item.id }))
    })
    it('should not be able to update non-existing entry', () => {
      expect(c.visible.value).toHaveLength(2)
      expect(c.update(45495, { name: 'Johnny-boy' })).toBeFalsy()
      expect(c.visible.value).toHaveLength(2)
      const firstId = c.visible.value[0].id
      c.remove(firstId)
      expect(c.update(firstId, { name: 'Johnny-boy' })).toBeFalsy()
    })
  })
  describe('remove', () => {
    it('should be able to remove pristine items', () => {
      const [first, second] = c.visible.value
      expect(c.remove(first.id)).toBeTruthy()
      expect(c.remove(second.id)).toBeTruthy()
      // second remove should return false, since entries are already removed
      expect(c.remove(first.id)).toBeFalsy()
      expect(c.remove(second.id)).toBeFalsy()
      expect(c.visible.value).toHaveLength(0)
      expect(c.removed.value).toHaveLength(0)
    })
    it('should be able to remove softly updated items', () => {
      const [first, second] = c.visible.value
      const firstData = { name: 'John Doe' }
      const secondData = { name: 'Jane Doe' }
      expect(c.softUpdate(first.id, firstData)).toBeTruthy()
      expect(c.softUpdate(second.id, secondData)).toBeTruthy()
      expect(c.remove(first.id)).toBeTruthy()
      expect(c.remove(second.id)).toBeTruthy()
      expect(c.visible.value).toHaveLength(0)
      expect(c.removed.value).toHaveLength(0)
    })
    it('should be able to remove sofly created items', () => {
      const entry = c.softCreate({ name: 'soft-create' })
      expect(c.visible.value).toContainEqual(entry)
      expect(c.remove(entry.id)).toBeTruthy()
      expect(c.visible.value).not.toContainEqual(entry)
      expect(c.removed.value).toHaveLength(0)
    })
  })
  describe('softRemove', () => {
    it('should be able to soft remove pristine items', () => {
      const [first, second] = c.visible.value
      expect(c.removed.value).toHaveLength(0)
      expect(c.visible.value).toHaveLength(2)
      expect(c.softRemove(first.id)).toBeTruthy()
      // second softRemove should be falsy, since item is already removed
      expect(c.softRemove(first.id)).toBeFalsy()
      expect(c.visible.value).toEqual([expect.objectContaining({ id: second.id, state: 'pristine' })])
      expect(c.removed.value).toEqual([expect.objectContaining({ id: first.id, state: 'removed' })])
    })
    it('should be able to soft remove softly updated items', () => {
      const [first, second] = c.visible.value
      expect(c.removed.value).toHaveLength(0)
      expect(c.visible.value).toHaveLength(2)
      c.softUpdate(first.id, { name: 'updated' })
      expect(c.softRemove(first.id)).toBeTruthy()
      expect(c.visible.value).toEqual([expect.objectContaining({ id: second.id, state: 'pristine' })])
      expect(c.removed.value).toEqual([expect.objectContaining({ id: first.id, state: 'removed', data: { name: 'updated' } })])
    })
    it('should completely remove softly created items', () => {
      const newSoft = c.softCreate({ name: 'soft' })
      expect(c.visible.value).toHaveLength(3)
      expect(c.softRemove(newSoft.id)).toBeTruthy()
      expect(c.visible.value).toHaveLength(2)
      expect(c.removed.value).toHaveLength(0)
      expect(c.removed.value).not.toContainEqual(expect.objectContaining({ id: newSoft.id, state: 'removed', data: { name: 'soft' } }))
    })
  })
  describe('restore', () => {
    it('should not restore hardly done operations (create, remove, update)', () => {
      const [first, second] = c.visible.value
      const created = c.create({ name: 'Johnny' })
      c.update(first.id, { name: 'Johnny' })
      c.remove(second.id)
      expect(c.visible.value).toHaveLength(2)
      ;[c.restore(created.id), c.restore(first.id), c.restore(second.id)].forEach(result => expect(result).toBeFalsy())

      expect(c.visible.value).toEqual([first, created])
      expect(c.visible.value).not.toContainEqual(second)
    })
    it('should restore softly done operations (softRemove, softUpdate), softCreate should not restore', () => {
      const [first, second] = c.visible.value
      const updated = c.softUpdate(first.id, { name: 'Johnny' })
      const removed = c.softRemove(second.id)

      expect(updated).toBeTruthy()
      expect(removed).toBeTruthy()

      expect(c.removed.value).toEqual([expect.objectContaining({ id: second.id, data: { name: 'Jane' }, state: 'removed' })])
      expect(c.changed.value).toHaveLength(1)
      // TODO fails
      // expect(c.visible.value).toEqual([expect.objectContaining({ id: first.id, data: { name: 'Johnny' }, state: 'changed' })])

      expect(c.restore(first.id)).toBeTruthy()
      expect(c.restore(second.id)).toBeTruthy()

      expect(c.visible.value).toEqual([
        expect.objectContaining({ id: first.id, data: { name: 'John' }, state: 'pristine' }),
        expect.objectContaining({ id: second.id, data: { name: 'Jane' }, state: 'pristine' })
      ])
      const created = c.softCreate({ name: 'test' })
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: created.id, data: { name: 'test' }, state: 'new' }))
      expect(c.restore(created.id)).toBeFalsy()
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: created.id, data: { name: 'test' }, state: 'new' }))
    })
    it('should not restore pristine items', () => {
      const [first] = c.visible.value
      const item = c.create({ name: 'pristine-new-item' })
      expect(c.restore(item.id)).toBeFalsy()
      expect(c.restore(first.id)).toBeFalsy()
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: item.id, data: { name: 'pristine-new-item' }, state: 'pristine' }))
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: first.id, state: 'pristine' }))
    })
    it('should not restore softly created items (softCreate)', () => {
      const created = c.softCreate({ name: 'test' })
      expect(c.visible.value).toHaveLength(3)
      expect(c.restore(created.id)).toBeFalsy()
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: created.id, data: { name: 'test' }, state: 'new' }))
      expect(c.visible.value).toHaveLength(3)
    })
    it('should restore softly removed items (softRemove)', () => {
      const [first] = c.visible.value
      expect(c.visible.value).toHaveLength(2)
      c.softRemove(first.id)
      expect(c.visible.value).toHaveLength(1)
      expect(c.restore(first.id)).toBeTruthy()
      expect(c.visible.value).toHaveLength(2)
    })
    it('should restore softly updated items (softUpdate)', () => {
      const [first] = c.visible.value
      const initial = { ...first.data }
      expect(c.visible.value).toHaveLength(2)
      c.softUpdate(first.id, { name: 'updated' })
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: first.id, data: { name: 'updated' }, state: 'changed' }))
      expect(c.restore(first.id)).toBeTruthy()
      expect(c.visible.value).toContainEqual(expect.objectContaining({ id: first.id, data: initial, state: 'pristine' }))
    })
  })
  describe('save', () => {
    it('should be able to save data', () => {
      const [first, second] = c.visible.value
      c.softRemove(first.id)
      c.softUpdate(second.id, { name: 'soft-updated' })
      const created = c.softCreate({ name: 'soft-created' })
      expect(c.removed.value).toContainMatching({ id: first.id })
      expect(c.added.value).toContainMatching({ id: created.id })
      expect(c.changed.value).toContainMatching({ id: second.id })
      expect(c.visible.value).toHaveLength(2)
      c.save()
      expect(c.removed.value).toHaveLength(0)
      expect(c.added.value).toHaveLength(0)
      expect(c.changed.value).toHaveLength(0)
      expect(c.visible.value).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: second.id, data: { name: 'soft-updated' }, state: 'pristine', original: { name: 'soft-updated' } }),
          expect.objectContaining({ id: created.id, data: { name: 'soft-created' }, state: 'pristine', original: { name: 'soft-created' } })
        ])
      )
    })
  })
  it('should be able to soft update and not lose file instaces', async () => {
    const collection = createCollection<{ file: File; name: string }>()
    const entry = {
      file: new File(['this is text!!'], 'test.txt', { type: 'text/plain' }),
      name: 'test'
    }
    collection.setData([entry])
    const [item] = collection.visible.value
    expect(item.data.file).toBeInstanceOf(File)
    expect(item.original).toBe(entry)
    collection.update(item.id, { ...item.data, file: new File(['updated'], 'updated.txt', { type: 'text/plain' }) })
    expect(item.data.file).toBeInstanceOf(File)
    expect(await getFileContents(item.data.file)).toBe('updated')
  })
})
