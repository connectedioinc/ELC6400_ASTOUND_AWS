import { defineComponent } from 'vue'
import Rating from '../../src/components/status/Rating.vue'
import createWrapper from '@tests/unit/mockFactory'
const scannedDevices24GHz = [
  {
    ssid: 'test2_4',
    band: '2.4GHz',
    channel: 1,
    ht_operation: {
      channel_width: 2040
    }
  },
  {
    ssid: 'test',
    band: '2.4GHz',
    channel: 5,
    ht_operation: {
      channel_width: 40
    }
  }
]
const scannedDevices5GHz = [
  {
    ssid: 'test5',
    band: '5GHz',
    channel: 36,
    vht_operation: {
      channel_width: 80
    }
  },
  {
    ssid: 'test2',
    band: '5GHz',
    channel: 60
  }
]

describe('Rating.vue', () => {
  let wrapper
  beforeEach(() => {
    wrapper = createWrapper(Rating, {
      global: {
        stubs: {
          TltCard: defineComponent({
            template: `<div></div>`
          })
        }
      },
      props: {
        radioDevices: ['radio0', 'radio1'],
        scanned: {
          scannedDevices24GHz,
          scannedDevices5GHz
        }
      }
    })
  })

  describe('method updateRadio()', () => {
    it.each`
      option      | res
      ${'2.4GHz'} | ${[{ checked: true, name: '2.4GHz' }, { checked: false, name: '5GHz' }]}
      ${'5GHz'}   | ${[{ checked: false, name: '2.4GHz' }, { checked: true, name: '5GHz' }]}
    `('updates marked radio button when selected filter is $option', ({ option, res }) => {
      wrapper.vm.updateRadio(option)
      expect(wrapper.vm.selectedBand).toBe(option)
      expect(wrapper.vm.selected).toEqual(res)
    })
  })

  it.each`
    selectedBand | res
    ${'2.4GHz'}  | ${[{ channel: 1, occurrence: 1, rating: 0 }, { channel: 5, occurrence: 1, rating: 0 }, { channel: 2, occurrence: 0, rating: 100 }, { channel: 3, occurrence: 0, rating: 100 }, { channel: 4, occurrence: 0, rating: 100 }, { channel: 6, occurrence: 0, rating: 100 }, { channel: 7, occurrence: 0, rating: 100 }, { channel: 8, occurrence: 0, rating: 100 }, { channel: 9, occurrence: 0, rating: 100 }, { channel: 10, occurrence: 0, rating: 100 }, { channel: 11, occurrence: 0, rating: 100 }, { channel: 12, occurrence: 0, rating: 100 }, { channel: 13, occurrence: 0, rating: 100 }, { channel: 14, occurrence: 0, rating: 100 }]}
    ${'5GHz'}    | ${[{ channel: 36, occurrence: 1, rating: 0 }, { channel: 60, occurrence: 1, rating: 0 }, { channel: 40, occurrence: 0, rating: 100 }, { channel: 44, occurrence: 0, rating: 100 }, { channel: 48, occurrence: 0, rating: 100 }, { channel: 52, occurrence: 0, rating: 100 }, { channel: 56, occurrence: 0, rating: 100 }, { channel: 64, occurrence: 0, rating: 100 }, { channel: 68, occurrence: 0, rating: 100 }, { channel: 72, occurrence: 0, rating: 100 }, { channel: 76, occurrence: 0, rating: 100 }, { channel: 80, occurrence: 0, rating: 100 }, { channel: 84, occurrence: 0, rating: 100 }, { channel: 88, occurrence: 0, rating: 100 }, { channel: 92, occurrence: 0, rating: 100 }, { channel: 96, occurrence: 0, rating: 100 }, { channel: 100, occurrence: 0, rating: 100 }, { channel: 104, occurrence: 0, rating: 100 }, { channel: 108, occurrence: 0, rating: 100 }, { channel: 112, occurrence: 0, rating: 100 }, { channel: 116, occurrence: 0, rating: 100 }, { channel: 120, occurrence: 0, rating: 100 }, { channel: 124, occurrence: 0, rating: 100 }, { channel: 128, occurrence: 0, rating: 100 }, { channel: 132, occurrence: 0, rating: 100 }, { channel: 136, occurrence: 0, rating: 100 }, { channel: 140, occurrence: 0, rating: 100 }, { channel: 144, occurrence: 0, rating: 100 }, { channel: 148, occurrence: 0, rating: 100 }, { channel: 152, occurrence: 0, rating: 100 }, { channel: 156, occurrence: 0, rating: 100 }, { channel: 160, occurrence: 0, rating: 100 }, { channel: 164, occurrence: 0, rating: 100 }]}
  `('computes channel occurrences when selected band filter is $selectedBand', async ({ selectedBand, res }) => {
    await wrapper.setData({ selectedBand })
    expect(wrapper.vm.getChannelOccurrences()).toEqual(res)
  })

  describe('method getRating()', () => {
    it.each`
      record                            | maxAccessPoints | result
      ${{ channel: 1, occurrence: 5 }}  | ${10}           | ${[1, 1, 1, 0, 0]}
      ${{ channel: 5, occurrence: 15 }} | ${20}           | ${[1, 1, 0, 0, 0]}
      ${{ channel: 6, occurrence: 45 }} | ${50}           | ${[1, 0, 0, 0, 0]}
    `('gets channel rating when record is $record and max AP is $maxAccessPoints', ({ record, maxAccessPoints, result }) => {
      wrapper.vm.maxAccessPoints = maxAccessPoints
      const res = wrapper.vm.getRating(record)
      expect(res).toEqual(result)
    })
  })
})
