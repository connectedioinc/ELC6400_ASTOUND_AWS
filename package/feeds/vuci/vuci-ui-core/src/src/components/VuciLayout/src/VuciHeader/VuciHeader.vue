<template>
  <div class="header w-full border-b sticky top-0 inset-x-0 z-20 bg-theme-bg-surface">
    <div class="flex flex-col xs:flex-row items-stretch xs:items-center justify-between xs:gap-4 md:gap-8 relative max-w-384 4xl:mx-auto max-xs:pb-4 mx-6 lg:mx-10 h-full">
      <div
        class="inline-flex grow items-center gap-4"
        :class="{ 'xs:max-md:invisible xs:max-md:absolute xs:max-md:pointer-events-none': searchExpanded || delayedSearchExpanded }"
      >
        <button
          class="expand-menu-btn lg:hidden flex flex-col shrink-0 h-5 w-6"
          :class="{ expanded: !store.collapsedMobileMenu }"
          test-id="header-mobile-expand"
          @click="store.collapsedMobileMenu = !store.collapsedMobileMenu"
        >
          <span
            v-for="i in 3"
            :key="i"
            class="icon-bar bg-theme-text-primary w-full"
          />
        </button>
        <router-link
          id="/"
          to="/"
          test-id="header-logo"
        >
          <img
            class="h-8 w-auto"
            src="/tlt_networks_logo.svg"
          />
        </router-link>
      </div>
      <div class="inline-flex justify-end items-center xs:grow gap-4 md:gap-8">
        <vuci-search
          v-model:expanded="searchExpanded"
          class="justify-end md:max-w-96"
        />
        <header-menu-item
          element-id="header-firmware"
          class="basis-0 max-xl:hidden"
          :edit-text="headerData?.fw_version || ''"
          icon="upgrade-firmware"
          :title="$store.deviceInfo?.static?.device_name || ''"
          href="/system/flashops/general"
          :badge="updateAvailable"
          :disabled="isPathNotReadable('/system/flashops/general')"
        />
        <header-menu
          ref="notificationsMenu"
          v-model:open="notificationsOpen"
          element-id="notifications"
          class="max-lg:hidden"
          icon="bell"
          :badge="notificationsStore.hasNewOrUnreadNotifications"
          @update:open="notificationsStore.setAllStatus('read')"
        >
          <template #icon="{ open }">
            <tlt-icon
              icon="bell"
              :class="[open ? 'text-theme-text-on-primary' : 'text-theme-text-primary', { 'animate-wiggle': notificationsStore.hasNewOrUnreadNotifications }]"
            />
          </template>
          <vuci-notifications
            :notifications="notificationsStore.notifications"
            class="max-h-[min(32rem,calc(100vh-6rem))]"
          />
        </header-menu>
        <header-menu
          v-model:open="menuOpen"
          element-id="main"
          icon="profile-settings"
          :class="{ hide: searchExpanded }"
          :badge="(breakpoints.smallerOrEqual('xl').value && updateAvailable) || (breakpoints.smallerOrEqual('lg').value && notificationsStore.hasNewOrUnreadNotifications)"
          @after-close="menuPage = 'main'"
        >
          <template v-if="menuPage === 'notifications'">
            <vuci-notifications
              class="w-72! 2xl:w-56! max-h-[min(32rem,calc(100vh-6rem))]"
              :notifications="notificationsStore.notifications"
              back-button
              @back="menuPage = 'main'"
            >
              <template #header>
                <span>{{ $t('Notifications') }}</span>
              </template>
            </vuci-notifications>
          </template>
          <template v-else>
            <div class="w-72 2xl:w-56 px-4 py-1.5 *:py-4 divide-y">
              <header-menu-item
                element-id="header-dropdown-firmware"
                class="xl:hidden"
                :edit-text="headerData?.fw_version || ''"
                icon="upgrade-firmware"
                :title="$store.deviceInfo?.static?.device_name || ''"
                href="/system/flashops/general"
                :badge="updateAvailable"
                :disabled="isPathNotReadable('/system/flashops/general')"
              />
              <header-menu-item
                ref="notificationsMenuItem"
                element-id="header-dropdown-notifications"
                class="lg:hidden lg:border-t-0!"
                :edit-text="$t('View Notifications')"
                :title="$t('Notifications')"
                :badge="notificationsStore.hasNewOrUnreadNotifications"
                @click="
                  () => {
                    menuPage = 'notifications'
                    notificationsStore.setAllStatus('read')
                  }
                "
              >
                <template #icon>
                  <tlt-icon
                    icon="bell"
                    class="text-theme-text-primary"
                    :class="{ 'animate-wiggle': notificationsStore.hasNewOrUnreadNotifications }"
                  />
                </template>
              </header-menu-item>
              <header-menu-item
                element-id="header-dropdown-user"
                :edit-text="$t('Change password')"
                class="xl:*:first:hidden xl:border-t-0!"
                icon="profile-settings"
                :title="store.username || '-'"
                href="/system/admin/multiusers/change_password"
                :disabled="isPathNotReadable('/system/admin/multiusers/change_password')"
              />
              <header-menu-item
                v-if="isProfileChanged"
                element-id="header-dropdown-profile"
                :edit-text="$t('Edit profile')"
                :title="store.profile"
                href="/system/admin/profiles/config"
                :disabled="isPathNotReadable('/system/admin/profiles/config')"
              />
              <tlt-button
                class="justify-start!"
                test-id="header-reboot"
                type="text"
                block
                :disabled="!$session.hasAccess('system/reboot')"
                @click="
                  () => {
                    menuOpen = false
                    $reboot()
                  }
                "
              >
                {{ $t('Reboot') }}
              </tlt-button>
              <tlt-button
                class="justify-start!"
                test-id="header-logout"
                type="text"
                block
                :disabled="false"
                @click="onLogoutClick"
              >
                {{ $t('Logout') }}
              </tlt-button>
            </div>
          </template>
        </header-menu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBreakpoints, breakpointsTailwind, whenever, refDebounced } from '@vueuse/core'
