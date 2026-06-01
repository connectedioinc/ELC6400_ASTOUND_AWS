import MobileModemStatus from '../../src/components/network/MobileModemStatus.vue'
import createWrapper from '@tests/unit/mockFactory'
import { mobile } from '@/plugins/mobile'

describe('MobileModemStatus.vue', () => {
  it.each`
    sim                                     | modem                                   | res
    ${{ position: '1' }}                    | ${{ active_sim: 1 }}                    | ${true}
    ${{ position: '2' }}                    | ${{ active_sim: 1 }}                    | ${false}
    ${{ position: '2', esim_profile: '2' }} | ${{ active_sim: 2, esim_profile: '1' }} | ${false}
    ${{ position: '2', esim_profile: '1' }} | ${{ active_sim: 2, esim_profile: '1' }} | ${true}
  `('check if current SIM is active #%#', ({ sim, modem, res }) => {
    const wrapper = createWrapper(MobileModemStatus, {
      props: {
        simSlots: [],
        modemStatus: modem,
        simcards: [],
        hintInfo: () => {}
      },
      global: {
        stubs: {
          ListLayout: { template: '<div />' }
        }
      }
    })
    expect(wrapper.vm.checkActiveSim(sim)).toEqual(res)
  })
  it.each`
    sim                                     | simcards                                                              | modem                                                 | res
    ${{ position: '1' }}                    | ${[{ position: '1', primary: '1' }]}                                  | ${{ active_sim: 1 }}                                  | ${true}
    ${{ position: '2' }}                    | ${[{ position: '1', primary: '1' }, { position: '2', primary: '0' }]} | ${{ active_sim: 1 }}                                  | ${false}
    ${{ position: '2', esim_profile: '2' }} | ${[{ position: '1' }]}                                                | ${{ active_sim: 2, esim_profile: '1', primary: '1' }} | ${false}
    ${{ position: '2', esim_profile: '1' }} | ${[{ position: '2', esim_profile: '1', primary: '1' }]}               | ${{ active_sim: 2, esim_profile: '1' }}               | ${true}
  `('check if current SIM is default #%#', ({ sim, simcards, modem, res }) => {
    const wrapper = createWrapper(MobileModemStatus, {
      props: {
        simSlots: [],
        modemStatus: modem,
        simcards: simcards,
        hintInfo: () => {}
      },
      global: {
        stubs: {
          ListLayout: { template: '<div />' }
        }
      }
    })
    expect(wrapper.vm.checkDefaultSim(sim)).toEqual(res)
  })
  it.each`
    sim                                   | res
    ${{ position: '1' }}                  | ${1}
    ${{ position: '2', esim_profile: 1 }} | ${1}
  `('returns updated SIM/eSIM number #%#', ({ sim, res }) => {
    const wrapper = createWrapper(MobileModemStatus, {
      props: {
        simSlots: [],
        modemStatus: [],
        simcards: [],
        hintInfo: () => {}
      },
      global: {
        stubs: {
          ListLayout: { template: '<div />' }
        }
      }
    })
    mobile.adjustSimNumber = vi.fn().mockReturnValue(1)
    expect(wrapper.vm.simNumber(sim)).toEqual(res)
  })
  it.each`
    id        | enable   | res
    ${'cfg1'} | ${false} | ${''}
    ${'cfg2'} | ${true}  | ${'cfg2'}
  `('check if updates selectedSim with checked SIM ID #%#', ({ id, enable, simcards, res }) => {
    const wrapper = createWrapper(MobileModemStatus, {
      props: {
        simSlots: [],
        modemStatus: [],
        simcards: simcards,
        hintInfo: () => {},
        selectable: enable
      },
      global: {
        stubs: {
          ListLayout: { template: '<div />' }
        }
      }
    })
    wrapper.vm.updateRadio(id)
    expect(wrapper.vm.selectedSim).toEqual(res)
  })
})
