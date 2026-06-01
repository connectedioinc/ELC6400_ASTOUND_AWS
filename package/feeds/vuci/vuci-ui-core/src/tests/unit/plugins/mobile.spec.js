import { mobile } from '@/plugins/mobile'
import '@ui-core/utils/string-format'
import { setActivePinia } from 'pinia'
import { createTestingPinia } from '@pinia/testing'
import i18n from '@ui-core/plugins/i18n'

describe('mobile.js', () => {
  beforeEach(() => {
    const app = { config: { globalProperties: {} } }
    setActivePinia(createTestingPinia())
    i18n.install(app)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it.each`
    value               | res
    ${'Not registered'} | ${'Not registered'}
    ${'Test123'}        | ${'N/A'}
  `('returns translated modem operator state #%#', ({ value, res }) => {
    expect(mobile.getOperatorState(value)).toEqual(res)
  })
  it.each`
    value           | res
    ${'No service'} | ${'No service'}
    ${'Test123'}    | ${'Test123'}
    ${undefined}    | ${'N/A'}
  `('returns translated modem conntype #%#', ({ value, res }) => {
    expect(mobile.getConntype(value)).toEqual(res)
  })
  it.each`
    value          | res
    ${'Connected'} | ${'Connected'}
    ${'Test123'}   | ${'-'}
  `('returns translated modem data connection state #%#', ({ value, res }) => {
    expect(mobile.getDataConnState(value)).toEqual(res)
  })
  it.each`
    value                        | res
    ${{ sc_band_av: 'Active' }}  | ${'Active'}
    ${{ sc_band_av: 'Test123' }} | ${'N/A'}
  `('returns translated modem carrier aggregation state #%#', ({ value, res }) => {
    expect(mobile.getCA(value)).toEqual(res)
  })
  it.each`
    value                                                     | include      | res
    ${{ simstate: 'Inserted' }}                               | ${false}     | ${'Inserted'}
    ${{ simstate: 'Test123' }}                                | ${undefined} | ${'N/A'}
    ${{ simstate: 'Not inserted', pinstate: 'Not inserted' }} | ${true}      | ${'Not inserted'}
    ${{ simstate: 'Inserted', pinstate: 'Inserted' }}         | ${true}      | ${'Inserted'}
    ${{ simstate: 'Inserted', pinstate: 'SIM failure' }}      | ${true}      | ${'Inserted (SIM failure)'}
    ${{ simstate: 'Inserted', esim_profile: 1 }}              | ${false}     | ${'Active'}
  `('returns translated modem simState #%#', ({ value, include, res }) => {
    expect(mobile.getSimstate(value, include)).toEqual(res)
  })
  it.each`
    value                  | res
    ${{ esim_profile: 1 }} | ${'eSIM state'}
    ${{}}                  | ${'SIM card state'}
  `('returns translated modem sim state title #%#', ({ value, res }) => {
    expect(mobile.getSimstateLabel(value)).toEqual(res)
  })
  it.each`
    modem                                        | res
    ${{ pinstate: 'Inserted' }}                  | ${'Inserted'}
    ${{ pinstate: 'PIN', pinleft: 1 }}           | ${'Required PIN. 1 attempt left.'}
    ${{ pinstate: 'PIN', pinleft: 2 }}           | ${'Required PIN. 2 attempts left.'}
    ${{ pinstate: 'PUK', pukleft: 1 }}           | ${'Required PUK. 1 attempt left.'}
    ${{ pinstate: 'PUK', pukleft: 2 }}           | ${'Required PUK. 2 attempts left.'}
    ${{ pinstate: 'Test123' }}                   | ${'N/A'}
    ${{ pinstate: 'Inserted', esim_profile: 1 }} | ${'Active'}
  `('returns translated modem pinstate #%#', ({ modem, res }) => {
    expect(mobile.getPinstate(modem)).toEqual(res)
  })
  it.each`
    modem                  | res
    ${{ mobile_stage: 0 }} | ${'Unknown'}
    ${{ mobile_stage: 1 }} | ${'Waiting for SIM'}
    ${{ mobile_stage: 2 }} | ${'SIM failure'}
    ${{ mobile_stage: 3 }} | ${'Idling'}
    ${{}}                  | ${'N/A'}
  `('returns translated mobile stage #%#', ({ modem, res }) => {
    expect(mobile.getMobileStage(modem)).toEqual(res)
  })
  it.each`
    modem                   | res
    ${{ busy_state_id: 1 }} | ${'Idle'}
    ${{ busy_state_id: 2 }} | ${'Sending SMS'}
    ${{ busy_state_id: 3 }} | ${'Connecting to operator'}
    ${{ busy_state_id: 0 }} | ${'N/A'}
  `('returns translated modem busy state #%#', ({ modem, res }) => {
    expect(mobile.getModemBusyState(modem)).toEqual(res)
  })
  it.each`
    modem                                  | res
    ${{ blocked: '1' }}                    | ${'in serial control'}
    ${{ blocked: '0' }}                    | ${'unreachable'}
    ${{ blocked: '0', modem_state_id: 1 }} | ${'unreachable'}
    ${{ blocked: '0', modem_state_id: 2 }} | ${'unreachable (shut down unexpectedly)'}
    ${{ blocked: '0', modem_state_id: 5 }} | ${'unreachable (shut down by user)'}
    ${{ disabled: '1' }}                   | ${'disabled'}
  `('returns modem blocked text #%#', ({ modem, res }) => {
    expect(mobile.getBlockedText(modem)).toEqual(res)
  })
  it.each`
    modem                                                                                          | res
    ${{ id: '3-1', cell_info: [{ ue_state: 2, arfcn: 1000 }] }}                                    | ${'ARFCN'}
    ${{ id: '3-1', cell_info: [{ ue_state: 2, arfcn: 'N/A', uarfcn: 1000 }] }}                     | ${'UARFCN'}
    ${{ id: '3-1', cell_info: [{ ue_state: 2, arfcn: 'N/A', uarfcn: 'N/A', 'nr-arfcn': 1000 }] }}  | ${'NR-ARFCN'}
    ${{ id: '3-1', cell_info: [{ ue_state: 2, arfcn: 'N/A', uarfcn: 'N/A', 'nr-arfcn': 'N/A' }] }} | ${'EARFCN'}
    ${{ id: '3-1', ntype: '5G-SA' }}                                                               | ${'NR-ARFCN'}
    ${{ id: '3-1', ntype: '5G-NSA' }}                                                              | ${'EARFCN/NR-ARFCN'}
    ${{ id: '3-1', ntype: 'LTE' }}                                                                 | ${'EARFCN'}
    ${{ id: '3-1', ntype: 'WCDMA' }}                                                               | ${'UARFCN'}
    ${{ id: '3-1', ntype: 'GSM' }}                                                                 | ${'ARFCN'}
  `('returns modem frequency name #%#', ({ modem, res }) => {
    expect(mobile.getFrequencyName(modem)).toEqual(res)
  })
  it.each`
    code  | res
    ${23} | ${'On'}
    ${0}  | ${'Off'}
  `('returns flight mode status when $code', ({ code, res }) => {
    expect(mobile.getFlightMode({ mobile_stage: code })).toEqual(res)
  })
  it.each`
    code    | res
    ${'2'}  | ${'IMSI unknown in HSS'}
    ${'79'} | ${'Unknown'}
  `('returns EMM error when $code', ({ code, res }) => {
    expect(mobile.emmErrors(code)).toEqual(res)
  })
  it.each`
    modem                                 | sim          | esim         | res
    ${{}}                                 | ${'2'}       | ${'1'}       | ${'2 (eSIM1)'}
    ${{}}                                 | ${'1'}       | ${undefined} | ${'1'}
    ${{ active_sim: 2, esim_profile: 1 }} | ${'1'}       | ${undefined} | ${'1'}
    ${{ active_sim: 2, esim_profile: 2 }} | ${undefined} | ${undefined} | ${'2 (eSIM2)'} | ${{ active_sim: 1, esim_profile: 1, builtin: false, name: 'External modem' }} | ${undefined} | ${undefined} | ${'1 (eSIM1) (External modem)'}
  `('returns SIM and modem labels #%#', ({ modem, sim, esim, res }) => {
    expect(mobile.getSimModemLabel(modem, sim, esim)).toEqual(res)
  })
  it.each`
    band                      | modem                             | res
    ${'LTE B1'}               | ${{ id: '3-1', ntype: 'LTE' }}    | ${'LTE B1'}
    ${{ band: 'LTE B4' }}     | ${{ id: '3-1', ntype: 'LTE' }}    | ${'LTE B4'}
    ${'WCDMA 2100'}           | ${{ id: '3-1', ntype: 'WCDMA' }}  | ${'B1 - WCDMA 2100'}
    ${''}                     | ${{ id: '3-1', ntype: 'WCDMA' }}  | ${'N/A'}
    ${{ band: 'WCDMA 1900' }} | ${{ id: '3-1', ntype: 'WCDMA' }}  | ${'B2 - WCDMA 1900'}
    ${{ band: '5G N41' }}     | ${{ id: '3-1', ntype: '5g-nsa' }} | ${'5G n41'}
  `('returns band name #%#', ({ band, modem, res }) => {
    expect(mobile.getBandName(band, modem)).toEqual(res)
  })
  it.each`
    modem                                                              | simText | res
    ${{ id: '3-1', pinstate: 'Required PIN', pinleft: 3 }}             | ${'1'}  | ${{ unlockText: 'Unlock SIM', message: 'SIM1 is locked, please provide PIN code to unlock, 3 attempts left.' }}
    ${{ id: '3-1', pinstate: 'Required PIN', pinleft: 0 }}             | ${'1'}  | ${{}}
    ${{ id: '3-1', pinstate: 'Required PUK', pinleft: 0, pukleft: 6 }} | ${'2'}  | ${{ unlockText: 'Unblock SIM', message: 'SIM2 is blocked, please provide PUK code to unblock, 6 attempts left.' }}
    ${{ id: '3-1', pinstate: 'Required PUK', pinleft: 0, pukleft: 0 }} | ${'2'}  | ${{ message: 'SIM2 is permanently blocked, 0 attempts left for PUK code.' }}
    ${{ id: '3-1', pinstate: 'Required PUK', pinleft: 0, pukleft: 5 }} | ${'2'}  | ${{ message: 'SIM2 is blocked, please insert another or unblock current SIM card using other device.' }}
  `('returns PIN/PUK message #%#', ({ modem, simText, res }) => {
    expect(mobile.getPinPukMessage(modem, simText)).toEqual(res)
  })
  it.each`
    errorId      | res
    ${1}         | ${'Failed to download profile, fatal error.'}
    ${2}         | ${'Failed to download profile, not supported.'}
    ${10}        | ${'Failed to download profile, eSIM busy.'}
    ${15}        | ${'Failed to download profile, SIM card error.'}
    ${16}        | ${'Failed to download profile'}
    ${undefined} | ${'Failed to download profile'}
  `('returns translated failed to download eSIM profile message #%#', ({ errorId, res }) => {
    expect(mobile.getFailedEsimMessage(errorId)).toEqual(res)
  })
  it.each`
    code     | res
    ${'8'}   | ${'Operator determined barring'}
    ${'114'} | ${'Unknown'}
  `('returns ESM error when $code', ({ code, res }) => {
    expect(mobile.esmErrors(code)).toEqual(res)
  })
  it.each`
    code     | res
    ${'0'}   | ${'No cause'}
    ${'112'} | ${'Unknown'}
  `('returns 5GMM error when $code', ({ code, res }) => {
    expect(mobile.fivegmmErrors(code)).toEqual(res)
  })
  it.each`
    band    | fiveG    | res
    ${1}    | ${false} | ${'2100'}
    ${34}   | ${true}  | ${'2100'}
    ${34}   | ${false} | ${'2000'}
    ${70}   | ${true}  | ${'2000'}
    ${70}   | ${false} | ${'1700'}
    ${255}  | ${true}  | ${'1600'}
    ${255}  | ${false} | ${'5800'}
    ${9999} | ${false} | ${'N/A'}
  `('returns 4G/5G frequency when band - $band', ({ band, fiveG, res }) => {
    expect(mobile.lte5gBandToFrequency(band, fiveG)).toEqual(res)
  })
  it.each`
    frequency | res
    ${'2100'} | ${'1'}
    ${'800'}  | ${'20'}
    ${'J800'} | ${'6'}
    ${'850'}  | ${'5'}
    ${'J850'} | ${'19'}
    ${'4000'} | ${'N/A'}
  `('returns 3G band when frequency - $frequency', ({ frequency, res }) => {
    expect(mobile.umtsFrequencyToBand(frequency)).toEqual(res)
  })
  it.each`
    digit | res
    ${1}  | ${'Auto'}
    ${2}  | ${'No service'}
    ${3}  | ${'2G'}
    ${7}  | ${'3G'}
    ${20} | ${'4G'}
    ${22} | ${'5G'}
    ${39} | ${'LTE/NR5G'}
    ${40} | ${'Unknown'}
  `('returns network type when digit - $digit', ({ digit, res }) => {
    expect(mobile.getNetworkType(digit)).toEqual(res)
  })
  it.each`
    modem                                                           | res
    ${{ id: '3-1', cell_info: [{ ue_state: 2 }, { ue_state: 3 }] }} | ${true}
    ${{ id: '3-1', cell_info: [{ ue_state: 3 }] }}                  | ${false}
    ${{ id: '3-1', cell_info: [] }}                                 | ${false}
    ${{ id: '3-1' }}                                                | ${false}
  `('returns if modem is camping on an emergency cell #%#', ({ modem, res }) => {
    expect(mobile.limitedService(modem)).toEqual(res)
  })
  it.each`
    modem                            | dual_modem | res
    ${{ id: '3-1', builtin: true }}  | ${true}    | ${true}
    ${{ id: '3-1', builtin: true }}  | ${false}   | ${false}
    ${{ id: '3-1', builtin: false }} | ${false}   | ${true}
    ${{ id: '3-1' }}                 | ${false}   | ${false}
  `('returns if modem name needs to be shown #%#', ({ modem, dual_modem, res }) => {
    mobile.store = { board: { hwinfo: { dual_modem } } }
    expect(mobile.shouldShowModemName(modem)).toEqual(res)
  })
  it.each`
    modem                                                  | res
    ${{ id: '3-1', pinstate: 'PIN', pinleft: 3 }}          | ${true}
    ${{ id: '3-1', pinstate: 'PIN required', pinleft: 1 }} | ${true}
    ${{ id: '3-1', pinstate: 'PIN required', pinleft: 0 }} | ${false}
    ${{ id: '3-1', pinstate: 'PUK required', pinleft: 3 }} | ${false}
  `('returns if it should allow SIM unlock (PIN) #%#', ({ modem, res }) => {
    expect(mobile.shouldAllowSimUnlock(modem)).toEqual(res)
  })
  it.each`
    modem                     | res
    ${{ id: '3-1', mode: 3 }} | ${true}
    ${{ id: '3-1', mode: 1 }} | ${false}
    ${{ id: '3-1', mode: 0 }} | ${false}
    ${{ id: '3-1' }}          | ${false}
  `('returns if modem is in low power mode #%#', ({ modem, res }) => {
    expect(mobile.modemLowPower(modem)).toEqual(res)
  })
  it.each`
    modem                                                  | res
    ${{ id: '3-1', pinstate: 'PUK', pinleft: 0 }}          | ${true}
    ${{ id: '3-1', pinstate: 'PUK required', pinleft: 0 }} | ${true}
    ${{ id: '3-1', pinstate: 'PUK required', pinleft: 1 }} | ${false}
    ${{ id: '3-1', pinstate: 'PIN required', pinleft: 0 }} | ${false}
  `('returns if PUK code is required #%#', ({ modem, res }) => {
    expect(mobile.requiresPuk(modem)).toEqual(res)
  })
  it.each`
    modem                                                              | res
    ${{ id: '3-1', pinstate: 'PUK', pinleft: 0, pukleft: 6 }}          | ${true}
    ${{ id: '3-1', pinstate: 'PUK required', pinleft: 0, pukleft: 5 }} | ${false}
    ${{ id: '3-1', pinstate: 'PUK required', pinleft: 1, pukleft: 6 }} | ${false}
    ${{ id: '3-1', pinstate: 'PIN required', pinleft: 0 }}             | ${false}
  `('returns if it should allow SIM unblock (PUK) #%#', ({ modem, res }) => {
    expect(mobile.shouldAllowSimUnblock(modem)).toEqual(res)
  })
  it.each`
    rssi    | lte      | res
    ${-69}  | ${false} | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-70}  | ${false} | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-85}  | ${false} | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-86}  | ${false} | ${{ value: 'Fair', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-100} | ${false} | ${{ value: 'Fair', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-101} | ${false} | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor', customContextColor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor' }}
    ${-109} | ${false} | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor', customContextColor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor' }}
    ${-110} | ${false} | ${{ value: 'Very poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
    ${-64}  | ${true}  | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-65}  | ${true}  | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-75}  | ${true}  | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-76}  | ${true}  | ${{ value: 'Fair', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-85}  | ${true}  | ${{ value: 'Fair', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-86}  | ${true}  | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor', customContextColor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor' }}
    ${-95}  | ${true}  | ${{ value: 'Very poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
    ${-96}  | ${true}  | ${{ value: 'Very poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
  `('returns RSSI value with meaning when RSSI: $rssi and LTE: $lte', ({ rssi, lte, res }) => {
    const result = mobile.rssiValue(rssi, lte)
    expect(result).toEqual(res)
  })
  it.each`
    ecio   | res
    ${0}   | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-6}  | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-7}  | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-10} | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-11} | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor', customContextColor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor' }}
    ${-20} | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor', customContextColor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor' }}
  `('returns EC/IO value with meaning when EC/IO: $ecio', ({ ecio, res }) => {
    const result = mobile.ecioValue(ecio)
    expect(result).toEqual(res)
  })
  it.each`
    rscp    | res
    ${0}    | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-60}  | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-61}  | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-75}  | ${{ value: 'Fair', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-76}  | ${{ value: 'Fair', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-85}  | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor', customContextColor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor' }}
    ${-86}  | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-poor text-theme-text-on-status-poor', customContextColor: 'bg-theme-bg-status-poor-subtle text-theme-text-on-status-poor-subtle border-theme-border-status-poor' }}
    ${-95}  | ${{ value: 'Very poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
    ${-96}  | ${{ value: 'Very poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
    ${-124} | ${{ value: 'Very poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
  `('returns RSCP value with meaning when RSCP: $rscp', ({ rscp, res }) => {
    const result = mobile.rscpValue(rscp)
    expect(result).toEqual(res)
  })
  it.each`
    rsrp    | res
    ${-79}  | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-80}  | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-81}  | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-89}  | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-90}  | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-91}  | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-100} | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
    ${-101} | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
  `('returns RSRP value with meaning when RSRP: $rsrp', ({ rsrp, res }) => {
    const result = mobile.rsrpValue(rsrp)
    expect(result).toEqual(res)
  })
  it.each`
    rsrq   | res
    ${-9}  | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-10} | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${-11} | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-14} | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${-15} | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-19} | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${-20} | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
    ${-21} | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
  `('returns RSRQ value with meaning when RSRQ: $rsrq', ({ rsrq, res }) => {
    const result = mobile.rsrqValue(rsrq)
    expect(result).toEqual(res)
  })
  it.each`
    sinr  | res
    ${21} | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${20} | ${{ value: 'Excellent', customColor: 'bg-theme-bg-status-good text-theme-text-on-status-good', customContextColor: 'bg-theme-bg-status-good-subtle text-theme-text-on-status-good-subtle border-theme-border-status-good' }}
    ${19} | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${14} | ${{ value: 'Good', customColor: 'bg-theme-bg-status-positive text-theme-text-on-status-positive', customContextColor: 'bg-theme-bg-status-positive-subtle text-theme-text-on-status-positive-subtle border-theme-border-status-positive' }}
    ${13} | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${1}  | ${{ value: 'Fair to poor', customColor: 'bg-theme-bg-status-fair text-theme-text-on-status-fair', customContextColor: 'bg-theme-bg-status-fair-subtle text-theme-text-on-status-fair-subtle border-theme-border-status-fair' }}
    ${0}  | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
    ${-1} | ${{ value: 'Poor', customColor: 'bg-theme-bg-status-bad text-theme-text-on-status-bad', customContextColor: 'bg-theme-bg-status-bad-subtle text-theme-text-on-status-bad-subtle border-theme-border-status-bad' }}
  `('returns SINR value with meaning when SINR: $sinr', ({ sinr, res }) => {
    const result = mobile.sinrValue(sinr)
    expect(result).toEqual(res)
  })
  it.each`
    modem                          | res
    ${{ id: '3-1', offline: '1' }} | ${true}
    ${{ id: '3-1', offline: '0' }} | ${false}
    ${{ id: '3-1' }}               | ${false}
  `('returns if modem is offline #%#', ({ modem, res }) => {
    expect(mobile.modemOffline(modem)).toEqual(res)
  })
  it.each`
    modem                                                     | res
    ${{ id: '3-1', wwan_gnss_conflict: true, gnss_state: 1 }} | ${true}
    ${{ id: '3-1', wwan_gnss_conflict: true, gnss_state: 0 }} | ${false}
    ${{ id: '3-1' }}                                          | ${false}
  `('returns if modem is has WWAN GNSS Conflict and GPS is on #%#', ({ modem, res }) => {
    expect(mobile.getGnssState(modem)).toEqual(res)
  })
  it.each`
    modem                            | res
    ${{ id: '3-1', ntype: 'WCDMA' }} | ${true}
    ${{ id: '3-1', ntype: 'HSDPA' }} | ${true}
    ${{ id: '3-1', ntype: 'HSUPA' }} | ${true}
    ${{ id: '3-1', ntype: 'HSPA' }}  | ${true}
    ${{ id: '3-1', ntype: 'UMTS' }}  | ${true}
    ${{ id: '3-1', ntype: 'GSM' }}   | ${false}
  `('returns if modem connected to 3G #%#', ({ modem, res }) => {
    expect(mobile.connectedTo3g(modem)).toEqual(res)
  })
  it.each`
    modem                           | res
    ${{ id: '3-1', ntype: 'LTE' }}  | ${true}
    ${{ id: '3-1', ntype: 'CAT' }}  | ${true}
    ${{ id: '3-1', ntype: 'NB' }}   | ${true}
    ${{ id: '3-1', ntype: 'EMTC' }} | ${true}
    ${{ id: '3-1', ntype: 'GSM' }}  | ${false}
  `('returns if modem connected to 4G #%#', ({ modem, res }) => {
    expect(mobile.connectedTo4g(modem)).toEqual(res)
  })
  it.each`
    modem                             | res
    ${{ id: '3-1', ntype: '5G-SA' }}  | ${true}
    ${{ id: '3-1', ntype: '5G-NSA' }} | ${false}
    ${{ id: '3-1', ntype: 'GSM' }}    | ${false}
  `('returns if modem connected to 5G SA #%#', ({ modem, res }) => {
    expect(mobile.connectedTo5gSa(modem)).toEqual(res)
  })
  it.each`
    modem                             | res
    ${{ id: '3-1', ntype: '5G-NSA' }} | ${true}
    ${{ id: '3-1', ntype: '5G-SA' }}  | ${false}
    ${{ id: '3-1', ntype: 'GSM' }}    | ${false}
  `('returns if modem connected to 5G NSA #%#', ({ modem, res }) => {
    expect(mobile.connectedTo5gNsa(modem)).toEqual(res)
  })
  it.each`
    modem                             | res
    ${{ id: '3-1', ntype: '5G-NSA' }} | ${true}
    ${{ id: '3-1', ntype: '5G-SA' }}  | ${true}
    ${{ id: '3-1', ntype: 'GSM' }}    | ${false}
  `('returns if modem connected to 5G #%#', ({ modem, res }) => {
    expect(mobile.connectedTo5g(modem)).toEqual(res)
  })
  it.each`
    modem                             | res
    ${{ id: '3-1', ntype: '5G-NSA' }} | ${true}
    ${{ id: '3-1', ntype: 'LTE' }}    | ${true}
    ${{ id: '3-1', ntype: 'GSM' }}    | ${false}
  `('returns if modem connected to 4G/5G #%#', ({ modem, res }) => {
    expect(mobile.connectedTo4g5g(modem)).toEqual(res)
  })
  it.each`
    modems                                                                                           | modemId    | short        | res
    ${[{ id: '3-1', builtin: true, primary: true }]}                                                 | ${'3-1'}   | ${false}     | ${'Internal modem'}
    ${[{ id: '3-1', builtin: false, primary: true }]}                                                | ${'3-1'}   | ${false}     | ${'External modem'}
    ${[{ id: '3-1', builtin: true, primary: true }, { id: '1-1.2', builtin: true, primary: false }]} | ${'3-1'}   | ${false}     | ${'Primary modem'}
    ${[{ id: '3-1', builtin: true, primary: true }, { id: '1-1.2', builtin: true, primary: false }]} | ${'1-1.2'} | ${false}     | ${'Secondary modem'}
    ${[{ id: '3-1', builtin: false, primary: true }]}                                                | ${'1-1.2'} | ${undefined} | ${'Unknown modem'}
    ${[{ id: '3-1', builtin: true, primary: true }]}                                                 | ${'3-1'}   | ${true}      | ${'Internal'}
    ${[{ id: '3-1', builtin: false, primary: true }]}                                                | ${'1-1.2'} | ${true}      | ${'Unknown'}
  `('returns modem name #%#', ({ modems, modemId, short, res }) => {
    expect(mobile.createModemName(modems, modemId, short)).toEqual(res)
  })
  it.each`
    modems                              | modemId  | res
    ${[{ id: '3-1', builtin: true }]}   | ${'3-1'} | ${{ id: '3-1', builtin: true }}
    ${[{ id: '1-1.2', builtin: true }]} | ${'3-1'} | ${{}}
    ${[]}                               | ${'3-1'} | ${{}}
  `('returns found modem by id from store #%#', ({ modems, modemId, res }) => {
    mobile.store = { modemList: modems, board: { modems } }
    expect(mobile.getModemById(modemId)).toEqual(res)
  })
  it.each`
    modems                                                          | res
    ${[{ id: '3-1', sim_count: 2 }, { id: '1-1.2', sim_count: 3 }]} | ${3}
    ${[{ id: '3-1', sim_count: 1 }, { id: '1-1', sim_count: 0 }]}   | ${1}
    ${[{ id: '3-1', simcount: 1 }, { id: '1-1', simcount: 2 }]}     | ${2}
    ${[]}                                                           | ${0}
  `('returns maximum SIM count between all modems #%#', ({ modems, res }) => {
    expect(mobile.simCount(modems)).toEqual(res)
  })
  it('returns modem list as option array', () => {
    expect(
      mobile.modemsOptions([
        { id: '1-2', name: 'External modem', builtin: false, index: 1 },
        { id: '3-1', name: 'Primary modem', builtin: true, primary: 1 },
        { id: '1-3', name: 'External modem', builtin: false, index: 2 },
        { id: '1-1.2', name: 'Secondary modem', builtin: true, primary: 0 }
      ])
    ).toEqual([
      ['3-1', 'Primary modem'],
      ['1-2', 'External modem 1'],
      ['1-3', 'External modem 2'],
      ['1-1.2', 'Secondary modem']
    ])
  })

  it.each`
    modems                                                                                                                                                                                | res
    ${[{ id: '3-1', name: 'Internal modem', shortName: 'Internal', operator: 'Bite', provider: 'Bite', operator_state: 'Searching', builtin: true }]}                                     | ${[{ id: '3-1', name: 'Internal modem', shortName: 'Internal', operator: 'Bite', provider: 'Bite', operator_state: 'Searching', builtin: true }]}
    ${[{ id: '3-1', name: 'Internal modem', shortName: 'Internal', operator: '000 000', provider: '000 000', operator_state: 'Searching', cell_info: [{ ue_state: 2 }], builtin: true }]} | ${[{ id: '3-1', name: 'Internal modem', shortName: 'Internal', operator: 'N/A', provider: 'N/A', operator_state: 'Limited service', cell_info: [{ ue_state: 2 }], builtin: true }]}
  `('returns parsed modem list #%#', ({ modems, res }) => {
    expect(mobile.parseModems(modems)).toEqual(res)
  })
  it.each`
    sim  | modem                                                        | dual_modem | res
    ${1} | ${{ id: '3-1', builtin: true, simcount: 1, primary: true }}  | ${false}   | ${1}
    ${1} | ${{ id: '3-1', builtin: true, simcount: 1, primary: true }}  | ${true}    | ${1}
    ${1} | ${{ id: '3-1', builtin: true, simcount: 2, primary: true }}  | ${true}    | ${1}
    ${2} | ${{ id: '3-1', builtin: true, simcount: 2, primary: false }} | ${true}    | ${4}
    ${2} | ${{ id: '3-1', builtin: true, simcount: 2, primary: true }}  | ${true}    | ${3}
    ${1} | ${{ id: '3-1', builtin: true, simcount: 2, primary: false }} | ${true}    | ${2}
    ${2} | ${{ id: '3-1', builtin: true, simcount: 2, primary: false }} | ${true}    | ${4}
    ${5} | ${{ id: '3-1', builtin: true, simcount: 2, primary: false }} | ${true}    | ${5}
  `('returns adjusted SIM number #%#', ({ sim, modem, dual_modem, res }) => {
    mobile.getModemById = vi.fn().mockReturnValueOnce(modem)
    mobile.store = { board: { hwinfo: { dual_modem } } }
    expect(mobile.adjustSimNumber(sim, modem.id)).toEqual(res)
  })
  it.each`
    sim          | esim         | modemId      | withoutParentheses | res
    ${'2'}       | ${'1'}       | ${undefined} | ${false}           | ${'2 (eSIM1)'}
    ${'1'}       | ${undefined} | ${'3-1'}     | ${false}           | ${1}
    ${'2'}       | ${'1'}       | ${'3-1'}     | ${true}            | ${'2, eSIM1'}
    ${undefined} | ${undefined} | ${'3-1'}     | ${true}            | ${undefined}
  `('returns SIM label #%#', ({ sim, esim, modemId, withoutParentheses, res }) => {
    mobile.adjustSimNumber = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    expect(mobile.getSimLabel(sim, esim, modemId, withoutParentheses)).toEqual(res)
  })
  it.each`
    modemList                       | modemId      | res
    ${[{ id: '3-1', simcount: 2 }]} | ${'3-1'}     | ${[['1', 'SIM1'], ['2', 'SIM2']]}
    ${[{ id: '3-1', simcount: 2 }]} | ${undefined} | ${[['1', 'SIM1'], ['2', 'SIM2']]}
    ${[]}                           | ${undefined} | ${[]}
    ${[{ id: '3-1', simcount: 2 }]} | ${'1-1.2'}   | ${[]}
  `('returns SIM card options #%#', ({ modemList, modemId, res }) => {
    mobile.adjustSimNumber = vi.fn().mockImplementation(value => {
      return value || 'N/A'
    })
    expect(mobile.getModemSimCardOptions(modemList, modemId)).toEqual(res)
  })
})
