<template>
  <vuci-form
    v-slot="{ uciData }"
    edit-form
    editing
    config="rpcd"
  >
    <vuci-named-section
      v-slot="{ s }"
      :uci-data="uciData"
      :endpoints="[{ endpoint: 'users/groups/config' }]"
      :name="section.id"
      data-key="groups"
      :title="$utils.getModalTitle($t('group'), section.id)"
    >
      <vuci-form-item-switch
        :uci-section="s"
        :label="$t('Hide sensitive information')"
        :help="
          $t(
            'Enabling this option will restrict this user group from viewing sensitive information, such as passwords, private keys and related data. Editing rights for sensitive information fields will remain available, if applicable.'
          )
        "
        name="hide_sensitive"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Write action')"
        :help="$t('Specifies whether to deny or allow write access for users belonging the group.')"
        name="target_write"
        :options="actionOptions"
        @change="validate"
      />
      <vuci-form-item-list
        :uci-section="s"
        type="tlt-select"
        :label="$t('Write access')"
        :help="$t('Controls the ability of users to change and execute the contents (e.g., admin/network/lan).')"
        name="write"
        placeholder="*"
        :options="aclOptions"
        :rules="validatePermission"
      />
      <vuci-form-item-select
        :uci-section="s"
        :label="$t('Read action')"
        :help="$t('Specifies whether to deny or allow read access for users belonging the group.')"
        name="target_read"
        :options="actionOptions"
        @change="validate"
      />
      <vuci-form-item-list
        :uci-section="s"
        type="tlt-select"
        :label="$t('Read access')"
        :help="$t('Controls the ability of users to navigate the contents (e.g, admin/network/*).')"
        name="read"
        placeholder="*"
        :options="aclOptions"
        :rules="validateNonPagePermissions"
        @change="validate"
      />
    </vuci-named-section>
  </vuci-form>
</template>
<script>
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import * as Types from '@ui-core/types'

export default {
  props: {
    section: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      actionOptions: [
        ['allow', this.$t('Allow')],
        ['deny', this.$t('Deny')]
      ],
      nonPagePermissions: ['system/reboot', 'services/hotspot/general/userscripts', 'status/widget']
    }
  },
  computed: {
    /**
     * Custom paths to add to select options
     * @returns {({name: string, condition: boolean} | string)[]}
     */
    customPaths() {
      return [
        'system/reboot',
        {
          name: 'services/hotspot/general/userscripts',
          condition: this.$store.hasPackages(['coovachilli-ui', 'coovachilli-api'])
        },
        {
          name: 'status/widget',
          condition: this.$store.hasPackages(['side-widget-ui', 'side-widget-api'])
        }
      ]
    },
    /**
     * Converted acl paths to be used in select
     * @returns {string[]}
     */
    aclOptions() {
      const aclMap = new Map()
      for (const path of this.allAclPaths) {
        for (const acl of path.acls) {
          aclMap.set(acl, path.name)
        }
      }
      const items = Array.from(aclMap.keys()).map(acl => {
        const item = this.crumbs.find(d => d.path === acl)
        const breadcrumbPath = item.crumbs ? this.generateBreadcrumbs(item.crumbs) : this.noAclPaths(acl)
        return [acl, breadcrumbPath]
      })
      return [['*', this.$t('All pages')], ...items]
    },
    /**
     * Generates breadcrumb data for all ACL paths
     * @returns {Array}
     */
    crumbs() {
      return this.allAclPaths.map(route => ({
        title: route.title,
        path: route.acls[0],
        crumbs: route.crumbs ?? route?.meta?.route?.map(r => ({ name: r.title, path: r.path }))
      }))
    },
    /**
     * @typedef {object} AclPaths
     * @prop {string} name - path name
     * @prop {string[]} acls - array of acls assigned to this path
     */
    /**
     * All possible paths that can be controlled with acls
     * @returns {AclPaths[]}
     */
    allAclPaths() {
      const paths = this.getAclPaths(this.$store.menus)
      for (const path of this.customPaths) {
        if (typeof path === 'object') {
          if (path.condition) this.insertPath(paths, path.name)
        } else {
          this.insertPath(paths, path)
        }
      }
      return paths
    }
  },
  methods: {
    /**
     * Returns formatted path name if path has no crumbs
     * @param {string} path - The path to format.
     * @returns {string} - The formatted path.
     */
    noAclPaths(path) {
      return path.split('/').map(this.$capitalize).join(' > ')
    },
    /**
     * Generates breadcrumb names from crumbs.
     * @param {Array} crumbs - Array of crumbs.
     * @returns {string[]} - Array of breadcrumb names.
     */
    generateBreadcrumbs(crumbs) {
      return crumbs.map(crumb => crumb.name).join(' > ')
    },
    /**
     * Gets an array of paths and their acls from menu tree
     * @param {Types.MenuItem[]} menus
     * @returns {AclPaths[]}
     */
    getAclPaths(menus) {
      return Array.from(this.menuIterator(menus)).map(item => ({
        name: item.path.substring(1),
        acls: item.acls || [item.path.substring(1)],
        crumbs: item?.meta?.route?.map(r => ({ name: r.title, path: r.path })),
        title: item.title
      }))
    },
    /**
     * Inserts a new path into paths array next to a relatively closest path
     * @param {AclPaths[]} paths
     * @param {string} newPath
     */
    insertPath(paths, newPath) {
      const newPathParts = newPath.split('/')
      let mostMatches = 0
      let insertIndex = 0
      for (let i = 1; i < paths.length; i++) {
        let matches = 0
        const pathParts = paths[i].name.split('/')
        for (let j = 0; j < newPathParts.length; j++) {
          if (pathParts[j] === newPathParts[j]) {
            matches += 1
            if (matches >= mostMatches) {
              mostMatches = matches
              insertIndex = i + 1
            }
          } else break
        }
      }
      const newAclPath = { name: newPath, acls: [newPath] }
      if (mostMatches > 0) paths.splice(insertIndex, 0, newAclPath)
      else paths.push(newAclPath)
    },
    /**
     * Preorder traversal menu item iterator
     * @param {Types.MenuItem[]} menuArray
     */
    *menuIterator(menuArray) {
      for (const menuItem of menuArray) {
        yield menuItem
        if (menuItem.children) {
          yield* this.menuIterator(menuItem.children)
        }
      }
    },
    /**
     * Prevents write-only acls
     */
    validatePermission(val) {
      if (this.section.target_write !== 'allow') return { isValid: true }
      const read = this.section.read
      const targetRead = this.section.target_read
      const includesRead = read.some(readVal => val.startsWith(readVal) || readVal === '*')
      if (val !== '*' && ((targetRead === 'deny' && includesRead) || (targetRead === 'allow' && !includesRead))) {
        return { isValid: false, message: 'Cannot be write-only' }
      }
      return { isValid: true }
    },
    validateNonPagePermissions(_, self) {
      const isValid = self.model.length > self.model.filter(r => this.nonPagePermissions.includes(r)).length
      return { isValid: isValid, message: this.$t('This is not page-level permission. Please add at least one page-level permission.') }
    },
    validate(self) {
      this.$nextTick(() => self?.vuciForm.validate())
    }
  }
}
</script>
