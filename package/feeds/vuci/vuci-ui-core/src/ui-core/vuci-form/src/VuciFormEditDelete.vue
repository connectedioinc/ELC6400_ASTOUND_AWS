<template>
  <div :toggleable="false">
    <div class="flex flex-wrap gap-2.5">
      <slot
        v-if="edit"
        :id="id"
        :open-edit="openEdit"
        name="edit"
      >
        <tlt-button
          :disabled="false"
          button-id="edit"
          :icon-left="$store.readOnlyPage ? 'password' : 'edit'"
          class="gap-1!"
          type="text"
          @click="openEdit(id)"
        >
          {{ $store.readOnlyPage ? $t('View') : $t('Edit') }}
        </tlt-button>
      </slot>
      <slot
        v-if="deleteBtn"
        :del-section="delSection"
        name="delete"
      >
        <tlt-button
          button-id="delete"
          type="text"
          color="error"
          @click="delSection(id)"
          >{{ $t('Delete') }}</tlt-button
        >
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouteQueryWatcher } from '@ui-core/composables/useRouteQueryWatcher'

export interface Props {
  type?: string
  edit?: boolean
  id?: string
  deleteBtn?: boolean
  actions?: {
    edit: (sid: string) => void
    delete: (sid: string) => void
  }
}

const props = withDefaults(defineProps<Props>(), {
  type: '',
  edit: true,
  id: '',
  deleteBtn: true,
  actions: () => ({
    edit: () => ({}),
    delete: () => ({})
  })
})

function openEdit(sid: string) {
  props.actions.edit(sid)
}

function delSection(sid: string) {
  props.actions.delete(sid)
}

useRouteQueryWatcher(query => {
  if (!props.id) return

  if (props.edit && query.edit === props.id) {
    return openEdit(props.id)
  }

  if (props.deleteBtn && query.delete === props.id) {
    return delSection(props.id)
  }
})
</script>
