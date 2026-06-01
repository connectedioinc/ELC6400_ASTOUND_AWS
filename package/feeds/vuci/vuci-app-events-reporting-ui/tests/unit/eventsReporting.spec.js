import createWrapper from '@tests/unit/mockFactory'
import eventsReporting from '../../src/views/services/EventsReporting.vue'
import eventsReportingEdit from '../../src/views/services/EventsReportingEdit.vue'

const validEvents = {
  Config: [],
  Reboot: ['sms reboot']
}
const validPhoneGroups = [
  { id: 'test1', name: 'test' },
  { id: 'test2', name: '1test' }
]
const validEmailGroups = [
  { id: 'test1', name: 'test' },
  { id: 'test2', name: '1test' }
]
const validProps = {
  section: {
    id: 'eventReporting',
    action: 'sendEmail',
    event: 'Reboot',
    email: 'test'
  }
}
const validModems = [
  {
    id: 'test1',
    name: 'test',
    version: 'asfdfasd',
    sim_count: '2'
  },
  {
    id: 'test2',
    name: '1test',
    version: 'afsdfasdfasd',
    sim_count: '2'
  }
]
const correctData = [
  { success: true, data: [{ id: 'test', '.type': 'email' }] },
  { success: true, data: [{ id: 'test', '.type': 'phone' }] },
  { success: true, data: { events: { Config: ['openvpn'] }, params: [] } },
  { success: true, data: validModems }
]
const badData = [{ success: false }, { success: false }, { success: false }, { success: false }]
const responseBad = {
  emailUserGroups: [],
  modems: [],
  availableEvents: {},
  parameters: [],
  phoneUserGroups: []
}
const apiResponse = {
  availableEvents: { Config: ['openvpn'] },
  emailUserGroups: [{ id: 'test', '.type': 'email' }],
  modems: validModems,
  parameters: [],
  phoneUserGroups: [{ id: 'test', '.type': 'phone' }]
}
const eventsTypes = {
  Config: 'Config change',
  DHCP: 'New DHCP client',
  Reboot: 'Reboot'
}

const eventsSubtypes = {
  Config: [
    ['all', 'All'],
    ['openvpn', 'OpenVPN']
  ],
  Reboot: [['sms reboot', 'From SMS']]
}

const sendParams = [{ config: 'Config' }, { config: '' }]
const receiveParams = [{ config: 'Config change' }, { config: 'N/A' }]
const sendParamsType = [{ config: 'sms reboot' }, { config: '' }, { config: 'openvpn' }]
const receiveParamsType = [{ config: 'From SMS' }, { config: 'N/A' }, { config: 'OpenVPN' }]
const sendParamsAction = [{ config: 'sendEmail' }, { config: '' }]
const receiveParamsAction = [{ config: 'Send email' }, { config: 'N/A' }]

