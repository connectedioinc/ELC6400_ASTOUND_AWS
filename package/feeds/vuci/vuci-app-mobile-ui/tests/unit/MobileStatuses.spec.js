import MobileStatuses from '../../src/components/network/MobileStatuses.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('MobileStatuses.vue', () => {
  it.each([
    [
      'current SIM is active SIM',
      {
        pinleft: 2,
        operator_state: 'Searching',
        sim_count: 1,
        pinstate: 'Inserted',
        conntype: '4G (LTE)',
        state: 'Connected',
        primary: true,
        builtin: true,
        simstate: 'Inserted',
        provider: 'BITE',
        oper: 'TAVO BITE',
        operator: 'TAVO BITE',
        data_off: false,
        pukleft: 10,
        active_sim: 1,
        sc_band_av: 'Inactive',
        data_conn_state: 'Connected',
        name: 'Primary modem',
        id: '3-1',
        netstate: 'Searching',
        ntype: 'LTE'
      },
      { deny_roaming: '0', position: '1' },
      {
        connection: {
          class: 'success',
          info: 'connected',
          title: 'Data connection state'
        },
        operator: [
          {
            class: 'text-theme-text-warning',
            info: 'TAVO BITE',
            title: 'Operator'
          },
          {
            info: 'searching',
            title: 'Operator state'
          },
          {
            info: '4G (LTE)',
            title: 'Network type'
          }
        ],
        simcard: {
          class: 'success',
          info: 'inserted',
          title: 'SIM card state'
        }
      }
    ],
    [
      'current SIM is not active SIM',
      {
        pinleft: 2,
        operator_state: 'Searching',
        sim_count: 1,
        pinstate: 'Inserted',
        conntype: '4G (LTE)',
        state: 'Connected',
        primary: true,
        builtin: true,
        simstate: 'Inserted',
        provider: 'BITE',
        oper: 'TAVO BITE',
        operator: 'TAVO BITE',
        data_off: false,
        pukleft: 10,
        active_sim: 2,
        sc_band_av: 'Inactive',
        data_conn_state: 'Connected',
        name: 'Primary modem',
        id: '3-1',
        netstate: 'Searching',
        ntype: 'LTE'
      },
      { deny_roaming: '1', position: '1' },
      {
        connection: {
          class: 'error',
          info: 'N/A',
          title: 'Data connection state'
        },
        operator: [
          {
            class: 'error',
            info: 'N/A',
            title: 'Operator'
          },
          {
            info: 'N/A',
            title: 'Operator state'
          },
          {
            info: 'N/A',
            title: 'Network type'
          }
        ],
        simcard: {
          class: 'text-theme-text-subtle',
          info: 'not active SIM',
          title: 'SIM card state'
        }
      }
    ],
    [
      'mobile data turned off using SMS and deny roaming enabled',
      {
        pinleft: 2,
        operator_state: 'Roaming',
        sim_count: 1,
        pinstate: 'Inserted',
        conntype: 'CAT-M1',
        state: 'Disconnected',
        primary: true,
        builtin: true,
        simstate: 'Inserted',
        provider: 'BITE',
        oper: 'TAVO BITE',
        operator: 'TAVO BITE',
        data_off: true,
        pukleft: 10,
        active_sim: 1,
        sc_band_av: 'Inactive',
        data_conn_state: 'Disconnected',
        name: 'Primary modem',
        id: '3-1',
        netstate: 'Roaming',
        ntype: 'LTE'
      },
      { deny_roaming: '1', position: '1' },
      {
        connection: {
          class: 'error',
          info: 'disconnected (Mobile data is turned off by an external application, Mobile data is not allowed when roaming)',
          title: 'Data connection state'
        },
        operator: [
          {
            class: 'success',
            info: 'TAVO BITE',
            title: 'Operator'
          },
          {
            info: 'roaming',
            title: 'Operator state'
          },
          {
            info: 'CAT-M1',
            title: 'Network type'
          }
        ],
        simcard: {
          class: 'success',
          info: 'inserted',
          title: 'SIM card state'
        }
      }
    ]
  ])('returns parseModemStatus data when %s', (text, modem, sim, response) => {
    const wrapper = createWrapper(MobileStatuses, {
      props: {
        modemStatus: modem,
        simSection: sim,
        mobileGeneral: true
      },
      global: {
        mocks: {
          $mobile: {
            getSimstate: value => value.pinstate || 'N/A',
            getConntype: value => value || 'N/A',
            getOperatorState: value => value || 'N/A',
            getGnssState: () => false,
            getSimstateLabel: () => 'SIM card state'
          }
        }
      }
    })
    expect(wrapper.vm.statusHints).toEqual(response)
  })
})
