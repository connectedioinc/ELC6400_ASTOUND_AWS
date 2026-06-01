import GroupEdit from '../../src/views/system/GroupEdit.vue'
import createWrapper from '@tests/unit/mockFactory'
import { capitalize } from '@ui-core/plugins/helper'

const menus = [
  {
    path: '/status',
    title: 'Status',
    meta: {
      route: [
        {
          title: 'Status',
          path: '/status'
        }
      ]
    },
    children: [
      {
        path: '/status/overview',
        title: 'Overview',
        meta: {
          route: [
            {
              title: 'Status',
              path: '/status'
            },
            {
              title: 'Overview',
              path: '/status/overview'
            }
          ]
        }
      },
      {
        path: '/status/system',
        title: 'System',
        meta: {
          route: [
            {
              title: 'Status',
              path: '/status'
            },
            {
              title: 'System',
              path: '/status/system'
            }
          ]
        }
      }
    ]
  },
  {
    path: '/network',
    meta: {
      route: [
        {
          title: 'Network',
          path: '/network'
        }
      ]
    },
    title: 'Network',
    children: [
      {
        path: '/network/mobile',
        title: 'Mobile',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            }
          ]
        },
        children: [
          {
            path: '/network/mobile/general',
            title: 'General',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'General',
                  path: '/network/mobile/general'
                }
              ]
            },
            children: [
              {
                path: '/network/mobile/general/cfg01aa0e',
                acls: ['network/mobile/general'],
                title: 'SIM1',
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'General',
                      path: '/network/mobile/general'
                    },
                    {
                      title: 'SIM1',
                      path: '/network/mobile/general/cfg01aa0e'
                    }
                  ]
                }
              },
              {
                path: '/network/mobile/general/cfg02aa0e',
                acls: ['network/mobile/general'],
                title: 'SIM2',
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'General',
                      path: '/network/mobile/general'
                    },
                    {
                      title: 'SIM2',
                      path: '/network/mobile/general/cfg02aa0e'
                    }
                  ]
                }
              }
            ]
          },
          {
            path: '/network/mobile/sim_switch',
            acls: ['network/mobile/sim_switch'],
            title: 'SIM Switch',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'SIM Switch',
                  path: '/network/mobile/sim_switch'
                }
              ]
            },
            children: [
              {
                path: '/network/mobile/sim_switch/cfg01aa0e',
                title: 'SIM1',
                acls: ['network/mobile/sim_switch'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'SIM Switch',
                      path: '/network/mobile/sim_switch'
                    },
                    {
                      title: 'SIM1',
                      path: '/network/mobile/sim_switch/cfg01aa0e'
                    }
                  ]
                }
              },
              {
                path: '/network/mobile/sim_switch/cfg02aa0e',
                title: 'SIM2',
                acls: ['network/mobile/sim_switch'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'SIM Switch',
                      path: '/network/mobile/sim_switch'
                    },
                    {
                      title: 'SIM2',
                      path: '/network/mobile/sim_switch/cfg02aa0e'
                    }
                  ]
                }
              }
            ]
          },
          {
            path: '/network/mobile/operators',
            title: 'Network Selection',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'Network Selection',
                  path: '/network/mobile/operators'
                }
              ]
            },
            children: [
              {
                path: '/network/mobile/operators/scan',
                title: 'Network Selection',
                acls: ['network/mobile/operators/scan'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'Network Selection',
                      path: '/network/mobile/operators'
                    },
                    {
                      title: 'Network Selection',
                      path: '/network/mobile/operators/scan'
                    }
                  ]
                }
              },
              {
                path: '/network/mobile/operators/list',
                title: 'Operator Lists',
                acls: ['network/mobile/operators/list'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'Network Selection',
                      path: '/network/mobile/operators'
                    },
                    {
                      title: 'Operator Lists',
                      path: '/network/mobile/operators/list'
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        path: '/network/lan',
        title: 'LAN',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'LAN',
              path: '/network/lan'
            }
          ]
        }
      }
    ]
  },
  {
    path: '/services/mobile_utilities/sms_messages/send',
    title: 'Send Messages',
    meta: {
      route: [
        {
          title: 'Services',
          path: '/services'
        },
        {
          title: 'Mobile Utilities',
          path: '/services/mobile_utilities'
        },
        {
          title: 'Messages',
          path: '/services/mobile_utilities/sms_messages'
        },
        {
          title: 'Send Messages',
          path: '/services/mobile_utilities/sms_messages/send'
        }
      ]
    }
  }
]

