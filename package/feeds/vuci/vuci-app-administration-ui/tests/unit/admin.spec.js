import Admin from '../../src/views/system/Admin.vue'
import AdminSection from '@/components/system/AdminSection.vue'
import createWrapper from '@tests/unit/mockFactory'
const installedLanguages = [
  {
    name: 'Español',
    code: 'es'
  },
  {
    name: '日本語',
    code: 'ja'
  },
  {
    name: 'Português',
    code: 'pt'
  },
  {
    name: 'Türkçe',
    code: 'tr'
  },
  {
    name: 'Deutsch',
    code: 'de'
  },
  {
    name: 'Українська',
    code: 'ua'
  }
]
describe('Admin.vue', () => {
  it.each`
    actionName     | label
    ${'reboot'}    | ${'Reboot'}
    ${'default'}   | ${"User's defaults configuration"}
    ${'firstboot'} | ${'Factory defaults configuration'}
  `('returns "$label" when buttonName: $actionName"', ({ actionName, label }) => {
    const wrapper = createWrapper(Admin, {
      global: {
        stubs: { AdminSection: { template: '<div />' } },
        mocks: {
          $store: {
            getters: {
              isSwitch: () => {
                return false
              }
            }
          }
        }
      }
    })
    const result = wrapper.vm.parseActionLabels(actionName)
    expect(result).toBe(label)
  })
  describe('Tests validation', () => {
    it.each`
      max   | min   | enabled | expected
      ${10} | ${5}  | ${'1'}  | ${true}
      ${5}  | ${10} | ${'1'}  | ${false}
      ${5}  | ${5}  | ${'1'}  | ${false}
      ${5}  | ${10} | ${'0'}  | ${true}
    `('returns $expected when max: $max, min: $min', ({ max, min, enabled, expected }) => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      const result = wrapper.vm.lowerThanMaxValidate(min, { uciSection: { max, enabled } })
      expect(result.isValid).toBe(expected)
    })
    it.each`
      max   | min   | enabled | expected
      ${10} | ${5}  | ${'1'}  | ${true}
      ${5}  | ${10} | ${'1'}  | ${false}
      ${5}  | ${5}  | ${'1'}  | ${false}
      ${5}  | ${10} | ${'0'}  | ${true}
    `('returns $expected when max: $max, min: $min', ({ max, min, enabled, expected }) => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      const result = wrapper.vm.higherThanMinValidate(max, { uciSection: { min, enabled } })
      expect(result.isValid).toBe(expected)
    })
    it.each`
      currentInterval           | otherInterval             | expected
      ${{ min: '0', max: '5' }} | ${{ min: '6', max: '8' }} | ${false}
      ${{ min: '0', max: '5' }} | ${{ min: '1', max: '3' }} | ${true}
      ${{ min: '0', max: '5' }} | ${{ min: '2', max: '6' }} | ${true}
      ${{ min: '', max: '5' }}  | ${{ min: '2', max: '6' }} | ${false}
      ${{ min: '0', max: '5' }} | ${{ min: '', max: '6' }}  | ${false}
    `('returns $expected when one interval: $currentInterval, other interval: $otherInterval"', ({ currentInterval, otherInterval, expected }) => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      const result = wrapper.vm.intervalsOverlap(currentInterval, otherInterval)
      expect(result).toBe(expected)
    })
    it.each`
      rowCount | failOnRows   | expectValid | enabled | expectMessage
      ${0}     | ${[]}        | ${true}     | ${'0'}  | ${undefined}
      ${0}     | ${[]}        | ${true}     | ${'1'}  | ${''}
      ${10}    | ${[]}        | ${true}     | ${'1'}  | ${''}
      ${10}    | ${[2]}       | ${false}    | ${'1'}  | ${'Overlaps with interval [2:2]'}
      ${10}    | ${[2, 3, 5]} | ${false}    | ${'1'}  | ${'Overlaps with interval [2:2]\nOverlaps with interval [3:3]\nOverlaps with interval [5:5]'}
      ${10}    | ${[2, 3, 6]} | ${false}    | ${'1'}  | ${'Overlaps with interval [2:2]\nOverlaps with interval [3:3]\nOverlaps with interval [6:6]'}
    `('returns {isValid: $expectValid, message: "$expectMessage"} when fails on rows: $failOnRows', ({ rowCount, failOnRows, expectValid, enabled, expectMessage }) => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      const rows = Array.from(Array(rowCount), (_, i) => ({ min: i, max: i }))
      wrapper.vm.intervalsOverlap = vi.fn((_, otherIntervalText) => {
        return failOnRows.includes(otherIntervalText.min)
      })
      wrapper.vm.findOtherRows = vi.fn()
      wrapper.vm.findOtherRows.mockReturnValue(rows)
      const currentRow = { min: 100, max: 100, enabled }
      const result = wrapper.vm.noOverlapValidate(undefined, { uciSection: currentRow, vuciForm: { uciData: { buttons: rows } } })
      expect(result.isValid).toBe(expectValid)
      expect(result.message).toEqual(expectMessage)
    })
    it.each`
      rowCount | disabledRowCount | placeInRows
      ${10}    | ${0}             | ${0}
      ${10}    | ${2}             | ${5}
      ${10}    | ${3}             | ${10}
      ${0}     | ${0}             | ${0}
    `(
      'returns other rows when there is $rowCount other rows (and $disabledRowCount of them are disabled) and element to remove has index: $placeInRows',
      ({ rowCount, disabledRowCount, placeInRows }) => {
        const wrapper = createWrapper(Admin, {
          global: {
            stubs: { AdminSection: { template: '<div />' } },
            mocks: {
              $store: {
                getters: {
                  isSwitch: () => {
                    return false
                  }
                }
              }
            }
          }
        })
        const enabledRows = Array.from(Array(rowCount - disabledRowCount), (_, i) => ({ min: i, max: i, enabled: '1' }))
        const disabledRows = Array.from(Array(disabledRowCount), (_, i) => ({ min: i, max: i, enabled: '0' }))
        const rows = [...enabledRows, ...disabledRows]
        const currentRow = { min: 100, max: 100 }
        const rowsWithCurrent = [...rows]
        rowsWithCurrent.splice(placeInRows, 0, currentRow)
        const result = wrapper.vm.findOtherRows(currentRow, rowsWithCurrent)
        expect(result).toEqual(enabledRows)
      }
    )
  })
  it('commits devicename to store', async () => {
    const wrapper = createWrapper(Admin, {
      global: {
        stubs: { AdminSection: { template: '<div />' } },
        mocks: {
          $store: {
            getters: {
              isSwitch: () => {
                return false
              }
            }
          }
        },
        $analytics: {
          state: {}
        }
      }
    })
    wrapper.vm.onAfterSave(null, { data: { devicename: 'router' } })
    expect(wrapper.vm.$store.setDeviceName).toHaveBeenCalledWith('router')
  })
  describe('loadLanguages()', () => {
    it('shows error when request throws error', async () => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      wrapper.vm.$axios.get = vi.fn().mockRejectedValue()
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadLanguages({ settings: [{ id: 'general', lang: 'en' }] })
      expect(spyError).toHaveBeenCalledWith('An unexpected error occurred')
    })
    it('shows errors when success false', async () => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ success: false })
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadLanguages({ settings: [{ id: 'general', lang: 'en' }] })
      expect(spyError).toHaveBeenCalledWith('Failed to load installed languages')
    })
    it("doesn't show error when request doesn't throw error", async () => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      wrapper.vm.$axios.bulkGet = vi.fn().mockResolvedValueOnce([{ success: true }, { success: true }])
      const spyError = vi.spyOn(wrapper.vm.$message, 'error')
      await wrapper.vm.loadLanguages({ settings: [{ id: 'general', lang: 'en' }] })
      expect(spyError).not.toHaveBeenCalled()
    })
    it('puts data in currentLanguages', async () => {
      const wrapper = createWrapper(Admin, {
        global: {
          stubs: { AdminSection: { template: '<div />' } },
          mocks: {
            $store: {
              getters: {
                isSwitch: () => {
                  return false
                }
              }
            }
          }
        }
      })
      const currLangData = [
        { name: 'Deutsch', code: 'de' },
        { name: 'English', code: 'en' }
      ]
      wrapper.vm.$axios.get = vi.fn().mockResolvedValueOnce({ data: currLangData, success: true })
      await wrapper.vm.loadLanguages({ settings: [{ id: 'general', lang: 'en' }] })
      expect(wrapper.vm.installedLanguages).toEqual(currLangData)
    })
  })
})

