import Wireless from '../../../src/views/status/Wireless.vue'
import createWrapper from '@tests/unit/mockFactory'
import cardStub from '@tests/unit/VuciFormStub.vue'
import { wireless } from '@/plugins/wireless'
describe('network', () => {
  describe('status', () => {
    describe('Wireless.vue', () => {
      const wrapperOptions = {
        global: {
          stubs: {
            'tlt-overview-card-type': cardStub
          },
          mocks: {
            $wireless: {
              getParsedClients: wireless.getParsedClients,
              getName: wireless.getName
            }
          }
        }
      }
      let wrapper
      beforeEach(async () => {
        wrapper = await createWrapper(Wireless, wrapperOptions)
      })
      it('returns all parsed interfaces', () => {
        wrapper.vm.deviceStatus = [{ id: 'radio0' }]
        const data = [
          {
            devices: [
              {
                name: 'radio0',
                signal: 0,
                quality: 0,
                band: '2.4GHz'
              }
            ]
          },
          {
            ssid: 'RUT951_7D84',
            status: '0',
            mode: 'sta',
            encryption: 'WPA2 PSK (TKIP, CCMP)',
            devices: [
              {
                name: 'radio0',
                band: '2.4GHz',
                quality: 65
              }
            ]
          }
        ]
        const parsedData = [
          {
            content: [
              {
                info: '-',
                title: 'Standard',
                name: 'standard',
                config: {}
              },
              {
                info: '-',
                title: 'Mode',
                name: 'mode'
              },
              {
                info: '-',
                title: 'Encryption',
                name: 'encryption'
              },
              {
                info: '-',
                title: 'Clients',
                name: 'num_assoc'
              }
            ],
            mode: '-',
            signal: 0,
            standard: '-',
            title: '-',
            text: '0% (2.4GHz)',
            type: 'wifi',
            showSignal: true,
            devices: [
              {
                band: '2.4GHz',
                name: 'radio0',
                quality: 0,
                signal: 0
              }
            ]
          },
          {
            content: [
              {
                info: '-',
                title: 'Standard',
                name: 'standard',
                config: {}
              },
              {
                info: '-',
                title: 'Mode',
                name: 'mode'
              },
              {
                info: 'WPA2 PSK (TKIP, CCMP)',
                title: 'Encryption',
                name: 'encryption'
              },
              {
                info: '-',
                title: 'Clients',
                name: 'num_assoc'
              }
            ],
            encryption: 'WPA2 PSK (TKIP, CCMP)',
            mode: '-',
            signal: 65,
            ssid: 'RUT951_7D84',
            standard: '-',
            status: '0',
            title: 'RUT951_7D84',
            text: '65% (2.4GHz)',
            type: 'wifi',
            showSignal: true,
            devices: [
              {
                band: '2.4GHz',
                name: 'radio0',
                quality: 65
              }
            ]
          }
        ]
        wrapper.vm.wifiInterfaceStatus = data
        const result = wrapper.vm.parsedInterfaceStatus
        expect(result).toEqual(parsedData)
      })
      it.each`
        selectedInterfaces                        | expectedResult
        ${[{ ssid: 'rutx11', wifi_id: 'wifi1' }]} | ${true}
        ${[{ ssid: 'rutx11', wifi_id: 'wifi2' }]} | ${false}
      `('checkSelected(). checks whether provided interface is selected when selected interfaces are $selectedInterfaces', ({ selectedInterfaces, expectedResult }) => {
        const iface = { ssid: 'rutx11', wifi_id: 'wifi1' }
        wrapper.vm.selectedInterfaces = selectedInterfaces
        const res = wrapper.vm.checkSelected(iface)
        expect(res).toBe(expectedResult)
      })
      it.each`
        iface                                   | expectedResult
        ${{ ssid: 'rutx11', wifi_id: 'wifi0' }} | ${-1}
        ${{ ssid: 'rutx11', wifi_id: 'wifi1' }} | ${0}
        ${{ ssid: 'rutx11', wifi_id: 'wifi2' }} | ${1}
      `('getSelectedIndex(). gets selected interface index when selected interfaces are $selectedInterfaces', ({ iface, expectedResult }) => {
        wrapper.vm.selectedInterfaces = [
          { ssid: 'rutx11', wifi_id: 'wifi1' },
          { ssid: 'rutx11', wifi_id: 'wifi2' }
        ]
        const res = wrapper.vm.getSelectedIndex(iface)
        expect(res).toBe(expectedResult)
      })
      describe('selectInterface()', () => {
        it('selects interface', () => {
          const iface = { ssid: 'rutx11', wifi_id: 'wifi1', mode: 'Access Point' }
          wrapper.vm.selectInterface(iface)
          expect(wrapper.vm.selectedInterfaces.some(siface => siface.wifi_id === iface.wifi_id)).toBeTruthy()
        })
        it('removes selected interface', () => {
          const iface = { ssid: 'rutx11', wifi_id: 'wifi1', mode: 'Access Point' }
          wrapper.vm.selectedInterfaces = [{ ssid: 'rutx11', wifi_id: 'wifi2', mode: 'Access Point' }, iface]
          wrapper.vm.selectInterface(iface)
          expect(wrapper.vm.selectedInterfaces).toEqual([{ ssid: 'rutx11', wifi_id: 'wifi2', mode: 'Access Point' }])
        })
      })
      describe('getDevices()', () => {
        it('displays error when request fails', async () => {
          wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
          const spy = vi.spyOn(wrapper.vm.$message, 'error')
          await wrapper.vm.getDevices()
          expect(spy).toHaveBeenCalled()
        })
        it('loads data on success', async () => {
          const data = {
            success: true,
            data: [
              {
                enabled: '1',
                ssid: 'RUT955',
                encryption: 'psk2',
                device: 'radio0',
                mode: 'ap',
                key: 'test1234'
              }
            ]
          }

          wrapper.vm.$axios.get = vi.fn().mockResolvedValue(data)
          await wrapper.vm.getDevices()
          expect(wrapper.vm.wifiInterfaceConfig).toEqual(data.data)
        })
      })
      describe('getStatus()', () => {
        it("doesn't show error when request doesn't throw error", async () => {
          wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue([
            { success: true, data: [] },
            { success: true, data: [] },
            { success: true, data: [] }
          ])
          const spy = vi.spyOn(wrapper.vm.$message, 'error')
          await wrapper.vm.getStatus()
          expect(spy).not.toHaveBeenCalled()
        })
        it('shows error when request throws error', async () => {
          wrapper.vm.$axios.bulkGet = vi.fn().mockRejectedValue()
          const spy = vi.spyOn(wrapper.vm.$message, 'error')
          await wrapper.vm.getStatus()
          expect(spy).toHaveBeenCalled()
        })
        it('loads data', async () => {
          const data = [
            {
              success: true,
              data: [
                {
                  id: 'default_radio0',
                  ifname: 'wlan0-1',
                  encryption: 'WPA2 PSK (TKIP, CCMP)',
                  vht_supported: false,
                  clients: [],
                  devices: [
                    {
                      name: 'radio0'
                    }
                  ]
                }
              ]
            },
            {
              success: true,
              data: [
                {
                  id: 'radio1',
                  devices: [
                    {
                      name: 'radio1',
                      channel: 11
                    }
                  ]
                }
              ]
            },
            {
              success: true,
              data: [
                {
                  id: 'lan',
                  up: true
                }
              ]
            }
          ]
          wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValue(data)
          await wrapper.vm.getStatus()
          expect(wrapper.vm.wifiInterfaceStatus).toEqual(data[0].data)
          expect(wrapper.vm.deviceStatus).toEqual(data[1].data)
          expect(wrapper.vm.interfaceStatus).toEqual(data[2].data)
        })
      })
    })
  })
})