import { useMainStore } from '@/stores/main'
import { useNotifications, useMessages } from '@/stores/messages'
import { useTranslate } from '@ui-core/composables/useI18n'
import { isNull } from '@ui-core/utils/inspect'
import { axios } from '@ui-core/plugins/axios'
import { session } from '@ui-core/plugins/session'
import { menu } from '@/plugins/menu'

import HeaderMenu from './HeaderMenu.vue'
import HeaderMenuItem from './HeaderMenuItem.vue'
import VuciSearch from './search/VuciSearch.vue'
import VuciNotifications from '../VuciNotifications.vue'

const $t = useTranslate()
const store = useMainStore()
const notificationsStore = useNotifications()
const message = useMessages()

const breakpoints = useBreakpoints(breakpointsTailwind)
whenever(breakpoints.greater('lg'), () => (menuOpen.value = false))

const headerData = computed(() => store.deviceInfo?.static)

const menuPage = ref<'main' | 'notifications'>('main')
const menuOpen = ref(false)
const notificationsOpen = ref(false)

const notificationsMenu = ref<InstanceType<typeof HeaderMenu> | null>(null)
const notificationsMenuItem = ref<InstanceType<typeof HeaderMenuItem> | null>(null)

const searchExpanded = ref(false)
const delayedSearchExpanded = refDebounced(searchExpanded, 300)

const isProfileChanged = computed(() => !isNull(store.profile) && store.profile !== 'default')
const updateAvailable = computed(() => (store.fotaInfo?.notify === '1' && store.firmwareUpdateAvailable) || (store.fotaInfo?.notify_modem === '1' && store.modemUpdateAvailable))

onMounted(async () => {
  if (store.renewPassword) return
  try {
    const { data } = await axios.get<{ current_profile: string }>('/api/profiles/status')
    store.profile = data.current_profile
  } catch {
    message.error($t('Failed to load profile data'))
  }
})

function isPathNotReadable(path: string) {
  const item = menu.findMenuItem(path)
  return !item ? true : item.read_access === false
}

async function onLogoutClick() {
  menuOpen.value = false
  sessionStorage.removeItem('redirect-path')
  session.logout()
}
</script>

<style>
@reference '@/theme.css';

#app {
  --header-height: 8rem;

  @media (min-width: theme(--breakpoint-xs)) {
    --header-height: 4.5rem;
  }
  @media (min-width: theme(--breakpoint-md)) {
    --header-height: 6rem;
  }
}
</style>

<style scoped>
@reference '@/theme.css';

.header {
  box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.05);
  height: var(--header-height);
}

.expand-menu-btn {
  position: relative;
  .icon-bar {
    position: absolute;
    top: 50%;
    margin-top: -1.5px;
    height: 3px;
    border-radius: 3px;
    transition:
      transform 0.3s,
      opacity 0.1s;
  }
  .icon-bar:nth-child(1) {
    transform: translate(0, -6px);
  }
  .icon-bar:nth-child(2) {
    transform: translate(0, 0px);
  }
  .icon-bar:nth-child(3) {
    transform: translate(0, 6px);
  }
  &.expanded {
    .icon-bar:nth-child(1) {
      transform: translate(0, 0) rotate(45deg);
    }
    .icon-bar:nth-child(2) {
      transform: scaleY(0);
      opacity: 0;
    }
    .icon-bar:nth-child(3) {
      transform: translate(0, 0) rotate(-45deg);
    }
  }
}

@media not all and (min-width: theme(--breakpoint-md)) {
  :global(.hide) {
    width: 0 !important;
    flex-grow: 0 !important;
    margin: 0 !important;
    display: none;
  }
  .header {
    .expand-menu-btn {
      transition:
        width 0.3s,
        margin 0.3s;
    }
  }
}
</style>
