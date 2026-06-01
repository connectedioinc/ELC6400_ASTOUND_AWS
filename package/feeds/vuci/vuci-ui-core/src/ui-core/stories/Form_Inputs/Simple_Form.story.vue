<template>
  <section>
    <tlt-form
      sid="testas"
      :model="form"
    >
      <tlt-form-item-switch
        prop="switch"
        sid="test"
        label="Enable OpenVPN1"
      />
      <tlt-form-item-switch
        prop="switch2"
        sid="test"
        label="Enable OpenVPN config from file2"
        help="this is help for this switch component"
        required
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="input"
        label="Port3"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switcha"
        sid="test"
        label="Enable OpenVPN4"
      />
      <tlt-form-item-switch
        prop="switch2c"
        sid="test"
        label="Enable OpenVPN config from file5"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inputdq"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switchvxc"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switch2bdf"
        sid="test"
        label="Enable OpenVPN config from file"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inpuvbt"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switch"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switc463h2"
        sid="te347st"
        label="Enable OpenVPN config from file"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inp89884ut"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switch48a"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switc46h2c"
        sid="test"
        label="Enable OpenVPN config from file"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inputd35q"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switchvxc"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switch2bdq1f"
        sid="test"
        label="Enable OpenVPN config from file"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inpuv356bt"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switchvxc"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switch2bdf"
        sid="test"
        label="Enable OpenVPN config from file"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inpuvbt"
        label="Port"
        maxlength="10"
      >
        <template #help>
          this is help for this switch component
          <button class="bg-theme-text-primary">focusable element</button>
        </template>
      </tlt-form-item-input>
      <tlt-form-item-switch
        prop="switch"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switc463h2"
        sid="te347st"
        label="Enable OpenVPN config from focusable"
      >
        <template #help>
          this is help for this switch component
          <button class="bg-theme-text-primary">focusable element</button>
        </template>
      </tlt-form-item-switch>
      <tlt-form-item-input
        v-model="form.input"
        prop="inp89884ut"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switch48a"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switc46h2c"
        sid="test"
        label="Enable OpenVPN config from file"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inputd35q"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-switch
        prop="switchvxc"
        sid="test"
        label="Enable OpenVPN"
      />
      <tlt-form-item-switch
        prop="switch2bdq1f"
        sid="test"
        label="Enable OpenVPN config from file"
        help="this is help for this switch component"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inpuv356bt"
        label="Port"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
    </tlt-form>
    <h2 class="text-salmon font-semibold my-6">Inline form</h2>
    <tlt-form
      sid="testas"
      :model="form"
      inline
    >
      <tlt-form-item-input
        v-model="form.input"
        prop="ainputcq"
        label="Port1"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-input
        v-model="form.input"
        prop="inpautcq"
        label="Port2"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
      <tlt-form-item-select
        v-model="form.input"
        prop="inaputcq"
        label="Port3"
        maxlength="10"
        help="this in input help and it will be shown when there are no errors on the input"
      />
    </tlt-form>
  </section>
</template>

<script>
export default {
  data() {
    return {
      form: {
        input: ''
      }
    }
  }
}
</script>
