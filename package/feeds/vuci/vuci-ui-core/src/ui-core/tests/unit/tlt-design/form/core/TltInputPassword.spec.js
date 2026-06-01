import TltInputPassword from '@ui-core/tlt-design/form/core/TltInputPassword.vue'
import createWrapper from '../../../mockFactory'

describe('TltInputPassword.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(TltInputPassword)
  })

  it('generatePassword generates a password of specified length', () => {
    for (let i = 4; i <= 100; i++) {
      const password = wrapper.vm.generatePassword({ length: i, charsets: ['test'] })
      expect(password.length).toBe(i)
    }
  })

  it('generatePassword generates with at least a number, lowercase and uppercase letter and special symbol', () => {
    for (let i = 3; i <= 100; i++) {
      const password = wrapper.vm.generatePassword({ length: 16, charsets: ['abcdefghijklmnopqrstuvwxyz', 'BCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789', '!@#$%^&*()_+~|}{[]:;?></-='] })
      expect(password).toMatch(/[0-9]/)
      expect(password).toMatch(/[a-z]/)
      expect(password).toMatch(/[A-Z]/)
      expect(password).toMatch(/['!@#$%^&*()_+~|}{[\]:;?></\-=']/)
    }
  })
})
