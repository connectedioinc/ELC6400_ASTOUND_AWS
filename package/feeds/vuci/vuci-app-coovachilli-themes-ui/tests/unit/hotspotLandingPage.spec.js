import HotspotLandingpage from '../../src/views/services/HotspotLandingpage.vue'
import createWrapper from '@tests/unit/mockFactory'

describe('HotspotLandingPage.vue', () => {
  it('returns theme options', () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: [
              { name: 'test', id: 'test' },
              { name: 'test2', id: 'test2' },
              { name: 'test3', id: 'test3' }
            ]
          }
        }
      }
    })
    const val = wrapper.vm.themeOptions
    expect(val).toEqual([
      ['test', 'test'],
      ['test2', 'test2'],
      ['test3', 'test3']
    ])
  })
  it('returns api request array for all existing themes', () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    const form = {
      themes: [
        { name: 'test', id: 'test' },
        { name: 'test2', id: 'test2' },
        { name: 'test3', id: 'test3' }
      ]
    }
    const val = wrapper.vm.generateRequests(form)
    const response = ['/api/hotspot/themes/options', '/api/hotspot/images/config/test', '/api/hotspot/images/config/test2', '/api/hotspot/images/config/test3']
    expect(val).toEqual(response)
  })
  it.each([
    ['when type is style', 'style', [{ file: 'landing_page.css' }]],
    ['when type isnt style', 'test', [{ file: 'test' }, { file: 'test2' }]]
  ])('Returns file names: %s', (text, type, response) => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    const file = [{ file: 'landing_page.css' }, { file: 'test' }, { file: 'test2' }]
    const val = wrapper.vm.fileFilter(file, type)
    expect(val).toEqual(response)
  })
  it('returns mapped file api requests', () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    const file = [{ file: 'landing_page.css' }, { file: 'test.html' }, { file: 'test2.html' }]
    const themes = [{ id: 'test' }]
    wrapper.vm.generateFileRequests(file, themes)
    expect(wrapper.vm.themeRequests).toEqual(['/api/hotspot/themes/test/config/css', '/api/hotspot/themes/test/config/test.', '/api/hotspot/themes/test/config/test2.'])
  })
  it('returns base file value', () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    expect(wrapper.vm.error('t', 'a')).toEqual('')
  })
  const t = [
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: false,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    },
    {
      success: true,
      data: []
    }
  ]

  it.each([
    [
      { landingPage: [{ theme: 'default' }], themes: [{ id: 'default' }] },
      [
        { success: true, data: [{ file_name: 'file1' }] },
        { success: true, data: [] }
      ],
      t,
      {
        default_themeImage: [
          { id: 'default_Logo', type: 'file', path: '', file_name: 'Logo', file_path: '<%=logo%>', name: 'logo.svg' },
          { id: 'default_Favicon', type: 'file', file_name: 'Favicon', file_path: '<%=favicon%>', name: 'favicon.svg' },
          { id: 'default_Background', type: 'file', path: '', file_name: 'Background', file_path: '<%=background%>', name: 'background.svg' },
          { id: 'default_Loading', type: 'file', path: '', file_name: 'Loading', file_path: '<%=loading%>', name: 'loading.gif' }
        ],
        style: [],
        views: [{ file_name: 'file1' }],
        'default-css': [[]],
        'default-header': [[]],
        'default-login': [[]],
        'default-login_mac': '',
        'default-otp_login': [[]],
        'default-signup': [[]],
        'default-otp_signup': [[]],
        'default-success': [[]],
        'default-access_denied': [[]],
        'default-tos': [[]],
        'default-login_sso': [[]]
      }
    ],
    [
      { landingPage: [{ theme: 'default' }], themes: [{ id: 'default' }] },
      [
        { success: false, data: [] },
        { success: false, data: [] }
      ],
      t,
      {
        style: [],
        views: [],
        'default-css': [[]],
        'default-header': [[]],
        'default-login': [[]],
        'default-login_mac': '',
        'default-otp_login': [[]],
        'default-signup': [[]],
        'default-otp_signup': [[]],
        'default-success': [[]],
        'default-access_denied': [[]],
        'default-tos': [[]],
        'default-login_sso': [[]]
      }
    ]
  ])('load data', async (form, data, secondData, response) => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    wrapper.vm.generateRequests = vi.fn()
    wrapper.vm.generateRequests.mockReturnValue(['/api/hotspot/themes', 't'])
    wrapper.vm.generateFileRequests = vi.fn()
    wrapper.vm.generateFileRequests.mockReturnValue()
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(data)
    wrapper.vm.themeRequests = ['t', 'a', 'b', 'c', 'd', 'a', 'g', 'd', 'd', 't', 's']
    wrapper.vm.themeNames = ['default']
    wrapper.vm.$axios.bulkGet.mockResolvedValueOnce(secondData)
    const val = JSON.parse(JSON.stringify(await wrapper.vm.loadData(form))) // remove __ob__
    expect(val).toEqual(response)
  })
  it('invokes error message', async () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    wrapper.vm.$axios.bulkGet = vi.fn()
    wrapper.vm.$axios.bulkGet.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.loadData({ themes: [{ id: 'default' }] })
    expect(spy).toHaveBeenCalledWith('Failed to load data')
  })
  it('displays prompt', async () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    wrapper.vm.uciData = {
      id: 'theme_id_1'
    }
    wrapper.vm.$axios.delete = vi.fn()
    wrapper.vm.$axios.delete.mockRejectedValueOnce({})
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.deleteTheme('theme_id_1')
    expect(spy).toHaveBeenCalledTimes(1)
  })
  it('invokes onOk function', async () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    wrapper.vm.uciData = {
      id: 'theme_id_1'
    }
    wrapper.vm.$axios.delete = vi.fn()
    wrapper.vm.$axios.delete.mockRejectedValueOnce({})
    wrapper.vm.onOk = vi.fn()

    const spy1 = vi.spyOn(wrapper.vm.$prompt, 'show')

    await wrapper.vm.deleteTheme(wrapper.vm.uciData)
    await wrapper.vm.onOk(wrapper.vm.uciData)
    expect(spy1).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.onOk).toHaveBeenCalledTimes(1)
  })
  it.each`
    test                      | themeData                                                        | promptTitle                                                  | promptContent
    ${'custom theme prompt'}  | ${{ name: 'Custom Theme 1', id: 'custom_theme_1', custom: '1' }} | ${`Are you sure you want to delete "Custom Theme 1" theme?`} | ${`"Custom Theme 1" theme will be removed.`}
    ${'package theme prompt'} | ${{ name: 'Theme 1', id: 'theme_1' }}                            | ${`Remove "Hotspot landing page Theme 1" package?`}          | ${`Once you remove the package, it will delete additional software from the device. A package can be re-installed to the device.`}
  `('$test', async ({ themeData, promptTitle, promptContent }) => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      },
      global: {
        mocks: {
          $prompt: {
            title: promptTitle,
            content: promptContent,
            okText: 'Delete',
            cancelText: 'Cancel',
            onOk: () => {},
            show: () => {}
          }
        }
      }
    })
    wrapper.vm.$axios.delete = vi.fn()
    wrapper.vm.$axios.delete.mockRejectedValueOnce({})
    wrapper.vm.onOk = vi.fn()
    const spy = vi.spyOn(wrapper.vm.$prompt, 'show')
    await wrapper.vm.deleteTheme(themeData)
    expect(spy).toHaveBeenCalled()
  })
  it("doesn't show error when delete request does not fail", async () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          },
          uciData: {
            id: 'theme_id_1'
          }
        }
      }
    })
    wrapper.vm.$utils.downloadFileApi = vi.fn()
    wrapper.vm.$utils.downloadFileApi.mockResolvedValueOnce({ data: {} })
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.downloadTheme('theme_id_1')
    expect(spy).not.toHaveBeenCalled()
  })
  it('shows error when request throws error', async () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })

    wrapper.vm.$utils.downloadFileApi = vi.fn()
    wrapper.vm.$utils.downloadFileApi.mockRejectedValueOnce()
    const spy = vi.spyOn(wrapper.vm.$message, 'error')
    await wrapper.vm.downloadTheme()
    expect(spy).toHaveBeenCalled()
  })
  it('after package upload', async () => {
    const wrapper = createWrapper(HotspotLandingpage, {
      data() {
        return {
          formData: {
            themes: []
          }
        }
      }
    })
    wrapper.vm.$refs.uploader.resetInput = vi.fn()
    wrapper.vm.$refs.section.reloadData = vi.fn()
    wrapper.vm.$refs.vuciForm.updateUciData = vi.fn()
    const spy1 = vi.spyOn(wrapper.vm.$refs.uploader, 'resetInput')
    const data = {
      res: {
        success: true
      }
    }
    await wrapper.vm.afterPackageUpload(data)
    expect(spy1).toHaveBeenCalledTimes(1)
    vi.clearAllMocks()
  })
})
