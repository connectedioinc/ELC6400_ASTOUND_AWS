#
# Copyright (C) 2022 Teltonika-Networks
#

include $(TOPDIR)/rules.mk

PKG_NAME:=vuci-ui-core
PKG_VERSION:=2026-02-23-4f4044c88cc
PKG_RELEASE:=3
PKG_LICENSE:=Teltonika-nda-source

PKG_BUILD_PARALLEL:=1
VUCI_APPS=$(shell grep ^CONFIG_PACKAGE_vuci-app.*-ui=y $(TOPDIR)/.config | cut -d'=' -f1 | cut -d'_' -f3 | sed ':a;N;$!ba;s/\n/ /g')
VUCI_PLUGINS=$(shell grep ^CONFIG_PACKAGE_vuci-app.*-ui=m $(TOPDIR)/.config | cut -d'=' -f1 | cut -d'_' -f3 | sed ':a;N;$!ba;s/\n/ /g')

PKG_CONFIG_DEPENDS:=CONFIG_VUCI_USE_HOST_NODE CONFIG_VUCI_BUILD_DEV
MENU_OUTPUT_DIR=applications/menu.d
# used for GPL app file path modification
APP_DIR=$(1)
APP_DIR_2=$(subst -ui,,$(1))
CORE_DIR=$(PKG_BUILD_DIR)/vuci-ui-core/src
FW_APP_DIR=$(1)

include $(INCLUDE_DIR)/package.mk
include ../utils.mk

define Package/vuci-ui-core
	SECTION:=webui
	CATEGORY:=WebUI
	TITLE:=vuci ui core
	DEPENDS:=+api-core
endef

define Package/vuci-ui-core/description
	Provides core ui for VuCI
endef

define Package/vuci-ui-core/config
	source "$(SOURCE)/Config.in"
endef

define Package/vuci-ui-core/conffiles
/etc/config/widget
endef
# FIXME needs update, since .vue files remains in applications dir now.
define install_closed_gpl
	$(INSTALL_DIR) "$(GPL_BUILD_DIR)/package/feeds/vuci"
	rm -rf ~/.npm/

	# Override GPL sources: *.gpl.vue -> *.vue, *.gpl.js -> *.js
	find "$(PKG_BUILD_DIR)" -type f \
		\( -name '*.gpl.vue' -o -name '*.gpl.js' \) | while read f; do \
		target="$${f%.gpl.*}.$${f##*.}"; \
		if [ -f "$$target" ]; then \
			mv -f "$$f" "$$target"; \
		else \
			mv "$$f" "$$target"; \
		fi; \
	done

	$(CP) "$(CORE_DIR)/ui-core/plugins/brand/brand.json" \
		"$(CORE_DIR)/public/brand"

	$(CP) "$(CORE_DIR)/ui-core/plugins/brand/brand.json" \
		"$(CORE_DIR)/dist/www/brand"

	echo "VITE_GPL_BUILD=1" >> $(PKG_BUILD_DIR)/.env

	$(MAKE) -C $(PKG_BUILD_DIR) DL_DIR="$(TOPDIR)/dl/$(PKG_NAME)"

	$(INSTALL_DIR) $(1)/vuci-ui-core/src/dist

	$(CP) "$(CORE_DIR)/dist/www" $(1)/vuci-ui-core/src/dist/

	rm "$(CORE_DIR)/public/brand/brand.json"

	rm "$(CORE_DIR)/dist/www/brand/brand.json"

	$(CP) ../compile-app-gpl.sh "$(GPL_BUILD_DIR)/package/feeds/vuci/"
	$(CP) ../gpl.vite.config.js "$(GPL_BUILD_DIR)/package/feeds/vuci/"
	$(CP) ../gpl.package.json "$(GPL_BUILD_DIR)/package/feeds/vuci/"
endef


