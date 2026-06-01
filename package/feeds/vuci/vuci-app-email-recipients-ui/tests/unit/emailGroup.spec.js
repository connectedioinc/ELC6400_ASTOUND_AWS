import createWrapper from '@tests/unit/mockFactory'
import EmailGroups from '../../src/views/system/EmailGroups.vue'
import EmailGroupEdit from '../../src/views/system/EmailGroupEdit.vue'

const groupsData = [{ name: 'test1' }]
const validationSuccess = { isValid: true }
const validationFailure = {
  isValid: false,
  message: "Email account name 'test1' already exists"
}

describe('EmailGroups.vue', () => {
  it.each`
    expectedIsValid | givenGroup    | expectedValidationStatus | givenValue | testText
    ${true}         | ${groupsData} | ${validationSuccess}     | ${'test2'} | ${'does not exist'}
    ${false}        | ${groupsData} | ${validationFailure}     | ${'test1'} | ${'exists'}
  `('returns isValid $expectedIsValid when instance $testText', ({ givenGroup, expectedValidationStatus, givenValue }) => {
    const wrapper = createWrapper(EmailGroups)
    wrapper.vm.formData.users = givenGroup
    const resVal = wrapper.vm.instanceExists(givenValue)
    expect(resVal).toEqual(expectedValidationStatus)
  })
})

describe('EmailGroupEdit.vue', () => {
  it('invokes success message when sending successful message', async () => {
    const wrapper = createWrapper(EmailGroupEdit, {
      props: {
        section: {
          secure_conn: '0',
          smtp_ip: 'test.com'
        }
      }
    })
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce()
    const emailParams = {
      vuciForm: { validate: () => new Promise(resolve => resolve(true)) }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    const spy1 = vi.spyOn(wrapper.vm.$axios, 'post')
    await wrapper.vm.sendEmail(emailParams)
    expect(spy).toHaveBeenCalledWith('Email sent successfully')
    expect(spy1).toHaveBeenCalledWith('/api/recipients/email_users/actions/send_email', {
      data: {
        smtp_ip: 'test.com',
        smtp_port: '465',
        senderemail: 'email@domain.com',
        secure_conn: '0'
      }
    })
  })
  it('invokes success message when sending request with credentials and message is successful', async () => {
    const wrapper = createWrapper(EmailGroupEdit, {
      props: {
        section: {
          secure_conn: '0',
          smtp_ip: 'test.com',
          credentials: '1',
          username: 'test',
          password: 'test'
        }
      }
    })
    wrapper.vm.$axios.post = vi.fn().mockResolvedValueOnce()
    const emailParams = {
      vuciForm: { validate: () => new Promise(resolve => resolve(true)) }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    const spy1 = vi.spyOn(wrapper.vm.$axios, 'post')
    await wrapper.vm.sendEmail(emailParams)
    expect(spy).toHaveBeenCalledWith('Email sent successfully')
    expect(spy1).toHaveBeenCalledWith('/api/recipients/email_users/actions/send_email', {
      data: {
        smtp_ip: 'test.com',
        smtp_port: '465',
        senderemail: 'email@domain.com',
        secure_conn: '0',
        username: 'test',
        password: 'test'
      }
    })
  })
  it('invokes error message when smtp ip is empty', async () => {
    const wrapper = createWrapper(EmailGroupEdit, {
      props: {
        section: {
          secure_conn: '0',
          smtp_ip: ''
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.sendEmail()
    expect(spy).toHaveBeenCalledWith('SMTP server is missing')
  })
  it('invokes error message when username is empty', async () => {
    const wrapper = createWrapper(EmailGroupEdit, {
      props: {
        section: {
          secure_conn: '0',
          smtp_ip: 'test.com',
          credentials: '1',
          username: ''
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.sendEmail()
    expect(spy).toHaveBeenCalledWith('Username is required')
  })
  it('invokes error message when password is empty', async () => {
    const wrapper = createWrapper(EmailGroupEdit, {
      props: {
        section: {
          secure_conn: '0',
          smtp_ip: 'test.com',
          credentials: '1',
          username: 'test',
          password: ''
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.sendEmail()
    expect(spy).toHaveBeenCalledWith('Password is required')
  })
  it('invokes error message when validation is invalid', async () => {
    const wrapper = createWrapper(EmailGroupEdit, {
      props: {
        section: {
          secure_conn: '0',
          smtp_ip: 'test.com',
          credentials: '1',
          username: 'test',
          password: 'test'
        }
      }
    })
    const emailParams = {
      vuciForm: { validate: () => new Promise(resolve => resolve(false)) }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.sendEmail(emailParams)
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })
  it('invokes error message when sending failed message', async () => {
    const wrapper = createWrapper(EmailGroupEdit, {
      props: {
        section: {
          secure_conn: '0',
          smtp_ip: 'test.com',
          smtp_port: '123',
          senderemail: 'test@test.test'
        }
      }
    })
    wrapper.vm.$axios.post = vi.fn().mockRejectedValueOnce({ message: '' })
    const emailParams = {
      vuciForm: { validate: () => new Promise(resolve => resolve(true)) }
    }
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const spy1 = vi.spyOn(wrapper.vm.$axios, 'post')
    await wrapper.vm.sendEmail(emailParams)
    expect(spy).toHaveBeenCalledWith('Failed to send test email')
    expect(spy1).toHaveBeenCalledWith('/api/recipients/email_users/actions/send_email', {
      data: {
        smtp_ip: 'test.com',
        smtp_port: '123',
        senderemail: 'test@test.test',
        secure_conn: '0'
      }
    })
  })
})
