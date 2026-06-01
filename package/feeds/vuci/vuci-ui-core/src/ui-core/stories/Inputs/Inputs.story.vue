<template>
  <section>
    <div>
      Valid:
      <input
        v-model="valid"
        type="checkbox"
      />
    </div>
    <div>
      Warning:
      <input
        v-model="warning"
        type="checkbox"
      />
    </div>
    <div class="t-grid">
      <div></div>
      <div class="descriptor">No icon</div>
      <div class="descriptor">Icon Left</div>
      <div class="descriptor">icon Right</div>
      <div class="descriptor">Icon Both</div>
      <div class="contents">
        <div class="descriptor">Default</div>
        <div class="field">
          <tlt-input v-model="value" />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon="search"
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon-right="gear"
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon="search"
            icon-right="gear"
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">placeholder</div>
        <div class="field">
          <tlt-input
            v-model="value"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon="search"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon-right="gear"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon="search"
            icon-right="gear"
            placeholder="e.g., route 192.168.1.0 255.255.255.0"
          />
        </div>
      </div>
      <div class="contents">
        <div class="descriptor">Disabled</div>
        <div class="field">
          <tlt-input
            v-model="value"
            disabled
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon="search"
            disabled
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon-right="gear"
            disabled
          />
        </div>
        <div class="field">
          <tlt-input
            v-model="value"
            icon="search"
            icon-right="gear"
            disabled
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { KEY_VALID, KEY_WARNING } from '@ui-core/tlt-design/form/core/_shared/constants'
import { provide } from 'vue'
import { ref } from 'vue'
const valid = ref(true)
const warning = ref(false)
const value = ref('')
provide(KEY_VALID, valid)
provide(KEY_WARNING, warning)
</script>

<style scoped>
@reference '@/theme.css';

.t-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(10rem, max-content));
  row-gap: 1.5rem;
  column-gap: 2rem;
}
.t-grid .descriptor {
  @apply text-lg font-semibold uppercase;
}
.t-grid .field {
  @apply w-40;
}
</style>
