import HotspotGroups from '../../src/views/services/HotspotGroupEdit.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('hotspot group edit tests', () => {
  it('returns day options', () => {
    const wrapper = createWrapper(HotspotGroups, {
      props: {
        section: {
          id: 'test'
        }
      }
    })
    expect(wrapper.vm.dayOptions()).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28'
    ])
  })
  it('returns hour options', () => {
    const wrapper = createWrapper(HotspotGroups, {
      props: {
        section: {
          id: 'test'
        }
      }
    })
    expect(wrapper.vm.hourOptions()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', ['0', '24']])
  })
})
