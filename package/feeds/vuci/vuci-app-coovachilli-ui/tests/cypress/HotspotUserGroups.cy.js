const route = '/services/hotspot/groups'
const endpoint = '/hotspot/groups/config'

before(() => {
  cy.login()
  cy.hitPage(route)
})

after(() => {
  cy.logout()
})

const HotpspotUserGroupsInstanceName = 'test' + Math.floor(Math.random() * 100) + 1

const timeLimit = {
  minValue: { type: 'input', inputName: 'defsessiontimeout', value: '0' },
  maxValue: { type: 'input', inputName: 'defsessiontimeout', value: '86400' }
}
const downloadBandwith = {
  minValue: { type: 'input', inputName: 'downloadbandwidth', value: '0' },
  maxValue: { type: 'input', inputName: 'downloadbandwidth', value: '1000000' }
}
const uploadBandwith = {
  minValue: { type: 'input', inputName: 'uploadbandwidth', value: '0' },
  maxValue: { type: 'input', inputName: 'uploadbandwidth', value: '1000000' }
}
const downloadLimit = {
  minValue: { type: 'input', inputName: 'downloadlimit', value: '0' },
  maxValue: { type: 'input', inputName: 'downloadlimit', value: '1000000' }
}
const uploadLimit = {
  minValue: { type: 'input', inputName: 'uploadlimit', value: '0' },
  maxValue: { type: 'input', inputName: 'uploadlimit', value: '1000000' }
}
const warning = {
  minValue: { type: 'input', inputName: 'warning', value: '0' },
  maxValue: { type: 'input', inputName: 'warning', value: '1000000' }
}
const period = {
  month: { type: 'select', inputName: 'period', options: '3', value: 'Month' },
  week: { type: 'select', inputName: 'period', options: '2', value: 'Week' },
  day: { type: 'select', inputName: 'period', options: '1', value: 'Day' }
}
const startDayHour = {
  monthDay: { type: 'select', inputName: 'day', options: '5', value: '5' },
  weekDay: { type: 'select', inputName: 'weekday', options: '4', value: 'Thursday' },
  hour: { type: 'select', inputName: 'hour', options: '5', value: '5' }
}

describe('Hotspot User Groups configuration end to end tests', () => {
  it('All inputs with min values, "Period" = "Day"', () => {
    const schema = [timeLimit.minValue, downloadBandwith.minValue, uploadBandwith.minValue, downloadLimit.minValue, uploadLimit.minValue, warning.minValue, period.day, startDayHour.hour]
    cy.get('input[id=name]').type(HotpspotUserGroupsInstanceName)
    cy.testConfigurationEdit(endpoint, schema, 'groups')
  })
  it('All inputs with max values, "Period" = "Week"', () => {
    const schema = [timeLimit.maxValue, downloadBandwith.maxValue, uploadBandwith.maxValue, downloadLimit.maxValue, uploadLimit.maxValue, warning.maxValue, period.week, startDayHour.weekDay]
    cy.get('input[id=name]').type(HotpspotUserGroupsInstanceName)
    cy.testConfigurationEdit(endpoint, schema, 'groups')
  })
  it('All inputs with max values, "Period" = "Month"', () => {
    const schema = [timeLimit.maxValue, downloadBandwith.maxValue, uploadBandwith.maxValue, downloadLimit.maxValue, uploadLimit.maxValue, warning.maxValue, period.month, startDayHour.monthDay]
    cy.get('input[id=name]').type(HotpspotUserGroupsInstanceName)
    cy.testConfigurationEdit(endpoint, schema, 'groups')
  })
})
