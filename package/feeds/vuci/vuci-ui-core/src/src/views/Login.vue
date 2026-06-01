<template>
  <div class="w-full h-screen grid place-items-center">
    <div class="flex flex-col h-full md:h-fit w-full md:w-min gap-12">
      <tlt-alert
        v-if="store.securityBanner.title"
        id="security-banner"
        class="hidden md:block"
        type="warning"
        :text="store.securityBanner.message"
        :title="store.securityBanner.title"
      >
      </tlt-alert>
      <div class="login-container">
        <div class="login-left-panel">
          <img
            class="brightness-0 invert max-h-8 mb-8"
            src="/tlt_networks_logo.svg"
            alt="Networks Logo"
          />
          <div class="heading-title mb-5 w-full text-fish font-semibold">
            {{ $t('Authorization required') }}
          </div>
          <div class="text-body-main w-full sm:w-3/4 mb-6">
            <span>
              {{ $t('Please enter your username and password') }}
              <button ref="help">
                <tlt-icon
                  icon="tooltip"
                  class="inline mb-1 size-5"
                />
                <tlt-popover
                  :target="() => $refs.help"
                  placement="bottom"
                >
                  {{ $t('The default login credentials can be found on the back of the device.') }}
                </tlt-popover>
              </button>
            </span>
          </div>
        </div>
        <tlt-alert
          v-if="store.securityBanner.title"
          id="security-banner"
          class="md:hidden m-8"
          type="warning"
        >
          <template #title>
            <div class="flex gap-2 items-center justify-between">
              <h2 class="font-semibold text-theme-text-warning">
                {{ store.securityBanner.title }}
              </h2>
              <tlt-button
                type="text"
                @click="mobileSecurityBannerExpanded = !mobileSecurityBannerExpanded"
              >
                <tlt-icon
                  icon="dropdown-arrow"
                  :class="{ 'rotate-180': mobileSecurityBannerExpanded }"
                  class="text-theme-text-warning"
                />
              </tlt-button>
            </div>
          </template>
          <tlt-collapse-transition>
            <ul v-if="mobileSecurityBannerExpanded">
              {{
                store.securityBanner.message
              }}
            </ul>
          </tlt-collapse-transition>
        </tlt-alert>
        <form
          class="login-form flex flex-col justify-center md:py-[80px] md:px-12 lg:px-[60px] mb-16 md:my-4 -ml-0.5"
          :class="{ 'max-md:py-[80px] max-md:mx-[60px]': !store.securityBanner.title }"
          @submit.prevent="handleLogin"
        >
          <div class="flex flex-col gap-8 mt-8 relative">
            <div class="form-group">
              <label for="username">{{ $t('Username') }}</label>
              <tlt-form-item-input
                v-model="form.username"
                prop="username"
                rules="string"
                name="username"
                use-autocomplete
              />
            </div>
            <div class="form-group">
              <label for="password">{{ $t('Password') }}</label>
              <tlt-form-item-password
                v-model="form.password"
                prop="password"
                name="password"
                rules="string"
                use-autocomplete
              />
            </div>
            <div
              v-if="errorMessage.length > 0"
              test-id="login-error"
              class="error"
              style="max-width: 300px"
            >
              {{ errorMessage }}
            </div>
          </div>
          <tlt-button
            button-id="login"
            button-type="submit"
            class="mx-auto mt-12"
          >
            {{ $t('Log in') }}
          </tlt-button>
        </form>
      </div>
      <div class="fixed right-4 bottom-4 md:right-8 md:bottom-8">
        <button
          ref="button"
          test-id="button-cookies"
          type="button"
          class="rounded-full bg-theme-bg-primary-1 hover:bg-theme-bg-primary-hover p-3 focus-visible:outline-2 focus-visible:outline-theme-border-primary outline-offset-2"
          @click="expanded = !expanded"
        >
          <tlt-icon
            icon="cookie"
            class="text-theme-text-on-primary"
          />
        </button>
        <tlt-content-box
          :target="() => $refs.button"
          :open="expanded"
          placement="top-start"
          class="p-4! w-[min(18rem,calc(100vw-2rem))]! leading-5"
          arrow
          :distance="16"
          @update:open="expanded = $event"
        >
          <div class="mb-2 flex justify-between items-center">
            <h3 class="text-theme-text-primary font-bold">{{ $t('We use cookies') }}</h3>
            <button
              type="button"
              @click="expanded = false"
            >
              <tlt-icon
                icon="x"
                class="size-5 text-theme-text-subtle hover:text-theme-text-secondary-hover"
              />
            </button>
          </div>
          <p>
            {{ $t('We use cookies to enhance your browsing experience. These cookies are used to keep you logged in.') }}
          </p>
        </tlt-content-box>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTranslate } from '@ui-core/composables/useI18n'
