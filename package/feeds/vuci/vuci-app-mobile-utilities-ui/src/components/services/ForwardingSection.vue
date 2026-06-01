<template>
  <vuci-form-item-switch
    :uci-section="s"
    name="enabled"
    :label="$t('Enable')"
    :help="switchHelp"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="every_sms"
    :label="$t('Forward SMS-Utilities rules')"
    :help="$t('Enable/disable SMS-utilities rules forwarding.')"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="delete_sms"
    :label="$t('Don\'t save received message')"
  />
  <vuci-form-item-switch
    :uci-section="s"
    name="sender_num"
    :label="$t('Include sender\'s number')"
    :help="senderHints[sectionName]"
  />
  <vuci-form-item-input
    :uci-section="s"
    name="number_name"
    :label="$t('Number value name')"
    :help="$t('Sender phone number codename for query string name/value pair.')"
    :depend="s.sender_num === '1' && sectionName === 'fwd_to_http'"
    :placeholder="$t('Name')"
    maxlength="16"
    :required="s.enabled === '1'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="mode"
    :label="$t('Mode')"
    :help="$t('Choose which messages are going to be forwarded.')"
    :options="modeOptions"
    initial="everyone"
  />
  <vuci-form-item-list
    :uci-section="s"
    name="tel"
    :label="$t('Sender\'s phone number(s)')"
    :help="$t('Number(s) from which received messages will be forwarded.')"
    rules="phonedigit"
    placeholder="+37000000000"
    :depend="s.mode === 'list_number'"
    :required="s.enabled === '1'"
  />
  <vuci-form-item-select
    :uci-section="s"
    name="group"
    :label="$t('Phone group')"
    :placeholder="$t('No phone groups created')"
    :options="userGroupOptions"
    :required="s.enabled === '1'"
    :depend="s.mode === 'user_group'"
  >
    <template #help>
      {{ $t("Recipient's phone number users group.") }}
      {{ $t('Configure it') }}
      <router-link to="/system/admin/group/phone"> {{ $t('here') }} </router-link>.
    </template>
  </vuci-form-item-select>
</template>

<script>
export default {
  props: {
    s: {
      type: Object,
      required: true
    },
    userGroupOptions: {
      type: Array,
      required: true
    },
    sectionName: {
      type: String,
      required: true
    },
    switchHelp: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      modeOptions: [
        ['everyone', this.$t('Everyone')],
        ['list_number', this.$t('Listed numbers')],
        ['user_group', this.$t('From phone group')]
      ],
      senderHints: {
        fwd_to_http: this.$t('Enable/disable adding original message sender phone number.'),
        fwd_to_sms: this.$t('Enable/disable adding original message sender phone number at the end of message text. Only added if total message length is up to 480 characters.'),
        fwd_to_smtp: this.$t('Enable/disable adding original message sender phone number at the end of email text body.')
      }
    }
  }
}
</script>