describe('AdminSection.vue', () => {
  it('returns language options with data', () => {
    const wrapper = createWrapper(AdminSection, {
      global: {
        stubs: {
          'vuci-form-item-select': { template: '<div />' },
          'vuci-named-section': { template: '<div />' }
        }
      },
      props: {
        uciData: {
          settings: [{ id: 'general' }]
        },
        title: 'Test',
        installedLanguages: [
          { code: 'en', name: 'English' },
          { code: 'ru', name: 'Русский' }
        ],
        defaultLanguage: 'en'
      }
    })
    expect(wrapper.vm.languageOptions).toEqual([
      ['en', 'English'],
      ['ru', 'Русский']
    ])
  })
  it('returns language packages', () => {
    const wrapper = createWrapper(AdminSection, {
      global: {
        stubs: {
          'vuci-form-item-select': { template: '<div />' },
          'vuci-named-section': { template: '<div />' }
        }
      },
      props: {
        uciData: { settings: [{ id: 'general' }] },
        title: 'Test',
        installedLanguages: [{ code: 'ru', name: 'Русский' }],
        defaultLanguage: 'en'
      },
      data() {
        return {
          allLanguages: installedLanguages
        }
      }
    })
    expect(wrapper.vm.languagePackages).toEqual([
      ['es', 'Español'],
      ['ja', '日本語'],
      ['pt', 'Português'],
      ['tr', 'Türkçe'],
      ['de', 'Deutsch'],
      ['ua', 'Українська']
    ])
  })
  it('returns all languages', () => {
    const wrapper = createWrapper(AdminSection, {
      global: {
        stubs: {
          'vuci-form-item-select': { template: '<div />' },
          'vuci-named-section': { template: '<div />' }
        }
      },
      props: {
        uciData: {
          settings: [{ id: 'general' }]
        },
        title: 'Test',
        installedLanguages: [],
        defaultLanguage: 'en'
      },
      data() {
        return {
          allLanguages: installedLanguages
        }
      }
    })
    expect(wrapper.vm.languages).toEqual([
      ['es', 'Español'],
      ['ja', '日本語'],
      ['pt', 'Português'],
      ['tr', 'Türkçe'],
      ['de', 'Deutsch'],
      ['ua', 'Українська']
    ])
  })
  it('invokes error message when after save fails', async () => {
    const wrapper = createWrapper(AdminSection, {
      global: {
        stubs: {
          'vuci-form-item-select': { template: '<div />' },
          'vuci-named-section': { template: '<div />' }
        }
      },
      props: {
        uciData: {
          settings: [{ id: 'general', lang: 'en' }]
        },
        title: 'Test',
        installedLanguages: [{}],
        defaultLanguage: 'en'
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$menu.loadMenu = vi.fn().mockResolvedValueOnce({})
    wrapper.vm.$i18n.loadLang = vi.fn().mockResolvedValueOnce({})
    wrapper.vm.$analytics = { enable: vi.fn(), disable: vi.fn() }
    await wrapper.vm.onAfterSave(undefined, { data: { advanced: '1' } })
    expect(spy).not.toHaveBeenCalledWith('Failed to update webui settings')
  })
  it('invokes error message when after save fails', async () => {
    const wrapper = createWrapper(AdminSection, {
      global: {
        stubs: {
          'vuci-form-item-select': { template: '<div />' },
          'vuci-named-section': { template: '<div />' }
        }
      },
      props: {
        uciData: {
          settings: [{ id: 'general', lang: 'en' }]
        },
        title: 'Test',
        installedLanguages: [{}],
        defaultLanguage: 'en'
      }
    })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    wrapper.vm.$menu.loadMenu = vi.fn().mockRejectedValueOnce({})
    await wrapper.vm.onAfterSave(undefined, { data: { advanced: '0' } })
    expect(spy).toHaveBeenCalledWith('Failed to update webui settings')
  })

  it.each`
    result
    ${false}
    ${true}
  `('tests packagesReadAccess', ({ result }) => {
    const wrapper = createWrapper(AdminSection, {
      global: {
        stubs: {
          'vuci-form-item-select': { template: '<div />' },
          'vuci-named-section': { template: '<div />' }
        }
      }
    })
    wrapper.vm.$session.hasAccess = vi.fn().mockReturnValue(result)
    expect(wrapper.vm.packagesReadAccess).toEqual(result)
  })
  it.each`
    option           | installedLanguages                  | result
    ${{ key: 'en' }} | ${[{ code: 'en' }]}                 | ${false}
    ${{ key: 'en' }} | ${[{ code: 'de' }]}                 | ${true}
    ${{ key: 'en' }} | ${[{ code: 'de' }, { code: 'en' }]} | ${false}
    ${{ key: 'en' }} | ${[]}                               | ${true}
  `('tests isInstalled', ({ option, installedLanguages, result }) => {
    const wrapper = createWrapper(AdminSection, {
      global: {
        stubs: {
          'vuci-form-item-select': { template: '<div />' },
          'vuci-named-section': { template: '<div />' }
        }
      },
      props: {
        installedLanguages
      }
    })
    expect(wrapper.vm.isInstalled(option)).toEqual(result)
  })
})
