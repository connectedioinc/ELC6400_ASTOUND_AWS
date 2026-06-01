import SambaUsers from '../../src/views/services/SambaUsers.vue'
import SambaUsersEdit from '../../src/views/services/SambaUsersEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('SambaUsers.vue', () => {
  it.each([
    ['1', { data: { errors: [{ code: 1 }] } }, 'Failed to create new system user.'],
    ['2', { data: { errors: [{ code: 2 }] } }, 'Failed to set new user password.'],
    ['none', { data: { errors: [{ code: 5 }] } }, 'Unexpected error']
  ])('returns error message when error code is %s', (status, data, response) => {
    const wrapper = createWrapper(SambaUsers)
    const val = wrapper.vm.returnErrorMessage(data)
    expect(val).toEqual(response)
  })

  it.each([
    ['username exist', { username: 'test' }, { message: 'User with username test already exists', valid: false }],
    ['username doest exist', { username: 'tears' }, { valid: true }]
  ])('returns validation results when %s', (status, data, response) => {
    const wrapper = createWrapper(SambaUsers)
    wrapper.vm.formData = { users: [{ username: 'test' }] }
    const val = wrapper.vm.addSection(data)
    expect(val).toEqual(response)
  })

  it.each([
    ['passwords matches', { password: 'test', passwordConfirm: 'test' }, { isValid: true }],
    ['passwords doesnt match', { password: 'test', passwordConfirm: 'test2' }, { message: 'Given password confirmation did not match', isValid: false }]
  ])('returns validation results when %s', (status, data, response) => {
    const props = {
      section: {
        password: data.password,
        passwordConfirm: data.passwordConfirm
      }
    }
    const wrapper = createWrapper(SambaUsersEdit, { props })
    const val = wrapper.vm.isPasswordConfirmationCorrect()
    expect(val).toEqual(response)
  })
  it.each`
    username     | expectedVal
    ${undefined} | ${true}
    ${''}        | ${true}
    ${'userX'}   | ${true}
    ${'user1'}   | ${false}
  `('returns $expectedVal when username:"$username"', ({ username, expectedVal }) => {
    const wrapper = createWrapper(SambaUsers)
    const usersData = [
      {
        username: 'user1'
      },
      {
        username: 'user2'
      },
      {
        username: 'user3'
      }
    ]
    wrapper.setData({
      formData: {
        users: usersData
      }
    })
    const result = wrapper.vm.isNotDublicate(username)
    expect(result.isValid).toBe(expectedVal)
  })
  it.each`
    username      | expectedVal
    ${':Aaa'}     | ${false}
    ${'8Aaa'}     | ${false}
    ${' dsads'}   | ${false}
    ${'_abc1234'} | ${true}
    ${'aaaa8888'} | ${true}
  `('returns $expectedVal when username:"$username"', ({ username, expectedVal }) => {
    const wrapper = createWrapper(SambaUsers)
    const result = wrapper.vm.sambaCredentialsValidate(username)
    expect(result.isValid).toBe(expectedVal)
  })
})