describe('GroupEdit.vue', () => {
  let mocks
  let mocksRutx
  let wrapper
  beforeEach(() => {
    mocks = {
      $capitalize: capitalize,
      $store: {
        device: '',
        board: {
          hwinfo: {
            mobile: false
          }
        },
        menus
      }
    }
    mocksRutx = {
      $store: {
        device: '',
        board: {
          hwinfo: {
            mobile: true
          }
        },
        menus
      }
    }
    wrapper = createWrapper(GroupEdit, { props: { section: {} }, global: { mocks } })
    wrapper.vm.modem = false
  })
  it('converts acl paths to select options', () => {
    wrapper.vm.noAclPaths('services/hotspot/general/userscripts')
    wrapper.vm.noAclPaths('system/reboot')
    expect(wrapper.vm.aclOptions).toEqual([
      ['*', 'All pages'],
      ['status', 'Status'],
      ['status/overview', 'Status > Overview'],
      ['status/system', 'Status > System'],
      ['status/widget', 'Status > Widget'],
      ['network', 'Network'],
      ['network/mobile', 'Network > Mobile'],
      ['network/mobile/general', 'Network > Mobile > General'],
      ['network/mobile/sim_switch', 'Network > Mobile > SIM Switch'],
      ['network/mobile/operators', 'Network > Mobile > Network Selection'],
      ['network/mobile/operators/scan', 'Network > Mobile > Network Selection > Network Selection'],
      ['network/mobile/operators/list', 'Network > Mobile > Network Selection > Operator Lists'],
      ['network/lan', 'Network > LAN'],
      ['services/mobile_utilities/sms_messages/send', 'Services > Mobile Utilities > Messages > Send Messages'],
      ['services/hotspot/general/userscripts', 'Services > Hotspot > General > Userscripts'],
      ['system/reboot', 'System > Reboot']
    ])
  })
  it('checks if custom paths are included in acl paths', () => {
    wrapper = createWrapper(GroupEdit, { props: { section: {} }, global: { mocksRutx } })
    const customPaths = wrapper.vm.customPaths.map(path => path.name || path)
    const paths = wrapper.vm.allAclPaths.map(path => path.name)
    for (const path of customPaths) {
      expect(paths.includes(path)).toBeTruthy()
    }
  })
  it('gets acl paths from menu tree', () => {
    expect(wrapper.vm.getAclPaths(menus)).toEqual([
      {
        name: 'status',
        acls: ['status'],
        crumbs: [
          {
            name: 'Status',
            path: '/status'
          }
        ],
        title: 'Status'
      },
      {
        name: 'status/overview',
        acls: ['status/overview'],
        crumbs: [
          {
            name: 'Status',
            path: '/status'
          },
          {
            name: 'Overview',
            path: '/status/overview'
          }
        ],
        title: 'Overview'
      },
      {
        name: 'status/system',
        acls: ['status/system'],
        crumbs: [
          {
            name: 'Status',
            path: '/status'
          },
          {
            name: 'System',
            path: '/status/system'
          }
        ],
        title: 'System'
      },
      {
        name: 'network',
        acls: ['network'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          }
        ],
        title: 'Network'
      },
      {
        name: 'network/mobile',
        acls: ['network/mobile'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          }
        ],
        title: 'Mobile'
      },
      {
        name: 'network/mobile/general',
        acls: ['network/mobile/general'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'General',
            path: '/network/mobile/general'
          }
        ],
        title: 'General'
      },
      {
        name: 'network/mobile/general/cfg01aa0e',
        acls: ['network/mobile/general'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'General',
            path: '/network/mobile/general'
          },
          {
            name: 'SIM1',
            path: '/network/mobile/general/cfg01aa0e'
          }
        ],
        title: 'SIM1'
      },
      {
        name: 'network/mobile/general/cfg02aa0e',
        acls: ['network/mobile/general'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'General',
            path: '/network/mobile/general'
          },
          {
            name: 'SIM2',
            path: '/network/mobile/general/cfg02aa0e'
          }
        ],
        title: 'SIM2'
      },
      {
        name: 'network/mobile/sim_switch',
        acls: ['network/mobile/sim_switch'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'SIM Switch',
            path: '/network/mobile/sim_switch'
          }
        ],
        title: 'SIM Switch'
      },
      {
        name: 'network/mobile/sim_switch/cfg01aa0e',
        acls: ['network/mobile/sim_switch'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'SIM Switch',
            path: '/network/mobile/sim_switch'
          },
          {
            name: 'SIM1',
            path: '/network/mobile/sim_switch/cfg01aa0e'
          }
        ],
        title: 'SIM1'
      },
      {
        name: 'network/mobile/sim_switch/cfg02aa0e',
        acls: ['network/mobile/sim_switch'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'SIM Switch',
            path: '/network/mobile/sim_switch'
          },
          {
            name: 'SIM2',
            path: '/network/mobile/sim_switch/cfg02aa0e'
          }
        ],
        title: 'SIM2'
      },
      {
        name: 'network/mobile/operators',
        acls: ['network/mobile/operators'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'Network Selection',
            path: '/network/mobile/operators'
          }
        ],
        title: 'Network Selection'
      },
      {
        name: 'network/mobile/operators/scan',
        acls: ['network/mobile/operators/scan'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'Network Selection',
            path: '/network/mobile/operators'
          },
          {
            name: 'Network Selection',
            path: '/network/mobile/operators/scan'
          }
        ],
        title: 'Network Selection'
      },
      {
        name: 'network/mobile/operators/list',
        acls: ['network/mobile/operators/list'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'Mobile',
            path: '/network/mobile'
          },
          {
            name: 'Network Selection',
            path: '/network/mobile/operators'
          },
          {
            name: 'Operator Lists',
            path: '/network/mobile/operators/list'
          }
        ],
        title: 'Operator Lists'
      },
      {
        name: 'network/lan',
        acls: ['network/lan'],
        crumbs: [
          {
            name: 'Network',
            path: '/network'
          },
          {
            name: 'LAN',
            path: '/network/lan'
          }
        ],
        title: 'LAN'
      },
      {
        name: 'services/mobile_utilities/sms_messages/send',
        acls: ['services/mobile_utilities/sms_messages/send'],
        crumbs: [
          {
            name: 'Services',
            path: '/services'
          },
          {
            name: 'Mobile Utilities',
            path: '/services/mobile_utilities'
          },
          {
            name: 'Messages',
            path: '/services/mobile_utilities/sms_messages'
          },
          {
            name: 'Send Messages',
            path: '/services/mobile_utilities/sms_messages/send'
          }
        ],
        title: 'Send Messages'
      }
    ])
  })
  it('inserts path into acl paths array', () => {
    const aclPaths = [
      { name: 'test', acls: ['test'] },
      { name: 'test/test1', acls: ['test/test1'] },
      { name: 'status', acls: ['status'] },
      { name: 'status/test', acls: ['status/test'] }
    ]
    const paths = ['test/asdf', 'status/test/test']
    for (const path of paths) {
      wrapper.vm.insertPath(aclPaths, path)
    }
    expect(aclPaths).toEqual([
      { name: 'test', acls: ['test'] },
      { name: 'test/test1', acls: ['test/test1'] },
      { name: 'test/asdf', acls: ['test/asdf'] },
      { name: 'status', acls: ['status'] },
      { name: 'status/test', acls: ['status/test'] },
      { name: 'status/test/test', acls: ['status/test/test'] }
    ])
  })
  it('traverses tree in preorder', () => {
    expect(Array.from(wrapper.vm.menuIterator(menus))).toEqual([
      {
        path: '/status',
        title: 'Status',
        meta: {
          route: [
            {
              title: 'Status',
              path: '/status'
            }
          ]
        },
        children: [
          {
            path: '/status/overview',
            title: 'Overview',
            meta: {
              route: [
                {
                  title: 'Status',
                  path: '/status'
                },
                {
                  title: 'Overview',
                  path: '/status/overview'
                }
              ]
            }
          },
          {
            path: '/status/system',
            title: 'System',
            meta: {
              route: [
                {
                  title: 'Status',
                  path: '/status'
                },
                {
                  title: 'System',
                  path: '/status/system'
                }
              ]
            }
          }
        ]
      },
      {
        path: '/status/overview',
        title: 'Overview',
        meta: {
          route: [
            {
              title: 'Status',
              path: '/status'
            },
            {
              title: 'Overview',
              path: '/status/overview'
            }
          ]
        }
      },
      {
        path: '/status/system',
        title: 'System',
        meta: {
          route: [
            {
              title: 'Status',
              path: '/status'
            },
            {
              title: 'System',
              path: '/status/system'
            }
          ]
        }
      },
      {
        path: '/network',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            }
          ]
        },
        title: 'Network',
        children: [
          {
            path: '/network/mobile',
            title: 'Mobile',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                }
              ]
            },
            children: [
              {
                path: '/network/mobile/general',
                title: 'General',
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'General',
                      path: '/network/mobile/general'
                    }
                  ]
                },
                children: [
                  {
                    path: '/network/mobile/general/cfg01aa0e',
                    acls: ['network/mobile/general'],
                    title: 'SIM1',
                    meta: {
                      route: [
                        {
                          title: 'Network',
                          path: '/network'
                        },
                        {
                          title: 'Mobile',
                          path: '/network/mobile'
                        },
                        {
                          title: 'General',
                          path: '/network/mobile/general'
                        },
                        {
                          title: 'SIM1',
                          path: '/network/mobile/general/cfg01aa0e'
                        }
                      ]
                    }
                  },
                  {
                    path: '/network/mobile/general/cfg02aa0e',
                    acls: ['network/mobile/general'],
                    title: 'SIM2',
                    meta: {
                      route: [
                        {
                          title: 'Network',
                          path: '/network'
                        },
                        {
                          title: 'Mobile',
                          path: '/network/mobile'
                        },
                        {
                          title: 'General',
                          path: '/network/mobile/general'
                        },
                        {
                          title: 'SIM2',
                          path: '/network/mobile/general/cfg02aa0e'
                        }
                      ]
                    }
                  }
                ]
              },
              {
                path: '/network/mobile/sim_switch',
                acls: ['network/mobile/sim_switch'],
                title: 'SIM Switch',
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'SIM Switch',
                      path: '/network/mobile/sim_switch'
                    }
                  ]
                },
                children: [
                  {
                    path: '/network/mobile/sim_switch/cfg01aa0e',
                    title: 'SIM1',
                    acls: ['network/mobile/sim_switch'],
                    meta: {
                      route: [
                        {
                          title: 'Network',
                          path: '/network'
                        },
                        {
                          title: 'Mobile',
                          path: '/network/mobile'
                        },
                        {
                          title: 'SIM Switch',
                          path: '/network/mobile/sim_switch'
                        },
                        {
                          title: 'SIM1',
                          path: '/network/mobile/sim_switch/cfg01aa0e'
                        }
                      ]
                    }
                  },
                  {
                    path: '/network/mobile/sim_switch/cfg02aa0e',
                    title: 'SIM2',
                    acls: ['network/mobile/sim_switch'],
                    meta: {
                      route: [
                        {
                          title: 'Network',
                          path: '/network'
                        },
                        {
                          title: 'Mobile',
                          path: '/network/mobile'
                        },
                        {
                          title: 'SIM Switch',
                          path: '/network/mobile/sim_switch'
                        },
                        {
                          title: 'SIM2',
                          path: '/network/mobile/sim_switch/cfg02aa0e'
                        }
                      ]
                    }
                  }
                ]
              },
              {
                path: '/network/mobile/operators',
                title: 'Network Selection',
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'Network Selection',
                      path: '/network/mobile/operators'
                    }
                  ]
                },
                children: [
                  {
                    path: '/network/mobile/operators/scan',
                    title: 'Network Selection',
                    acls: ['network/mobile/operators/scan'],
                    meta: {
                      route: [
                        {
                          title: 'Network',
                          path: '/network'
                        },
                        {
                          title: 'Mobile',
                          path: '/network/mobile'
                        },
                        {
                          title: 'Network Selection',
                          path: '/network/mobile/operators'
                        },
                        {
                          title: 'Network Selection',
                          path: '/network/mobile/operators/scan'
                        }
                      ]
                    }
                  },
                  {
                    path: '/network/mobile/operators/list',
                    title: 'Operator Lists',
                    acls: ['network/mobile/operators/list'],
                    meta: {
                      route: [
                        {
                          title: 'Network',
                          path: '/network'
                        },
                        {
                          title: 'Mobile',
                          path: '/network/mobile'
                        },
                        {
                          title: 'Network Selection',
                          path: '/network/mobile/operators'
                        },
                        {
                          title: 'Operator Lists',
                          path: '/network/mobile/operators/list'
                        }
                      ]
                    }
                  }
                ]
              }
            ]
          },
          {
            path: '/network/lan',
            title: 'LAN',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'LAN',
                  path: '/network/lan'
                }
              ]
            }
          }
        ]
      },
      {
        path: '/network/mobile',
        title: 'Mobile',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            }
          ]
        },
        children: [
          {
            path: '/network/mobile/general',
            title: 'General',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'General',
                  path: '/network/mobile/general'
                }
              ]
            },
            children: [
              {
                path: '/network/mobile/general/cfg01aa0e',
                acls: ['network/mobile/general'],
                title: 'SIM1',
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'General',
                      path: '/network/mobile/general'
                    },
                    {
                      title: 'SIM1',
                      path: '/network/mobile/general/cfg01aa0e'
                    }
                  ]
                }
              },
              {
                path: '/network/mobile/general/cfg02aa0e',
                acls: ['network/mobile/general'],
                title: 'SIM2',
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'General',
                      path: '/network/mobile/general'
                    },
                    {
                      title: 'SIM2',
                      path: '/network/mobile/general/cfg02aa0e'
                    }
                  ]
                }
              }
            ]
          },
          {
            path: '/network/mobile/sim_switch',
            acls: ['network/mobile/sim_switch'],
            title: 'SIM Switch',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'SIM Switch',
                  path: '/network/mobile/sim_switch'
                }
              ]
            },
            children: [
              {
                path: '/network/mobile/sim_switch/cfg01aa0e',
                title: 'SIM1',
                acls: ['network/mobile/sim_switch'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'SIM Switch',
                      path: '/network/mobile/sim_switch'
                    },
                    {
                      title: 'SIM1',
                      path: '/network/mobile/sim_switch/cfg01aa0e'
                    }
                  ]
                }
              },
              {
                path: '/network/mobile/sim_switch/cfg02aa0e',
                title: 'SIM2',
                acls: ['network/mobile/sim_switch'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'SIM Switch',
                      path: '/network/mobile/sim_switch'
                    },
                    {
                      title: 'SIM2',
                      path: '/network/mobile/sim_switch/cfg02aa0e'
                    }
                  ]
                }
              }
            ]
          },
          {
            path: '/network/mobile/operators',
            title: 'Network Selection',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'Network Selection',
                  path: '/network/mobile/operators'
                }
              ]
            },
            children: [
              {
                path: '/network/mobile/operators/scan',
                title: 'Network Selection',
                acls: ['network/mobile/operators/scan'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'Network Selection',
                      path: '/network/mobile/operators'
                    },
                    {
                      title: 'Network Selection',
                      path: '/network/mobile/operators/scan'
                    }
                  ]
                }
              },
              {
                path: '/network/mobile/operators/list',
                title: 'Operator Lists',
                acls: ['network/mobile/operators/list'],
                meta: {
                  route: [
                    {
                      title: 'Network',
                      path: '/network'
                    },
                    {
                      title: 'Mobile',
                      path: '/network/mobile'
                    },
                    {
                      title: 'Network Selection',
                      path: '/network/mobile/operators'
                    },
                    {
                      title: 'Operator Lists',
                      path: '/network/mobile/operators/list'
                    }
                  ]
                }
              }
            ]
          }
        ]
      },
      {
        path: '/network/mobile/general',
        title: 'General',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'General',
              path: '/network/mobile/general'
            }
          ]
        },
        children: [
          {
            path: '/network/mobile/general/cfg01aa0e',
            acls: ['network/mobile/general'],
            title: 'SIM1',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'General',
                  path: '/network/mobile/general'
                },
                {
                  title: 'SIM1',
                  path: '/network/mobile/general/cfg01aa0e'
                }
              ]
            }
          },
          {
            path: '/network/mobile/general/cfg02aa0e',
            acls: ['network/mobile/general'],
            title: 'SIM2',
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'General',
                  path: '/network/mobile/general'
                },
                {
                  title: 'SIM2',
                  path: '/network/mobile/general/cfg02aa0e'
                }
              ]
            }
          }
        ]
      },
      {
        path: '/network/mobile/general/cfg01aa0e',
        acls: ['network/mobile/general'],
        title: 'SIM1',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'General',
              path: '/network/mobile/general'
            },
            {
              title: 'SIM1',
              path: '/network/mobile/general/cfg01aa0e'
            }
          ]
        }
      },
      {
        path: '/network/mobile/general/cfg02aa0e',
        acls: ['network/mobile/general'],
        title: 'SIM2',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'General',
              path: '/network/mobile/general'
            },
            {
              title: 'SIM2',
              path: '/network/mobile/general/cfg02aa0e'
            }
          ]
        }
      },
      {
        path: '/network/mobile/sim_switch',
        acls: ['network/mobile/sim_switch'],
        title: 'SIM Switch',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'SIM Switch',
              path: '/network/mobile/sim_switch'
            }
          ]
        },
        children: [
          {
            path: '/network/mobile/sim_switch/cfg01aa0e',
            title: 'SIM1',
            acls: ['network/mobile/sim_switch'],
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'SIM Switch',
                  path: '/network/mobile/sim_switch'
                },
                {
                  title: 'SIM1',
                  path: '/network/mobile/sim_switch/cfg01aa0e'
                }
              ]
            }
          },
          {
            path: '/network/mobile/sim_switch/cfg02aa0e',
            title: 'SIM2',
            acls: ['network/mobile/sim_switch'],
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'SIM Switch',
                  path: '/network/mobile/sim_switch'
                },
                {
                  title: 'SIM2',
                  path: '/network/mobile/sim_switch/cfg02aa0e'
                }
              ]
            }
          }
        ]
      },
      {
        path: '/network/mobile/sim_switch/cfg01aa0e',
        title: 'SIM1',
        acls: ['network/mobile/sim_switch'],
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'SIM Switch',
              path: '/network/mobile/sim_switch'
            },
            {
              title: 'SIM1',
              path: '/network/mobile/sim_switch/cfg01aa0e'
            }
          ]
        }
      },
      {
        path: '/network/mobile/sim_switch/cfg02aa0e',
        title: 'SIM2',
        acls: ['network/mobile/sim_switch'],
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'SIM Switch',
              path: '/network/mobile/sim_switch'
            },
            {
              title: 'SIM2',
              path: '/network/mobile/sim_switch/cfg02aa0e'
            }
          ]
        }
      },
      {
        path: '/network/mobile/operators',
        title: 'Network Selection',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'Network Selection',
              path: '/network/mobile/operators'
            }
          ]
        },
        children: [
          {
            path: '/network/mobile/operators/scan',
            title: 'Network Selection',
            acls: ['network/mobile/operators/scan'],
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'Network Selection',
                  path: '/network/mobile/operators'
                },
                {
                  title: 'Network Selection',
                  path: '/network/mobile/operators/scan'
                }
              ]
            }
          },
          {
            path: '/network/mobile/operators/list',
            title: 'Operator Lists',
            acls: ['network/mobile/operators/list'],
            meta: {
              route: [
                {
                  title: 'Network',
                  path: '/network'
                },
                {
                  title: 'Mobile',
                  path: '/network/mobile'
                },
                {
                  title: 'Network Selection',
                  path: '/network/mobile/operators'
                },
                {
                  title: 'Operator Lists',
                  path: '/network/mobile/operators/list'
                }
              ]
            }
          }
        ]
      },
      {
        path: '/network/mobile/operators/scan',
        title: 'Network Selection',
        acls: ['network/mobile/operators/scan'],
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'Network Selection',
              path: '/network/mobile/operators'
            },
            {
              title: 'Network Selection',
              path: '/network/mobile/operators/scan'
            }
          ]
        }
      },
      {
        path: '/network/mobile/operators/list',
        title: 'Operator Lists',
        acls: ['network/mobile/operators/list'],
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'Mobile',
              path: '/network/mobile'
            },
            {
              title: 'Network Selection',
              path: '/network/mobile/operators'
            },
            {
              title: 'Operator Lists',
              path: '/network/mobile/operators/list'
            }
          ]
        }
      },
      {
        path: '/network/lan',
        title: 'LAN',
        meta: {
          route: [
            {
              title: 'Network',
              path: '/network'
            },
            {
              title: 'LAN',
              path: '/network/lan'
            }
          ]
        }
      },
      {
        path: '/services/mobile_utilities/sms_messages/send',
        title: 'Send Messages',
        meta: {
          route: [
            {
              title: 'Services',
              path: '/services'
            },
            {
              title: 'Mobile Utilities',
              path: '/services/mobile_utilities'
            },
            {
              title: 'Messages',
              path: '/services/mobile_utilities/sms_messages'
            },
            {
              title: 'Send Messages',
              path: '/services/mobile_utilities/sms_messages/send'
            }
          ]
        }
      }
    ])
  })
  it('converts path to title', () => {
    expect(wrapper.vm.noAclPaths('system/reboot')).toBe('System > Reboot')
  })
  it('generates breadcrumbs', () => {
    const crumbs = [
      {
        name: 'System',
        path: '/system'
      },
      {
        name: 'Maintenance',
        path: '/system/maintenance'
      },
      {
        name: 'Events Log',
        path: '/system/maintenance/eventlog'
      },
      {
        name: 'System Events',
        path: '/system/maintenance/eventlog'
      }
    ]
    expect(wrapper.vm.generateBreadcrumbs(crumbs)).toEqual('System > Maintenance > Events Log > System Events')
  })
})
