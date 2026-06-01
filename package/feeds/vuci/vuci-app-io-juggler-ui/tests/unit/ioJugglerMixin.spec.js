import IoJugglerMixin from '../../src/views/services/IoJugglerMixin.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('IoJugglerMixin.vue', () => {
  it.each([
    [{}, false],
    [{ ui_name: 'test', type: 'weekday', ui_timetype: '0' }, false],
    [{ ui_name: 'test', type: 'weekday', ui_timetype: '1' }, false],
    [{ ui_name: 'test', type: 'weekday', ui_timetype: '1', interval1: 'interval1' }, false],
    [{ ui_name: 'test', type: 'weekday', ui_timetype: '1', interval1: 'interval1', interval2: 'interval2' }, true],
    [{ ui_name: 'test', type: 'weekday', ui_timetype: '0', value: 'value' }, true],
    [{ ui_name: 'test1', type: 'io' }, false],
    [{ ui_name: 'test1', type: 'io', name: 'name', state: 'state' }, true],
    [{ ui_name: 'test2', type: 'bool' }, false],
    [{ ui_name: 'test2', type: 'bool', conditions: ['conditions'], operation: 'operation' }, false],
    [{ ui_name: 'test2', type: 'bool', conditions: ['cond1', 'cond2'], operation: 'operation' }, true],
    [{ ui_name: 'test3', type: 'analog' }, false],
    [{ ui_name: 'test4', type: 'analog', name: 'adc', not: 'not' }, false],
    [{ ui_name: 'test4', type: 'analog', name: 'adc', not: 'not', min: 'min', max: 'max' }, true],
    [{ ui_name: 'test4', type: 'analog', name: 'acl', not: 'not' }, false],
    [{ ui_name: 'test4', type: 'analog', name: 'acl', not: 'not', acl: 'current' }, false],
    [{ ui_name: 'test4', type: 'analog', name: 'acl', not: 'not', acl: 'percent' }, false],
    [{ ui_name: 'test4', type: 'analog', name: 'acl', not: 'not', acl: 'current', min_curr: 'min_curr', max_curr: 'max_curr' }, true],
    [{ ui_name: 'test4', type: 'analog', name: 'acl', not: 'not', acl: 'percent', min_perc: 'min_perc', max_perc: 'max_perc' }, true],
    [{ ui_name: 'test4', type: 'analog', name: 'name', not: 'not' }, true]
  ])('check if isValidCondition return correct boolean', (data, res) => {
    const wrapper = createWrapper(IoJugglerMixin)
    const val = wrapper.vm.isValidCondition(data)
    expect(val).toEqual(res)
  })
  it.each([
    [
      [
        { ui_name: 'test1', type: 'io' },
        { ui_name: 'test2', type: 'io' }
      ],
      ['test1', 'test2'],
      "Can't use these conditions because they are not fully configured: test1, test2"
    ],
    [
      [
        { ui_name: 'test1', type: 'io', name: 'name', state: 'state' },
        { ui_name: 'test2', type: 'io' }
      ],
      ['test1', 'test2'],
      "Can't use this condition because it is not fully configured: test2"
    ],
    [
      [
        { ui_name: 'test1', type: 'io', name: 'name', state: 'state' },
        { ui_name: 'test1', type: 'io', name: 'name', state: 'state' }
      ],
      ['test1', 'test2'],
      undefined
    ]
  ])('check if validateConditions return correct error message', (allConditions, sectionConditions, res) => {
    const wrapper = createWrapper(IoJugglerMixin)
    const val = wrapper.vm.validateConditions(allConditions, sectionConditions)
    expect(val).toEqual(res)
  })
  it.each([
    [{}, false],
    [{ ui_name: 'test', type: 'email' }, false],
    [{ ui_name: 'test', type: 'email', subject: 'subject', text: 'text', recipients: 'recipients', email_group: 'email_group' }, true],
    [{ ui_name: 'test1', type: 'http' }, false],
    [{ ui_name: 'test1', type: 'http', url: 'url', post: 'post', ui_params: '1' }, false],
    [{ ui_name: 'test1', type: 'http', url: 'url', post: 'post' }, true],
    [{ ui_name: 'test1', type: 'http', url: 'url', post: 'post', ui_params: '1', text: 'text' }, true],
    [{ ui_name: 'test2', type: 'script' }, false],
    [{ ui_name: 'test2', type: 'script', ui_file_path: 'path' }, false],
    [{ ui_name: 'test2', type: 'script', ui_file_path: 'upload' }, false],
    [{ ui_name: 'test2', type: 'script', ui_file_path: 'path', path: 'path' }, true],
    [{ ui_name: 'test2', type: 'script', ui_file_path: 'upload', upload: 'upload' }, true],
    [{ ui_name: 'test3', type: 'profile' }, false],
    [{ ui_name: 'test3', type: 'profile', profile: 'profile' }, true],
    [{ ui_name: 'test4', type: 'rms' }, false],
    [{ ui_name: 'test4', type: 'rms', rms_on: 'rms_on' }, true],
    [{ ui_name: 'test5', type: 'wifi' }, false],
    [{ ui_name: 'test5', type: 'wifi', wifi_on: 'wifi_on' }, true],
    [{ ui_name: 'test6', type: 'sim_switch', flip: '' }, false],
    [{ ui_name: 'test6', type: 'sim_switch', flip: '1', target: 'target' }, true],
    [{ ui_name: 'test7', type: 'sms', ui_recipient_format: '' }, false],
    [{ ui_name: 'test7', type: 'sms', ui_recipient_format: 'single', text: 'text' }, false],
    [{ ui_name: 'test7', type: 'sms', ui_recipient_format: 'group', text: 'text' }, false],
    [{ ui_name: 'test7', type: 'sms', ui_recipient_format: 'ui_recipient_format', text: 'text' }, true],
    [{ ui_name: 'test8', type: 'dout', dest: '' }, false],
    [{ ui_name: 'test8', type: 'dout', ui_mirroring: '1', dest: '' }, false],
    [{ ui_name: 'test8', type: 'dout', ui_mirroring: '0', dest: '' }, false],
    [{ ui_name: 'test8', type: 'dout', ui_mirroring: '0', dest: 'dest', state: 'state', invert: 'invert' }, true],
    [{ ui_name: 'test9', type: 'mqtt', tls: '1' }, false],
    [{ ui_name: 'test9', type: 'mqtt', tls: '1', tls_type: 'psk' }, false],
    [{ ui_name: 'test9', type: 'mqtt', tls: '1', tls_type: 'cert' }, false],
    [{ ui_name: 'test9', type: 'mqtt' }, false],
    [{ ui_name: 'test9', type: 'mqtt', text: 'text', remote_addr: 'remote_addr', remote_port: 'remote_port', keepalive: 'keepalive', qos: 'qos', topic: 'topic' }, true],
    [{ ui_name: 'test10', type: 'reboot' }, true],
    [{ ui_name: 'test10', type: 'reboot420' }, false]
  ])('check if isValidAction return correct boolean', (data, res) => {
    const wrapper = createWrapper(IoJugglerMixin)
    const val = wrapper.vm.isValidAction(data)
    expect(val).toEqual(res)
  })
  it.each([
    [
      [
        { ui_name: 'test1', type: 'email' },
        { ui_name: 'test2', type: 'email' }
      ],
      ['test1', 'test2'],
      "Can't use these actions because they are not fully configured: test1, test2"
    ],
    [
      [
        { ui_name: 'test1', type: 'http', url: 'url', post: 'post' },
        { ui_name: 'test2', type: 'email' }
      ],
      ['test1', 'test2'],
      "Can't use this action because it is not fully configured: test2"
    ],
    [
      [
        { ui_name: 'test1', type: 'http', url: 'url', post: 'post' },
        { ui_name: 'test1', type: 'http', url: 'url', post: 'post' }
      ],
      ['test1', 'test2'],
      undefined
    ]
  ])('check if validateActions return correct error message', (allActions, sectionActions, res) => {
    const wrapper = createWrapper(IoJugglerMixin)
    const val = wrapper.vm.validateActions(allActions, sectionActions)
    expect(val).toEqual(res)
  })
})
