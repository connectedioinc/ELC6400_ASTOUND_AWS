import VuciSideNavBar from '@/components/VuciLayout/src/VuciSideNavBar/VuciSideNavBar.vue'
import createWrapper from '../../mockFactory'
describe('VuciSideNavBar.vue', () => {
  window.scrollTo = vi.fn()
  const computedMock = {
    ...VuciSideNavBar.computed,
    secondaryMenu: () => ({ title: 'test' })
  }

  it('returns active menus when path exists', () => {
    const wrapper = createWrapper(VuciSideNavBar, {
      props: {
        pathExists: true
      },
      computed: computedMock
    })
    wrapper.vm.$route.path = '/services/cloud_solutions/rms'
    const result = wrapper.vm.activeMenus
    expect(result).toEqual(['/services', '/services/cloud_solutions', '/services/cloud_solutions/rms'])
  })
  it('returns first menu when path do not exists', () => {
    const wrapper = createWrapper(VuciSideNavBar, {
      props: {
        pathExists: false
      },
      computed: {
        ...computedMock,
        filteredMenu: () => [{ path: '/status', title: 'Status' }]
      }
    })
    const result = wrapper.vm.activeMenus
    expect(result).toEqual(['/status'])
  })
  it('returns secondary menu', () => {
    const wrapper = createWrapper(VuciSideNavBar, {
      props: {
        pathExists: false
      },
      computed: {
        ...computedMock,
        filteredMenu: () => [{ path: '/status', title: 'Status' }]
      }
    })
    const result = wrapper.vm.activeMenus
    expect(result).toEqual(['/status'])
  })
  describe('click methods', () => {
    it.each`
      children | path               | isMenuItemClickable | oneChildrenChecks
      ${[]}    | ${'/system/admin'} | ${false}            | ${true}
      ${[]}    | ${'/system'}       | ${false}            | ${false}
    `('calls _openMenu(), when children: $children, path: $path, isMenuItemClickable: $isMenuItemClickable, oneChildrenChecks: $oneChildrenChecks', ({ children, path }) => {
      const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
      wrapper.vm._isMenuItemClickable = vi.fn().mockReturnValue(false)
      const spy = vi.spyOn(wrapper.vm, '_openMenu')
      wrapper.vm._closePopups = vi.fn()
      wrapper.vm._onClick({ children, path }, null, false, true)
      expect(spy).toBeCalled()
    })
    it.each`
      children     | path
      ${undefined} | ${'/system/admin'}
      ${[]}        | ${'/system/admin/admin'}
      ${undefined} | ${'/system/admin/admin'}
      ${[]}        | ${'/system/admin'}
    `('calls _pushRoute(), when children: $children, path: $path', ({ children, path }) => {
      const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
      wrapper.vm._isMenuItemClickable = vi.fn().mockReturnValue(false)
      wrapper.vm._closePopups = vi.fn()
      const spy = vi.spyOn(wrapper.vm, '_pushRoute')
      wrapper.vm._onClick({ children, path }, async () => {}, true)
      expect(spy).toBeCalled()
    })
    it('calls _pushRoute when isArrow is false', () => {
      const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
      const spy = vi.spyOn(wrapper.vm, '_pushRoute')
      wrapper.vm._closePopups = vi.fn()
      wrapper.vm._onClick({ children: [{ path: '' }], path: '/system/admin', title: 'System' }, null, false, false)
      expect(spy).toBeCalled()
    })
    it.each`
      path                     | currentPath          | expectedResult
      ${'/status'}             | ${'/status'}         | ${true}
      ${'/status/network'}     | ${'/status'}         | ${false}
      ${'/status'}             | ${'/status/network'} | ${true}
      ${'/status/network/lan'} | ${'/network/lan'}    | ${false}
    `('returns $expectedResult when children: $children, isCurrentRoute: $isCurrentRoute', ({ path, currentPath, expectedResult }) => {
      const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
      wrapper.vm.$router.currentRoute = { path: currentPath }
      const result = wrapper.vm.$router.currentRoute.path.includes(path)
      expect(result).toEqual(expectedResult)
    })
    it.each`
      tabletMode | collapsedDesktopMenu | isPopup  | level | expectedResult
      ${false}   | ${true}              | ${false} | ${0}  | ${true}
      ${true}    | ${true}              | ${false} | ${0}  | ${false}
      ${false}   | ${false}             | ${false} | ${0}  | ${false}
      ${false}   | ${true}              | ${true}  | ${0}  | ${false}
      ${false}   | ${true}              | ${false} | ${1}  | ${false}
    `('returns $expectedResult when collapsedDesktopMenu: $collapsedDesktopMenu, isPopup: $isPopup, level: $level, ', ({ tabletMode, collapsedDesktopMenu, isPopup, level, expectedResult }) => {
      const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
      wrapper.vm.tabletMode = tabletMode
      wrapper.vm.collapsedDesktopMenu = collapsedDesktopMenu
      const result = wrapper.vm._isMenuItemClickable(isPopup, level)
      expect(result).toEqual(expectedResult)
    })
    it('ignores click', () => {
      const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
      wrapper.vm._isMenuItemClickable = vi.fn().mockReturnValue(true)
      wrapper.vm._closePopups = vi.fn()
      const spy1 = vi.spyOn(wrapper.vm, '_pushRoute')
      const spy2 = vi.spyOn(wrapper.vm, '_openMenu')
      wrapper.vm._onClick({ children: [], path: '/system' })
      expect(spy1).not.toBeCalled()
      expect(spy2).not.toBeCalled()
    })
    it.each`
      path                        | level | expectedMenu
      ${'/status/overview'}       | ${1}  | ${['/system', '/status/overview', '/system/admin/profiles/scheduler']}
      ${'/system/admin/profiles'} | ${1}  | ${['/system', '', '/system/admin/profiles/scheduler']}
      ${'/status'}                | ${0}  | ${['/status', '/system/admin/profiles', '/system/admin/profiles/scheduler']}
      ${'/system'}                | ${0}  | ${['/system', '/system/admin/profiles', '/system/admin/profiles/scheduler']}
    `('opens other menu', ({ path, level, expectedMenu }) => {
      const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
      wrapper.vm._closePopups = vi.fn()
      wrapper.vm.selectedMenus = ['/system', '/system/admin/profiles', '/system/admin/profiles/scheduler']
      wrapper.vm._openMenu({ path }, level)
      expect(wrapper.vm.selectedMenus).toEqual(expectedMenu)
    })
    describe('_pushRoute()', () => {
      it('opens new page', async () => {
        const wrapper = createWrapper(VuciSideNavBar, {
          computed: {
            uploading: () => 0,
            ...computedMock
          }
        })
        const spy = vi.spyOn(wrapper.vm.$router, 'push')
        await wrapper.vm._pushRoute('/test/test')
        expect(spy).toBeCalledWith('/test/test')
      })
      it('shows message when can not open page', async () => {
        const wrapper = createWrapper(VuciSideNavBar, {
          computed: {
            ...computedMock,
            uploading: () => 1
          }
        })
        const spy = vi.spyOn(wrapper.vm.$message, 'error')
        await wrapper.vm._pushRoute('/test/test')
        expect(spy).toBeCalled()
      })
    })
  })
  it.each`
    paths                                                       | menu                     | expectedResult
    ${['/status', '/status/network', '/status/network/mobile']} | ${{ path: '/status' }}   | ${true}
    ${['/status', '/status/network', '/status/network/mobile']} | ${{ path: '/services' }} | ${false}
  `('returns $expectedResult when activeMenus: $paths, current menu: $path', ({ paths, menu, expectedResult }) => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const result = wrapper.vm._isActive(menu, paths)
    expect(result).toBe(expectedResult)
  })
  it.each`
    collapseState
    ${true}
    ${false}
  `('sets collapsedDesktopMenu to: collapseState', ({ collapseState }) => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const spy = vi.spyOn(wrapper.vm, '_setSelectedMenus')
    wrapper.vm.collapsedDesktopMenu = !collapseState
    wrapper.vm._toggleDesktopMenu(collapseState)
    expect(spy).toBeCalled()
    expect(wrapper.vm.collapsedDesktopMenu).toBe(wrapper.vm.collapsedDesktopMenu)
  })
  it.each`
    tabletMode | collapsedMobileMenu | collapsedDesktopMenu | expextedResult
    ${false}   | ${false}            | ${false}             | ${false}
    ${true}    | ${false}            | ${false}             | ${false}
    ${true}    | ${true}             | ${false}             | ${true}
    ${true}    | ${true}             | ${true}              | ${true}
    ${false}   | ${true}             | ${true}              | ${true}
    ${false}   | ${true}             | ${true}              | ${true}
    ${false}   | ${true}             | ${false}             | ${false}
  `(
    'returns $expextedResult when tabletMode: $tabletMode, collapsedMobileMenu: $collapsedMobileMenu, collapsedDesktopMenu: $collapsedDesktopMenu',
    ({ tabletMode, collapsedMobileMenu, collapsedDesktopMenu, expextedResult }) => {
      const wrapper = createWrapper(VuciSideNavBar, {
        computed: {
          ...computedMock,
          collapsedMobileMenu: () => collapsedMobileMenu
        }
      })
      wrapper.vm.tabletMode = tabletMode
      wrapper.vm.collapsedDesktopMenu = collapsedDesktopMenu
      const result = wrapper.vm.collapseSecondMenu
      expect(result).toBe(expextedResult)
    }
  )
  it.each`
    tabletMode | collapseSecondMenu | expextedResult
    ${false}   | ${false}           | ${false}
    ${true}    | ${false}           | ${false}
    ${true}    | ${true}            | ${true}
  `('returns $expextedResult when tabletMode: $tabletMode, collapseSecondMenu: $collapseSecondMenu', ({ tabletMode, collapseSecondMenu, expextedResult }) => {
    const wrapper = createWrapper(VuciSideNavBar, {
      computed: {
        ...computedMock,
        collapseSecondMenu: () => collapseSecondMenu
      }
    })
    wrapper.vm.tabletMode = tabletMode
    const result = wrapper.vm.collapseFirstMenu
    expect(result).toBe(expextedResult)
  })
  it('sets selectedMenus to activeMenu', () => {
    const wrapper = createWrapper(VuciSideNavBar, {
      computed: {
        ...computedMock,
        activeMenus: () => ['/system', '/system/admin/profiles', '/system/admin/profiles/scheduler']
      }
    })
    wrapper.vm._setSelectedMenus()
    expect(wrapper.vm.selectedMenus).toEqual(['/system', '/system/admin/profiles', '/system/admin/profiles/scheduler'])
  })
  it('closes all popups', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    wrapper.vm.$refs['primary-menu-popup-first'].hide = vi.fn()
    wrapper.vm.$refs['primary-menu-popup-second'].hide = vi.fn()
    wrapper.vm.$refs['secondary-menu-popup'].hide = vi.fn()
    const spy1 = vi.spyOn(wrapper.vm.$refs['primary-menu-popup-first'], 'hide')
    const spy2 = vi.spyOn(wrapper.vm.$refs['primary-menu-popup-second'], 'hide')
    const spy3 = vi.spyOn(wrapper.vm.$refs['secondary-menu-popup'], 'hide')
    wrapper.vm._closePopups()
    expect(spy1).toBeCalled()
    expect(spy2).toBeCalled()
    expect(spy3).toBeCalled()
  })
  it.each`
    item                                                                                     | expectedResult
    ${{ view: 'status/wireless_233232', children: [], read_access: true, index: true }}      | ${true}
    ${{ children: [], read_access: true, index: true }}                                      | ${true}
    ${{ view: 'status/wireless_233232', read_access: true, index: true }}                    | ${true}
    ${{ read_access: true, index: true }}                                                    | ${false}
    ${{ view: 'status/wireless_233232', children: [], read_access: false, index: true }}     | ${false}
    ${{ view: 'status/wireless_233232', children: [], read_access: true }}                   | ${false}
    ${{ view: 'status/wireless_233232', children: [], read_access: true, index: undefined }} | ${false}
  `('returns $expectedResult when item: $item', ({ item, expectedResult }) => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: { ...computedMock } })
    const result = wrapper.vm._menuFilterFunction(item)
    expect(result).toBe(expectedResult)
  })
  it('returns secondary menu', () => {
    const wrapper = createWrapper(VuciSideNavBar, {
      computed: {
        ...VuciSideNavBar.computed,
        filteredMenu: () => [
          { path: '/status', title: 'Status' },
          { path: '/settings', title: 'Settings' },
          { path: '/admin', title: 'Admin' }
        ],
        activeMenus: () => ['/settings']
      }
    })
    expect(wrapper.vm.secondaryMenu).toEqual(wrapper.vm.filteredMenu[1])
  })
  it('sets selectedMenus and sets overflow', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const selectedSpy = vi.spyOn(wrapper.vm, '_setSelectedMenus').mockReturnValue()
    const overFlowSpy = vi.spyOn(wrapper.vm, '_setOverflow').mockReturnValue()
    wrapper.vm.$options.watch.collapsedMobileMenu.call(wrapper.vm, false)
    expect(selectedSpy).toBeCalled()
    expect(overFlowSpy).toBeCalledWith(true)
  })
  it('collapses menu', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    wrapper.vm._closeMobileMenu(wrapper.vm)
    expect(wrapper.vm.$store.collapsedMobileMenu).toBe(true)
  })
  it('collapses menu using premade function', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const spy = vi.spyOn(wrapper.vm, '_closeMobileMenu')
    wrapper.vm.$options.watch['$route.path'].handler.call(wrapper.vm)
    expect(spy).toBeCalled()
  })
  it('adds overflow', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const spy = vi.spyOn(global.document.body.classList, 'add')
    wrapper.vm._setOverflow(true)
    expect(spy).toBeCalled()
  })
  it('removes overflow', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const spy = vi.spyOn(global.document.body.classList, 'remove')
    wrapper.vm._setOverflow(false)
    expect(spy).toBeCalled()
  })
  it('sets selectedMenus on route change', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const spy = vi.spyOn(wrapper.vm, '_setSelectedMenus')
    wrapper.vm.$options.watch['$route.path'].handler.call(wrapper.vm, 'test1', 'test2')
    expect(spy).toBeCalled()
  })
  it('does not set selectedMenus when route does not change', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    const spy = vi.spyOn(wrapper.vm, '_setSelectedMenus')
    wrapper.vm.$options.watch['$route.path'].handler.call(wrapper.vm, 'test', 'test')
    expect(spy).not.toBeCalled()
  })
  it('sets transitioning flag when width property is transitioned', () => {
    const wrapper = createWrapper(VuciSideNavBar, { computed: computedMock })
    wrapper.vm._handleTransition({ propertyName: 'width' }, true)
    expect(wrapper.vm.transitioning).toBe(true)
  })
})