define Build/Prepare
	$(INSTALL_DIR) $(PKG_BUILD_DIR)
	mkdir -p $(PKG_BUILD_DIR)/applications
	mkdir -p $(PKG_BUILD_DIR)/vuci-ui-core/src
	mkdir -p $(PKG_BUILD_DIR)/build
	$(CP) ./src/ $(PKG_BUILD_DIR)/vuci-ui-core/
	$(CP) ./src/Makefile $(PKG_BUILD_DIR)/
	$(CP) ../*.config.* $(PKG_BUILD_DIR)/
	$(CP) ../package*.json $(PKG_BUILD_DIR)/
	$(CP) ../.env $(PKG_BUILD_DIR)/
	mkdir -p $(PKG_BUILD_DIR)/tsconfigs
	$(CP) ../tsconfigs $(PKG_BUILD_DIR)/
	$(CP) ../tsconfig.json $(PKG_BUILD_DIR)/

	echo "VUCI_APPS=$(VUCI_APPS)" >> $(PKG_BUILD_DIR)/.env
	echo "VUCI_PLUGINS=$(VUCI_PLUGINS)" >> $(PKG_BUILD_DIR)/.env
	echo "VUCI_BUILD_HASH=$(PKG_VERSION)" >> $(PKG_BUILD_DIR)/.env
	$(CP) -r ../build $(PKG_BUILD_DIR)/
 
	$(if $(CONFIG_GPL_INCLUDE_WEB_SOURCES), \
		sed -i 's|^VUCI_CORE_VERSION:=.*|VUCI_CORE_VERSION:=$(PKG_VERSION)|' ../app.mk
		$(foreach app_dir,$(VUCI_APPS), \
			$(eval app_ui_dir=$(notdir $(app_dir))) \
			$(eval app_target_dir=$(PKG_BUILD_DIR)/applications/$(subst -ui,,$(app_ui_dir))) \
			mkdir -p $(app_target_dir); \
			$(CP) -r ../$(app_dir) $(app_target_dir)/; \
		) \
		$(foreach app_dir,$(VUCI_PLUGINS), \
			$(eval app_ui_dir=$(notdir $(app_dir))) \
			$(eval app_target_dir=$(PKG_BUILD_DIR)/applications/$(subst -ui,,$(app_ui_dir))) \
			mkdir -p $(app_target_dir); \
			$(CP) -r ../$(app_dir) $(app_target_dir)/; \
		), \
		$(CP) -r ../applications/vuci-app-* $(PKG_BUILD_DIR)/applications/ \
	)
	$(RM) -fr $(PKG_BUILD_DIR)/applications/*/vuci-app-*-api
	$(RM) -rf $(PKG_BUILD_DIR)/$(MENU_OUTPUT_DIR)
	mkdir -p $(PKG_BUILD_DIR)/$(MENU_OUTPUT_DIR)
	cd $(PKG_BUILD_DIR) && \
	$(foreach app_dir,$(VUCI_APPS), \
		$(eval APP_PATH=applications/$(subst -ui,,$(app_dir))/$(app_dir)/files/usr/share/vuci/menu.d) \
		if [ -d "$(APP_PATH)" ]; then \
			$(if $(CONFIG_AP_DEVICE), , $(RM) $(APP_PATH)/*.tap.json;) \
			$(if $(CONFIG_SWITCH_DEVICE), , $(RM) $(APP_PATH)/*.tsw.json;) \
			if [ -n "$(CONFIG_SWITCH_DEVICE)" ] || [ -n "$(CONFIG_AP_DEVICE)" ]; then \
				if [ ! -z "$$$$(ls $(APP_PATH)/*.tap.json)" ] || [ ! -z "$$$$(ls $(APP_PATH)/*.tsw.json)" ]; then \
					find $(APP_PATH)/ -type f -not \( -name '*.tap.json' -or -name '*.tsw.json' \) -exec $(RM) {} +; \
				fi; \
			fi; \
			$(CP) $(APP_PATH)/* $(MENU_OUTPUT_DIR)/; \
		fi; \
	)
	$(MAKE) install-only -C $(PKG_BUILD_DIR) CC="$(HOSTCC)" CXX="$(HOSTCXX)" DL_DIR="$(TOPDIR)/dl/$(PKG_NAME)"
endef

define Build/Compile
	$(MAKE) build-only -C $(PKG_BUILD_DIR) CC="$(HOSTCC)" CXX="$(HOSTCXX)" DL_DIR="$(TOPDIR)/dl/$(PKG_NAME)" || { \
		ls -al "$(TOPDIR)/dl/$(PKG_NAME)/node_modules"; \
		ls -al ""$(PKG_BUILD_DIR)/node_modules""; \
		cp -r "$(TOPDIR)/dl/$(PKG_NAME)/node_modules" $(TOPDIR)/bin/; \
		exit 1; \
	}
endef

ifneq ($(CONFIG_VUCI_BUILD_DEV),)
	MAKE_VARS = NODE_ENV=development
endif

ifneq ($(CONFIG_VUCI_USE_HOST_NODE),)
	NODE_EXTRA_PATH =
	ifneq ($(CONFIG_VUCI_NODE_EXTRA_BIN_PATH),)
		NODE_EXTRA_PATH:=":$(CONFIG_VUCI_NODE_EXTRA_BIN_PATH)"
	endif
	NODE_PATH=$(shell PATH=/usr/bin:/usr/local/bin$(NODE_EXTRA_PATH) which node)
	NPM_PATH=$(shell PATH=/usr/bin:/usr/local/bin$(NODE_EXTRA_PATH) which npm)
	ifneq ($(NODE_PATH),)
		MAKE_VARS += NODE=$(NODE_PATH)
	endif
	ifneq ($(NPM_PATH),)
		MAKE_VARS += NPM=$(NPM_PATH)
	endif
else
	MAKE_VARS += NODE=$(STAGING_DIR_HOSTPKG)/bin/node
	MAKE_VARS += NPM=$(STAGING_DIR_HOSTPKG)/bin/npm
endif

define Package/vuci-ui-core/install
	$(INSTALL_DIR) $(1)/www
	$(INSTALL_DIR) $(1)/usr/share/vuci/menu.d
	$(CP) $(PKG_BUILD_DIR)/vuci-ui-core/src/dist/www/* $(1)/www/
	if [ ! -z "$$$$(ls ./modem-icons/$(TLT_PLATFORM_NAME)*)" ]; then \
		$(CP) ./modem-icons/$(TLT_PLATFORM_NAME)* $(1)/www/icons/modem-icons/; \
	fi
	$(CP) ../menu_static.sh $(PKG_BUILD_DIR)
	$(if $(and $(CONFIG_GPL_BUILD),$(if $(CONFIG_GPL_INCLUDE_WEB_SOURCES),,1)), \
		$(RM) -rf $(PKG_BUILD_DIR)/$(MENU_OUTPUT_DIR); \
		mkdir -p $(PKG_BUILD_DIR)/$(MENU_OUTPUT_DIR) && \
		$(foreach app_dir,$(VUCI_APPS), \
			$(eval app_ui_dir=$(notdir $(app_dir))) \
			$(if $(shell find ../$(app_ui_dir)/src -type f -name '*.vue' -print -quit),, \
				$(CP) -fpR ../$(app_ui_dir)/files/usr/share/vuci/menu.d/*.json "$(PKG_BUILD_DIR)/$(MENU_OUTPUT_DIR)/" 2>/dev/null || true; \
			) \
		) \
	)
	$(PKG_BUILD_DIR)/menu_static.sh $(PKG_BUILD_DIR)/menu.json $(PKG_BUILD_DIR)/$(MENU_OUTPUT_DIR)
	$(CP) $(PKG_BUILD_DIR)/menu.json $(1)/usr/share/vuci/menu.d/
	$(if $(CONFIG_VUCI_MINIFY_JSON),$(call JsonMin,$(1)/),true);

endef

define Package/vuci-ui-core/postinst
#!/bin/sh
[ -z "$${IPKG_INSTROOT}" ] && exit 0

uci batch <<-EOF
	set uhttpd.main.ubus_prefix="/ubus"
	set uhttpd.main.index_page='cgi-bin/luci'
	set uhttpd.main.error_page="/404.html"
	commit uhttpd
EOF
/etc/init.d/uhttpd restart
/etc/init.d/rpcd restart
exit 0
endef

$(eval $(call BuildPackage,vuci-ui-core))
