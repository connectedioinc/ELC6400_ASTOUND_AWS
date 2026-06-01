<template>
  <div
    :class="['side-nav-bar', { collapsed: collapseSecondMenu }]"
    :test-id="`side-nav-bar${collapseSecondMenu ? ' collapsed' : ''}`"
  >
    <primary-menu
      ref="primary-menu"
      :collapsed="collapseFirstMenu"
      @toggle-expand="() => _toggleDesktopMenu()"
      @transitionstart="_handleTransition($event, true)"
      @transitionend="_handleTransition($event, false)"
      @transitioncancel="_handleTransition($event, false)"
    >
      <primary-menu-item
        v-for="menuItem in filteredMenu"
        :key="menuItem.path"
        :name="menuItem.title"
        :active="_isActive(menuItem)"
        :current-path="_isActive(menuItem, activeMenus)"
        :children="menuItem.children"
        :open-on-active="true"
        :path="menuItem.path"
        @click="() => _onClick(menuItem)"
        @mouseenter="props => !transitioning && $refs['primary-menu-popup-first'].display(props)"
        @mouseleave="$refs['primary-menu-popup-first'].hide()"
      />
    </primary-menu>
    <secondary-menu
      ref="secondary-menu"
      :title="secondaryMenu.title"
      :collapsed="collapseSecondMenu"
      @transitionstart="_handleTransition($event, true)"
      @transitionend="_handleTransition($event, false)"
      @transitioncancel="_handleTransition($event, false)"
    >
      <secondary-menu-item
        v-for="secondaryMenuItem in filteredChildren"
        :key="secondaryMenuItem.path"
        :name="secondaryMenuItem.title"
        :active="_isActive(secondaryMenuItem)"
        :current-path="_isActive(secondaryMenuItem, activeMenus)"
        :children="secondaryMenuItem.children"
        :path="secondaryMenuItem.path"
        @click="(navigate, isArrow) => _onClick(secondaryMenuItem, navigate, false, isArrow)"
        @mouseenter="props => !transitioning && $refs['secondary-menu-popup'].display(props)"
        @mouseleave="$refs['secondary-menu-popup'].hide()"
      >
        <tertiary-menu
          v-if="secondaryMenuItem.children"
          v-show="_isActive(secondaryMenuItem)"
          v-slot="{ exports }"
          :active-menus="activeMenus"
        >
          <tertiary-menu-item
            v-for="tertiaryMenuItem in secondaryMenuItem.children"
            :key="tertiaryMenuItem.path"
            :menu-exports="exports"
            :name="tertiaryMenuItem.title"
            :active="_isActive(tertiaryMenuItem)"
            :path="tertiaryMenuItem.path"
            @click="navigate => _onClick(tertiaryMenuItem, navigate)"
          />
        </tertiary-menu>
      </secondary-menu-item>
    </secondary-menu>
    <popup-menu
      v-show="collapseSecondMenu && !tabletMode"
      ref="primary-menu-popup-first"
      :parent="() => $refs['primary-menu']"
      show-children
      @click="_onClick"
      @mouseenter="props => $refs['primary-menu-popup-second'].display(props)"
      @mouseleave="$refs['primary-menu-popup-second'].hide()"
    />
    <popup-menu
      v-show="collapseSecondMenu && !tabletMode"
      ref="primary-menu-popup-second"
      :parent="() => $refs['primary-menu-popup-first']"
      @click="_onClick"
    />
    <popup-menu
      v-show="!tabletMode"
      ref="secondary-menu-popup"
      :parent="() => $refs['secondary-menu']"
      @click="_onClick"
    />
    <Transition
      v-if="tabletMode"
      name="fade"
    >
      <div
        v-show="!collapsedMobileMenu"
        class="menu-overlay"
        @click="_closeMobileMenu()"
      />
    </Transition>
  </div>
</template>

<script>
import { mapState } from 'pinia'
import { useMainStore } from '@/stores/main'
import components from './vueComponents.js'

