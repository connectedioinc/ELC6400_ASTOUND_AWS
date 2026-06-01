<template>
  <section>
    Make invalid:
    <input
      v-model="invalid"
      type="checkbox"
    />
    <div class="t-grid">
      <div></div>
      <div class="descriptor">No icon</div>
      <div class="descriptor">Icon Left</div>
      <div class="descriptor">icon Right</div>
      <div class="contents">
        <div class="descriptor">Default</div>
        <div class="field">
          <tlt-text-area v-model="value" />
        </div>
        <div class="field">
          <tlt-text-area v-model="value" />
        </div>
        <div class="field">
          <tlt-text-area
            v-model="value"
            icon-right="gear"
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">Default with placeholder</div>
        <div class="field">
          <tlt-text-area
            v-model="value"
            copy-button
            placeholder="route 192.168.1.0 255.255.255.0"
          />
        </div>
        <div class="field">
          <tlt-text-area
            v-model="value"
            placeholder="route 192.168.1.0 255.255.255.0"
          />
        </div>
        <div class="field">
          <tlt-text-area
            v-model="value"
            icon-right="gear"
            placeholder="route 192.168.1.0 255.255.255.0"
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">Disabled</div>
        <div class="field">
          <tlt-text-area
            v-model="value"
            disabled
          />
        </div>
        <div class="field">
          <tlt-text-area
            v-model="value"
            disabled
          />
        </div>
        <div class="field">
          <tlt-text-area
            v-model="value"
            icon-right="gear"
            disabled
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  provide() {
    return {
      valid: () => !this.invalid,
      maxlength: 321
    }
  },
  data() {
    return {
      value: '',
      invalid: false
    }
  }
}
</script>

<style scoped>
@reference '@/theme.css';

.t-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(10rem, max-content));
  row-gap: 1.5rem;
  column-gap: 2rem;
}
.t-grid .descriptor {
  @apply text-fish font-semibold uppercase;
}
.t-grid .field {
  @apply w-80;
}
</style>