describe('EventsReporting.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(eventsReporting, {
      global: {
        mocks: {
          $alert: {
            warning: vi.fn()
          }
        }
      }
    })
  })
  it('returns form options', () => {
    wrapper.vm.formOptions = ['test']
    const val = wrapper.vm.getFormOptions()
    expect(val).toEqual(['test'])
  })
  it.each([
    [correctData, apiResponse],
    [badData, responseBad]
  ])('loads data when success is %s', async (data, response) => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    await wrapper.vm.loadData()
    expect(wrapper.vm.formOptions).toEqual(response)
  })
  it('invokes error message when promise is rejected', async () => {
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData()
    expect(spy).toHaveBeenCalledWith('An unexpected error occurred')
  })
  it.each([
    [sendParams[0].config, receiveParams[0].config],
    ['', receiveParams[1].config]
  ])('when event param is %s response is %s', async (data, response) => {
    wrapper.vm.$eventsOptions.getTypes = vi.fn()
    wrapper.vm.$eventsOptions.getTypes.mockReturnValue(eventsTypes)
    const result = await wrapper.vm.getEvent(data)
    expect(result).toMatch(response)
  })
  it.each([
    [sendParamsType[0].config, receiveParamsType[0].config],
    [sendParamsType[1].config, receiveParamsType[1].config],
    [sendParamsType[2].config, receiveParamsType[2].config]
  ])('when subtype param is %s response is %s', async (data, response) => {
    wrapper.vm.$eventsOptions.getTranslatedSubtypes = vi.fn()
    wrapper.vm.$eventsOptions.getTranslatedSubtypes.mockReturnValue(eventsSubtypes)
    const result = await wrapper.vm.getEventMark(data)
    expect(result).toEqual(response)
  })
  it.each([
    [sendParamsAction[0].config, receiveParamsAction[0].config],
    [sendParamsAction[1].config, receiveParamsAction[1].config]
  ])('when action param is %s response is %s', (data, response) => {
    const result = wrapper.vm.getAction(data)
    expect(result).toEqual(response)
  })
  it.each`
    title             | length | result
    ${'passes'}       | ${1}   | ${{ valid: true }}
    ${'throws error'} | ${90}  | ${{ valid: false, message: 'Cannot create more instances. Only 90 Events Reporting rules are allowed' }}
  `('tests if validation $title', ({ length, result }) => {
    const dataSource = Array.from({ length }, (_, index) => ({ id: 'test' + index }))
    expect(wrapper.vm.onAdd('', dataSource)).toEqual(result)
  })
  it.each([
    ['with empty event, type, eventMark and action options', 'Missing required options: Event type, Event subtype, Action', { id: 'test1', enable: '1', event: '', eventMark: '', action: '' }],
    [
      'with empty subject option, when action is equal sendEmail',
      'Missing required option: Subject',
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendEmail', subject: '', message: 'message', emailgroup: 'emailgroup', recipEmail: ['recipEmail'] }
    ],
    [
      'with empty message option, when action is equal sendEmail',
      'Missing required option: Message text on event',
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendEmail', subject: 'subject', message: '', emailgroup: 'emailgroup', recipEmail: ['recipEmail'] }
    ],
    [
      'with empty emailgroup option, when action is equal sendEmail',
      'Missing required option: Email account',
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendEmail', subject: 'subject', message: 'message', emailgroup: '', recipEmail: ['recipEmail'] }
    ],
    [
      'with empty emailgroup option, when action is equal sendEmail',
      "Missing required option: Recipient's email address",
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendEmail', subject: 'subject', message: 'message', emailgroup: 'emailgroup', recipEmail: [''] }
    ],
    [
      'with empty message option, when action is equal sendSMS',
      'Missing required option: Message text on event',
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendSMS', message: '', recipient_format: 'recipient_format' }
    ],
    [
      'with empty recipient_format option, when action is equal sendSMS',
      'Missing required option: Recipients',
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendSMS', message: 'message', recipient_format: '' }
    ],
    [
      'with empty telnum option, when action is equal sendSMS and recipient_format is single',
      "Missing required option: Recipient's phone number",
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendSMS', message: 'message', recipient_format: 'single', telnum: '' }
    ],
    [
      'with empty group option, when action is equal sendSMS and recipient_format is group',
      "Missing required option: Recipient's phone number",
      { id: 'test1', enable: '1', event: 'event', eventMark: 'eventMark', action: 'sendSMS', message: 'message', recipient_format: 'group', group: '' }
    ]
  ])('returns error message when %s', (text, message, sectionValues) => {
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    const data = {
      uciSection: sectionValues
    }
    wrapper.vm.validateEnable(data)
    expect(spy).toHaveBeenCalledWith(message)
  })
})
describe('EventsReportingEdit.vue', () => {
  const options = {
    emailUserGroups: [],
    phoneUserGroups: [],
    availableEvents: {},
    modems: [],
    parameters: []
  }
  it.each([['with devices'], ['without devices']])('loads text box parameters', () => {
    options.parameters = [
      { id: 'nl', type: 'event' },
      { id: 'g0', type: 'io', block_pins: [1], io_name: 'Input' },
      { id: 'g1', type: 'io', block_pins: [2], io_name: 'Test' }
    ]
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedTypes: vi.fn().mockReturnValue({}),
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const result = wrapper.vm.formattedParameters
    expect(result).toEqual([
      { description: 'New line', parameter: '%nl' },
      { description: 'Input (1)', parameter: '%g0' },
      { description: 'Unknown (2)', parameter: '%g1' }
    ])
  })
  it('loads phone group list with %s', () => {
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => ({ ...options, phoneUserGroups: validPhoneGroups }) },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const result = wrapper.vm.phoneGroupList
    expect(result).toEqual(['test', '1test'])
  })
  it('loads email group list', () => {
    options.emailUserGroups = validEmailGroups
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const result = wrapper.vm.emailGroupList
    expect(result).toEqual(['test', '1test'])
  })
  it('loads event list', async () => {
    options.availableEvents = validEvents
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedTypes: vi.fn().mockReturnValue([
              ['Config', 'Config change'],
              ['Reboot', 'Reboot']
            ]),
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const result = await wrapper.vm.eventTypes
    expect(result).toEqual([
      ['Config', 'Config change'],
      ['Reboot', 'Reboot']
    ])
  })
  it('loads modem list when theres no modems', () => {
    options.modems = []
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const result = wrapper.vm.modemList
    expect(result).toEqual([])
  })
  it('loads subtype options', async () => {
    options.availableEvents = validEvents
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({ Config: [], Reboot: [['sms reboot', 'From SMS']] })
          }
        }
      }
    })
    const result = await wrapper.vm.translatedSubtypes
    expect(result).toEqual({
      Config: [],
      Reboot: [['sms reboot', 'From SMS']]
    })
  })
  it('loads event types when there are no events', () => {
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const result = wrapper.vm.eventSubtypes
    expect(result).toEqual([])
  })
  it('loads event types when there are available events', () => {
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({ Reboot: [['samba', 'Network shares']] })
          }
        }
      }
    })
    const result = wrapper.vm.eventSubtypes
    expect(result).toEqual([['samba', 'Network shares']])
  })
  it('loads action options when there are modems', () => {
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          },
          $mobile: {
            modemsOptions: vi.fn().mockReturnValue([{}])
          }
        }
      }
    })
    const result = wrapper.vm.actionOptions
    expect(result).toEqual([
      ['sendEmail', 'Send Email'],
      ['sendSMS', 'Send SMS']
    ])
  })
  it('loads actions when there are no modems', () => {
    const wrapper = createWrapper(eventsReportingEdit, {
      props: validProps,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          },
          $mobile: {
            modemsOptions: vi.fn().mockReturnValue([])
          }
        }
      }
    })
    const result = wrapper.vm.actionOptions
    expect(result).toEqual([['sendEmail', 'Send Email']])
  })
  it('invokes error message when vuci form is invalid', async () => {
    options.emailUserGroups = ['test']
    const wrapper = createWrapper(eventsReportingEdit, {
      props: {
        section: {
          id: 'eventReporting',
          action: 'sendEmail',
          event: 'Reboot',
          email: 'test',
          subject: 'test'
        }
      },
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.testMail({ vuciForm: { validate: () => Promise.reject(new Error('invalid')) } })
    expect(spy).toHaveBeenCalledWith('Some fields are invalid')
  })
  it('invokes success message with info_modem_id when there are modem than 1 modem', async () => {
    options.emailUserGroups = ['test']
    const wrapper = createWrapper(eventsReportingEdit, {
      props: {
        section: {
          id: 'eventReporting',
          action: 'sendEmail',
          event: 'Reboot',
          email: 'test',
          subject: 'test',
          recipEmail: 'test@test.test',
          emailgroup: 'test',
          message: 'message',
          info_modem_id: '1.1-4'
        }
      },
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      },
      computed: {
        modemList: () => [{}, {}]
      }
    })
    const spy = vi.spyOn(wrapper.vm.$axios, 'post')
    await wrapper.vm.testMail({ vuciForm: { validate: () => Promise.resolve(true) } })
    expect(spy).toHaveBeenCalledWith('/api/events_reporting/actions/send_test_email', {
      data: {
        event: 'Reboot',
        subject: 'test',
        message: 'message',
        group: 'test',
        recipients: 'test@test.test',
        info_modem_id: '1.1-4'
      }
    })
  })
  it('invokes success message when email is sent', async () => {
    options.emailUserGroups = ['test']
    const subject = {
      section: {
        id: 'eventReporting',
        action: 'sendEmail',
        event: 'test',
        email: 'test',
        subject: 'testa'
      }
    }
    const wrapper = createWrapper(eventsReportingEdit, {
      props: subject,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'success')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockResolvedValueOnce({})
    await wrapper.vm.testMail({
      vuciForm: {
        validate: () => {
          return Promise.resolve(true)
        }
      }
    })
    expect(spy).toHaveBeenCalledWith('Mail sent successfully')
  })
  it('invokes error message when email fails to send', async () => {
    options.emailUserGroups = ['test']
    const subject = {
      section: {
        id: 'eventReporting',
        action: 'sendEmail',
        event: 'test',
        email: 'test',
        subject: 'testa'
      }
    }
    const wrapper = createWrapper(eventsReportingEdit, {
      props: subject,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({ response: { data: { errors: [{ code: true }] } } })
    await wrapper.vm.testMail({
      vuciForm: {
        validate: () => {
          return Promise.resolve(true)
        }
      }
    })
    expect(spy).toHaveBeenCalledWith('Failed to send the email')
  })
  it('invokes error message when email group is incorrectly configured', async () => {
    options.emailUserGroups = ['test']
    const subject = {
      section: {
        id: 'eventReporting',
        action: 'sendEmail',
        event: 'test',
        email: 'test',
        subject: 'testa'
      }
    }
    const wrapper = createWrapper(eventsReportingEdit, {
      props: subject,
      global: {
        provide: { formOptions: () => options },
        mocks: {
          $eventsOptions: {
            getTranslatedSubtypes: vi.fn().mockReturnValue({})
          }
        }
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$axios.post = vi.fn()
    wrapper.vm.$axios.post.mockRejectedValueOnce({})
    await wrapper.vm.testMail({
      vuciForm: {
        validate: () => {
          return Promise.resolve(true)
        }
      }
    })
    expect(spy).toHaveBeenCalledWith('Failed to send the email')
  })
})
