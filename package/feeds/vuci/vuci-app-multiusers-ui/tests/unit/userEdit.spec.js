import UserEdit from '../../src/views/system/UserEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
describe('Users.vue', () => {
  it.each`
    username   | groups                                  | expectedIsAdmin | expectedGroupOptions
    ${'admin'} | ${[{ id: 'group1' }]}                   | ${true}         | ${['group1', 'root']}
    ${'user1'} | ${[{ id: 'group1' }]}                   | ${false}        | ${['group1']}
    ${'admin'} | ${[{ id: 'group1' }, { id: 'group2' }]} | ${true}         | ${['group1', 'group2', 'root']}
    ${'user2'} | ${[{ id: 'group1' }, { id: 'group2' }]} | ${false}        | ${['group1', 'group2']}
  `('correctly handles admin status and group options for username "$username"', ({ username, groups, expectedIsAdmin, expectedGroupOptions }) => {
    const wrapper = createWrapper(UserEdit, {
      props: {
        section: { username }
      },
      data() {
        return {
          formModel: {
            users: [{ username }],
            groups: groups
          }
        }
      }
    })
    expect(wrapper.vm.isAdmin).toBe(expectedIsAdmin)
    expect(wrapper.vm.groupOptions).toEqual(expectedGroupOptions)
  })
  it.each`
    groups                                  | isAdmin  | expectedOptions
    ${[{ id: 'group1' }, { id: 'group2' }]} | ${false} | ${['group1', 'group2']}
    ${[{ id: 'group1' }, { id: 'group2' }]} | ${true}  | ${['group1', 'group2', 'root']}
    ${[]}                                   | ${false} | ${[]}
    ${[]}                                   | ${true}  | ${['root']}
    ${[{ id: 'admin' }, { id: 'user' }]}    | ${false} | ${['admin', 'user']}
    ${[{ id: 'admin' }, { id: 'user' }]}    | ${true}  | ${['admin', 'user', 'root']}
  `('returns $expectedOptions when groups are $groups and isAdmin is $isAdmin', ({ groups, isAdmin, expectedOptions }) => {
    const wrapper = createWrapper(UserEdit, {
      data() {
        return {
          formModel: { groups },
          isAdmin
        }
      }
    })
    expect(wrapper.vm.groupOptions).toEqual(expectedOptions)
  })
  it.each`
    username   | users                                             | expectedVal
    ${'userX'} | ${undefined}                                      | ${{}}
    ${'user1'} | ${[]}                                             | ${{}}
    ${'user1'} | ${[{ username: 'user1' }, { username: 'user2' }]} | ${{ username: 'user1' }}
  `('returns $expectedVal when username:"$username", users:$users', ({ username, users, expectedVal }) => {
    const wrapper = createWrapper(UserEdit)
    wrapper.setData({
      currentUsername: username,
      formModel: {
        users
      }
    })
    const result = wrapper.vm.currentUserSection
    expect(result).toEqual(expectedVal)
  })
  it.each`
    isUserEdit | expectedVal
    ${false}   | ${'userFromForm'}
    ${true}    | ${'userFromSection'}
  `('returns $expectedVal when isUserEdit:$isUserEdit', async ({ isUserEdit, expectedVal }) => {
    const section = {
      username: 'userFromSection'
    }
    const currentUserSection = {
      username: 'userFromForm'
    }
    const wrapper = createWrapper(UserEdit, {
      data: () => ({ formModel: { users: [currentUserSection] } }),
      props: { section: isUserEdit ? section : currentUserSection }
    })
    const result = wrapper.vm.currentSection
    expect(result.username).toEqual(expectedVal)
  })
  it.each`
    section                      | expectedVal
    ${{ username: 'something' }} | ${true}
    ${{}}                        | ${false}
  `('returns $expectedVal when section:$section', async ({ section, expectedVal }) => {
    const wrapper = createWrapper(UserEdit)
    await wrapper.setProps({
      section
    })
    const result = wrapper.vm.isUserEdit
    expect(result).toEqual(expectedVal)
  })
  it.each`
    isAdmin  | isUserEdit | currentPassword | expectedVal
    ${true}  | ${true}    | ${'something'}  | ${true}
    ${true}  | ${false}   | ${'something'}  | ${true}
    ${true}  | ${true}    | ${undefined}    | ${false}
    ${false} | ${true}    | ${undefined}    | ${false}
    ${false} | ${false}   | ${undefined}    | ${true}
  `('returns $expectedVal when isAdmin:$isAdmin, isUserEdit:$isUserEdit, currentPassword:$currentPassword', ({ isAdmin, isUserEdit, currentPassword, expectedVal }) => {
    const wrapper = createWrapper(UserEdit, {
      computed: {
        isAdmin: () => isAdmin,
        isUserEdit: () => isUserEdit,
        currentSection: () => ({
          current_password: currentPassword
        })
      }
    })
    const result = wrapper.vm.isPasswordChangeOnlyAction()
    expect(result).toBe(expectedVal)
  })
  it.each`
    password       | passwordConfirm | expectedVal
    ${undefined}   | ${''}           | ${false}
    ${undefined}   | ${undefined}    | ${false}
    ${''}          | ${''}           | ${false}
    ${''}          | ${undefined}    | ${false}
    ${undefined}   | ${'something'}  | ${true}
    ${''}          | ${'something'}  | ${true}
    ${'something'} | ${undefined}    | ${true}
    ${'something'} | ${''}           | ${true}
  `('returns $expectedVal when password:"$password", passwordConfirm:"$passwordConfirm"', ({ password, passwordConfirm, expectedVal }) => {
    const wrapper = createWrapper(UserEdit, {
      computed: {
        currentSection: () => ({
          password,
          password_confirm: passwordConfirm
        })
      }
    })
    const result = wrapper.vm.isPaswordFieldFilled()
    expect(result).toBe(expectedVal)
  })
  it.each`
    isPasswordChangeOnlyAction | isPaswordFieldFilled | expectedVal
    ${true}                    | ${true}              | ${true}
    ${true}                    | ${false}             | ${true}
    ${false}                   | ${true}              | ${true}
    ${false}                   | ${false}             | ${false}
  `(
    'returns $expectedVal when isPasswordChangeOnlyAction:$isPasswordChangeOnlyAction, isPaswordFieldFilled:$isPaswordFieldFilled',
    ({ isPasswordChangeOnlyAction, isPaswordFieldFilled, expectedVal }) => {
      UserEdit.methods.isPasswordChangeOnlyAction = vi.fn().mockReturnValueOnce(isPasswordChangeOnlyAction)
      UserEdit.methods.isPaswordFieldFilled = vi.fn().mockReturnValueOnce(isPaswordFieldFilled)
      const wrapper = createWrapper(UserEdit)
      const result = wrapper.vm.isPaswordFieldsRequired
      expect(result).toBe(expectedVal)
    }
  )
  it.each`
    errorCode | error
    ${1}      | ${'Wrong current password. Password not changed.'}
    ${4}      | ${'Unexpected error occurred'}
    ${5}      | ${"Can not change other user's password."}
    ${103}    | ${'Unexpected error occurred'}
  `('returns "$error" when errorCode:$errorCode', async ({ errorCode, error }) => {
    const wrapper = createWrapper(UserEdit)
    const result = wrapper.vm.parsePassChangeError(errorCode)
    expect(result).toBe(error)
  })
  it('shows error', () => {
    const wrapper = createWrapper(UserEdit)
    wrapper.vm.parsePassChangeError = vi.fn().mockReturnValueOnce('error')
    wrapper.vm.$message.error = vi.fn()
    const errorObject = wrapper.vm.handleError()
    const error = errorObject.edit({
      data: {
        errors: [
          {
            code: 1
          }
        ]
      }
    })
    expect(error).toBe('error')
  })
  it.each`
    password      | passwordConfirm    | expectedVal
    ${'password'} | ${'otherPassword'} | ${false}
    ${'password'} | ${'password'}      | ${true}
  `('returns isValid:$expectedVal when password:"$password", passwordConfirm:"$passwordConfirm"', ({ password, passwordConfirm, expectedVal }) => {
    const wrapper = createWrapper(UserEdit, {
      computed: {
        currentSection: () => ({
          password,
          password_confirm: passwordConfirm
        })
      }
    })
    const result = wrapper.vm.isMatchingPasswords()
    expect(result.isValid).toBe(expectedVal)
  })
  it('should reset inputs', async () => {
    const wrapper = createWrapper(UserEdit)
    const res = {
      data: {
        id: 'test'
      }
    }
    const obj = {
      forms: {
        [`${res.data.id}`]: {
          current_password: {
            initialValue: 'test'
          },
          password: {
            initialValue: 'test'
          },
          password_confirm: {
            initialValue: 'test'
          }
        }
      }
    }
    await wrapper.vm.afterSave(obj, res)
    wrapper.vm.$store = { passwordPolicy: { password_length: 8 } }
    Object.keys(obj.forms[res.data.id]).forEach(property => {
      expect(obj.forms[res.data.id][property]).toEqual({ initialValue: '' })
    })
  })
  it.each`
    oldPass   | newPass    | expectedVal
    ${'test'} | ${'test'}  | ${false}
    ${'test'} | ${'test1'} | ${true}
  `('should return matching passwords validation error', ({ oldPass, newPass, expectedVal }) => {
    const wrapper = createWrapper(UserEdit, {
      computed: {
        currentSection: () => ({
          current_password: oldPass,
          password: newPass,
          password_confirm: newPass
        })
      }
    })
    const result = wrapper.vm.isMatchingOldPassword()
    expect(result.isValid).toBe(expectedVal)
  })
})