import { useMainStore } from '@/stores/main'
import { session } from '@ui-core/plugins/session'
import { menu } from '@/plugins/menu'
import { axios } from '@ui-core/plugins/axios'
import { analytics } from '@/plugins/analytics'
import { getLastVisitedPath } from '@/router'
import { log } from '@ui-core/plugins/log'
import TltAlert from '@/components/Messenger/TltAlert.vue'

const $t = useTranslate()
const store = useMainStore()

const form = reactive({
  username: '',
  password: ''
})

const mobileSecurityBannerExpanded = ref(false)
const expanded = ref(false)
const errorMessage = ref(session.loginError)

const router = useRouter()
const route = useRoute()

const invalidMessage = $t('Invalid username and/or password! Please try again.')
const unexpectedMessage = $t('Failed to login due to unexpected error.')
const unreachableDeviceMessage = $t('The device is unreachable. Please check the connection and try again.')

const { ipChanged, t } = route.query || {}
if (ipChanged) errorMessage.value = $t("Device's IP address was changed - you need to log in again.")
if (ipChanged || t) router.push(route.path) // <-- clears query params

function validateLogin() {
  const { username, password } = form
  return !(username.length > 4096 || password.length > 4096 || !password || !username)
}

function loadRequiredData() {
  return Promise.all([
    menu.loadMenu(true),
    session.updateACLs(),
    axios.loadPackages(),
    axios.get('/api/system/config/general').then(({ data }) => {
      store.sessionTimeout = Number(data.session_timeout) * 1000
      store.firstLogin = data.firstlogin === '1'
      if (data.data_analytics === '1') analytics.enable()
    })
  ])
}

async function handleLogin() {
  session.loginError = ''
  if (!validateLogin()) return (errorMessage.value = invalidMessage)
  store.spin()
  try {
    const ok = await session.login(form.username, form.password)
    if (!ok) throw new Error('invalid')
    await loadRequiredData()
    const lastVisitedPath = getLastVisitedPath()
    const redirectRoute = router.getRoutes().find(route => route.path === lastVisitedPath)
    if (!redirectRoute) return await router.push('/').catch()
    await router.push(redirectRoute).catch()
  } catch (err) {
    log(`Login failed due to error: ${err}`)
    if (err instanceof Error) {
      if (err.message === 'invalid') return (errorMessage.value = invalidMessage)
      if (axios.isAxiosError(err)) return (errorMessage.value = unreachableDeviceMessage)
    }
    errorMessage.value = errorMessage.value = unexpectedMessage
  } finally {
    store.spin(false)
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.login-container {
  height: 26rem;
  display: flex;
}

.login-left-panel {
  z-index: 1;
  width: 360px;
  border-radius: 7px;
  background-color: var(--color-theme-bg-primary-1);
  padding: 50px 40px;
  color: var(--color-theme-text-on-primary);
}

.login-form {
  border: 1px solid var(--color-theme-border-base);
  border-top-right-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  background-color: var(--color-theme-bg-surface);
}

.form-group {
  position: relative;
  width: min(18.75rem, calc(100vw - 2rem));
}

.form-group > label {
  line-height: 1;
  font-size: 1em;
  display: inline-block;
  padding: 0 0.5em;
  position: absolute;
  background: var(--color-theme-bg-surface);
  top: -0.5em;
  left: 1em;
  color: var(--color-theme-text-subtle);
  z-index: 1;
}

@media not all and (min-width: theme(--breakpoint-md)) {
  .login-container {
    display: flex;
    flex-direction: column;
    position: relative;
    min-width: unset;
    top: unset;
    left: unset;
    transform: unset;
    width: 100%;
    height: 100%;

    .login-left-panel {
      border-radius: 0;
      width: 100%;
      padding-top: 50px;
      padding-bottom: 20px;
    }

    .login-form {
      padding-inline: 0;
      border: unset;
      width: max-content;
      margin-left: auto;
      margin-right: auto;
    }
  }
}
</style>
