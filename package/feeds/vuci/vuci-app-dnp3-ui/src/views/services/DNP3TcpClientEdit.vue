<template>
  <vuci-form
    v-slot="{ uciData }"
    ref="form"
    editing
    config="dnp3_client"
  >
    <vuci-named-section
      v-slot="{ s }"
      :name="section.id"
      :title="$utils.getModalTitle($t('TCP client'), section.name)"
      :uci-data="uciData"
      data-key="dnp3"
      :endpoints="[{ endpoint: 'dnp3/tcp/config' }]"
    >
      <dnp-3-common-edit-fields
        :form-data="uciData"
        :section="s"
        tcp-client
      >
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('IP address')"
          :help="$t('DNP3 Outstation IP address.')"
          name="ip"
          placeholder="1.1.1.1"
          rules="ipaddr"
          required
        />
        <vuci-form-item-input
          :uci-section="s"
          :label="$t('Port')"
          :help="$t('DNP3 Outstation Port.')"
          name="port"
          placeholder="20000"
          rules="port"
          required
        />
      </dnp-3-common-edit-fields>
    </vuci-named-section>
    <dnp-3-common-interface-fields
      tcp-client
      :uci-data="uciData"
      :section="section"
    />
    <dnp-3-testing-element
      :section="section"
      tcp-client
      :form-data="uciData"
      :form-ref="$refs.form"
    />
  </vuci-form>
</template>

<script>
import Dnp3TestingElement from './Dnp3TestingElement.vue'
import Dnp3CommonInterfaceFields from './Dnp3CommonInterfaceFields.vue'
import Dnp3CommonEditFields from './Dnp3CommonEditFields.vue'
export default {
  components: {
    Dnp3TestingElement,
    Dnp3CommonInterfaceFields,
    Dnp3CommonEditFields
  },
  props: {
    section: {
      type: Object,
      default: () => ({})
    }
  }
}
</script>