export default {
  components,
  props: {
    pathExists: Boolean
  },
  data() {
    return {
      tabletMode: false,
      collapsedDesktopMenu: false,
      selectedMenus: [],
      transitioning: false,
      media: null
    }
  },
  computed: {
    ...mapState(useMainStore, ['menus', 'hostname', 'collapsedMobileMenu', 'uploading']),
    activeMenus() {
      if (!this.pathExists) return [this.filteredMenu[0]?.path]
      const pathNoFirstChar = this.$route.path.substring(1)
      const words = pathNoFirstChar.split('/')
      const firstLevel = '/'.concat(words[0])
      const secondLevel = firstLevel.concat('/').concat(words[1])
      const thirdLevel = secondLevel.concat('/').concat(words[2])
      const activeMenus = [firstLevel, secondLevel, thirdLevel]
      return activeMenus
    },
    filteredMenu() {
      return this.$menu.filterMenus(this.menus, this._menuFilterFunction)
    },
    secondaryMenu() {
      return this.filteredMenu.find(menuItem => this._isActive(menuItem)) || {}
    },
    collapseFirstMenu() {
      return this.tabletMode && this.collapseSecondMenu
    },
    collapseSecondMenu() {
      return this.tabletMode ? this.collapsedMobileMenu : this.collapsedDesktopMenu
    },
    filteredChildren() {
      if (this.$store.hasPackages('rms_mqtt.control')) {
        return this.secondaryMenu?.children || []
      } else {
        return this.secondaryMenu?.children?.map(item => ({ ...item, children: item.children?.filter(i => i.title !== 'RMS') })) || []
      }
    }
  },
  watch: {
    collapsedMobileMenu(newVar) {
      this._setSelectedMenus()
      this._setOverflow(!newVar)
    },
    tabletMode(value) {
      if (!value && !this.$store.collapsedMobileMenu) this.$store.collapsedMobileMenu = true
      this._setSelectedMenus()
    },
    '$route.path': {
      handler: function (to, from) {
        if (to !== from) this._setSelectedMenus()
        this._closeMobileMenu()
      },
      immediate: true
    }
  },
  created() {
    const mm = window.matchMedia('(max-width: 1023px)')
    this.tabletMode = mm.matches
    const onChange = e => (this.tabletMode = e.matches)
    mm.addEventListener('change', onChange)
    this.media = mm
  },
  beforeUnmount() {
    this.media?.removeEventListener('change', this.onChange)
  },
  methods: {
    _menuFilterFunction(item) {
      const isUseful = !!(item.view || item.children)
      const index = item.index !== undefined
      return isUseful && item.read_access && index
    },
    _setOverflow(isHidden) {
      if (isHidden) {
        document.body.classList.add('max-lg:overflow-hidden')
      } else {
        document.body.classList.remove('max-lg:overflow-hidden')
      }
    },
    _setSelectedMenus() {
      this.selectedMenus = [...this.activeMenus]
    },
    _toggleDesktopMenu() {
      this.collapsedDesktopMenu = !this.collapsedDesktopMenu
      this._setSelectedMenus()
    },
    _closeMobileMenu() {
      this.$store.collapsedMobileMenu = true
    },
    _isActive(menuItem, activeMenus = this.selectedMenus) {
      return activeMenus.includes(menuItem.path)
    },
    _onClick(menuItem, navigate, isPopup = false, isArrow = false) {
      const level = menuItem.path.split('/').length - 2
      if (this._isMenuItemClickable(isPopup, level)) return
      if (menuItem.children && level !== 2 && !isPopup) {
        if (!isArrow && !this.filteredMenu.find(x => x.path === menuItem.path)) {
          window.scrollTo(0, 0)
          this._pushRoute(menuItem.children[0].path)
        }
        this._closePopups()
        this._openMenu(menuItem, level)
      } else {
        window.scrollTo(0, 0)
        return this._pushRoute(navigate)
      }
    },
    _isMenuItemClickable(isPopup, level) {
      return !this.tabletMode && this.collapsedDesktopMenu && !isPopup && level === 0
    },
    _closePopups() {
      this.$refs['primary-menu-popup-first'].hide()
      this.$refs['primary-menu-popup-second'].hide()
      this.$refs['secondary-menu-popup'].hide()
    },
    _pushRoute(pathOrNavigate) {
      if (this.uploading > 0) {
        this.$message.error(this.$t('Navigation is disabled when upload is in progress.'))
      } else {
        const push = typeof pathOrNavigate === 'string' ? () => this.$router.push(pathOrNavigate) : pathOrNavigate
        return push().catch(() => {})
      }
    },
    _openMenu(menuItem, level) {
      let newPath = menuItem.path
      // If you click on opened second menu it should close
      if (this.selectedMenus[level] === menuItem.path && level === 1) {
        newPath = ''
      }
      this.selectedMenus[level] = newPath
    },
    _handleTransition(event, flag) {
      if (event.propertyName !== 'width') return
      this.transitioning = flag
    }
  }
}
</script>
<style scoped>
@reference '@/theme.css';

.side-nav-bar {
  display: flex;

  @media not all and (min-width: theme(--breakpoint-lg)) {
    position: fixed;
    z-index: 12;
    height: calc(100% - var(--header-height));
    top: var(--header-height);
  }
}
.menu-overlay {
  background: black;
  width: 100vw;
  height: 100vh;
  opacity: 0.6;
}
</style>
