import Users from '../../src/views/system/Users.vue'
import createWrapper from '@tests/unit/mockFactory'
import { vi } from 'vitest'

describe('Users.vue', () => {
  it.each`
    username     | expectedVal
    ${undefined} | ${true}
    ${''}        | ${true}
    ${'userX'}   | ${true}
    ${'user1'}   | ${false}
  `('returns $expectedVal when username is "$username"', ({ username, expectedVal }) => {
    const wrapper = createWrapper(Users)
    const usersData = [{ username: 'user1' }, { username: 'user2' }, { username: 'user3' }]
    wrapper.setData({
      formData: {
        users: usersData
      }
    })
    const result = wrapper.vm.isNotDuplicateUsername(username)
    expect(result.isValid).toBe(expectedVal)
  })
  it('calls success message after adding user', () => {
    const wrapper = createWrapper(Users)
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.afterAdd({ username: 'test' })
    expect(spy).toHaveBeenCalledWith("User 'test' created")
  })
  it.each`
    id          | expectedVal
    ${'groupX'} | ${true}
    ${'group1'} | ${false}
  `('returns $expectedVal when group name is "$id"', ({ id, expectedVal }) => {
    const wrapper = createWrapper(Users)
    const groupData = [{ id: 'group1' }, { id: 'group2' }, { id: 'group3' }]
    wrapper.setData({
      formData: {
        groups: groupData
      }
    })
    const result = wrapper.vm.isNotDuplicateGroupName(id)
    expect(result.isValid).toBe(expectedVal)
  })
  it.each`
    id         | expectedCanDelete
    ${'user'}  | ${false}
    ${'admin'} | ${false}
    ${'root'}  | ${false}
    ${'other'} | ${true}
  `('canDeleteGroup returns $expectedCanDelete for group "$id"', ({ id, expectedCanDelete }) => {
    const wrapper = createWrapper(Users)
    expect(wrapper.vm.canDeleteGroup(id)).toBe(expectedCanDelete)
  })
})
