<template>
  <tlt-collapse-transition
    v-show="!collapsed"
    collapse-property="width"
    :duration="300"
  >
    <div class="collapsable">
      <div class="secondary-menu overflow-auto">
        <div class="name-outer">
          <div
            class="name"
            v-text="$t(title)"
          />
        </div>
        <div class="items">
          <slot />
        </div>
      </div>
    </div>
  </tlt-collapse-transition>
</template>

<script>
export default {
  props: {
    title: {
      type: String,
      default: ''
    },
    collapsed: {
      type: Boolean,
      required: true
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';
.secondary-menu {
  height: 100%;
  background-color: var(--color-theme-bg-primary-2);
  width: 13.375rem; /* 214px */

  @media not all and (min-width: theme(--breakpoint-md)) {
    overflow-y: auto;
  }

  .name-outer {
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
    flex-direction: column;
    width: fit-content;
    padding: 0 calc(0.5rem + 1rem);
    padding-top: 3.5rem;
    margin-bottom: 2rem;
    max-width: 100%;

    @media not all and (min-width: theme(--breakpoint-lg)) {
      padding-top: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .name {
      color: var(--color-theme-text-on-primary);
      font-size: var(--text-body-secondary);
      line-height: 1.25rem;
      font-weight: 600;
      hyphens: auto;
      overflow-wrap: break-word;
      width: 100%;
      text-transform: uppercase;
      border-bottom: 1px solid var(--color-theme-text-on-primary);
    }
  }
  .items {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }
}

@media (max-width: 500px) {
  .collapsable,
  .secondary-menu {
    width: calc(100vw - 4.5rem);
  }
}
</style>
