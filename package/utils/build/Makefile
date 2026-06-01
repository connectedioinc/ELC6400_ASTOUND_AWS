#
# Copyright (C) 2012 OpenWrt.org
#
# This is free software, licensed under the GNU General Public License v2.
# See /LICENSE for more information.
#
include $(TOPDIR)/rules.mk

PKG_NAME:=build
PKG_RELEASE:=1

PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/build
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=Connected IO Test Tool
  DEPENDS:=
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	if ! test -f src/build-number.txt; then echo 0 > src/build-number.txt; fi
	echo $$$$(($$$$(cat src/build-number.txt) + 1)) > src/build-number.txt 
	echo "#define __BUILD_DATE \"$$$$(date)"\" > src/build-date.h
	echo "#define __CIO_VERSION \"$$$$(cat src/cio-version.txt)"\" > src/cio-version.h
	echo "#define __BUILD_NUMBER $$$$(cat src/build-number.txt)" > src/build-number.h
	$(CP) ./src/* $(PKG_BUILD_DIR)/
endef

define Build/Configure
endef

define Build/Compile
	$(MAKE) -C $(PKG_BUILD_DIR) \
		CC="$(TARGET_CC)" \
		CFLAGS="$(TARGET_CFLAGS) -Wall" \
		LDFLAGS="$(TARGET_LDFLAGS)"
endef

define Package/build/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/build $(1)/usr/bin/
endef

$(eval $(call BuildPackage,build))
