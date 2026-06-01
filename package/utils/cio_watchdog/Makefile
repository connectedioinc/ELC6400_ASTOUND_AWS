
include $(TOPDIR)/rules.mk

PKG_NAME:=cio_watchdog
PKG_RELEASE:=1

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

TARGET_LDFLAGS+=-lmosquitto -L$(BUILD_DIR)/openssl-1.0.2e/ -lssl


define Package/cio_watchdog
   SECTION:=utils
   CATEGORY:=Utilities
   TITLE:=cioClient emergency channel
   DEPENDS:=+libopenssl +libc +libpthread libcurl mosquitto libmosquitto mosquitto-ssl libmosquitto-ssl libjson-c zlib
   BUILD_DEPENDS:=+libc
endef

define Build/Prepare
	mkdir	-p $(PKG_BUILD_DIR)
	$(CP)	./src/* $(PKG_BUILD_DIR)/
	##[ -f $(PKG_BUILD_DIR)/cio_watchdog ] && rm $(PKG_BUILD_DIR)/cio_watchdog
endef

define Build/Configure
endef

define Package/PKG_NAME/description
	emergency channel
endef

define Build/Compile
	echo "Compiling cio_watchdog"
	$(MAKE) -C $(PKG_BUILD_DIR) CC="$(TARGET_CROSS)gcc" CROSS_COMPILE="$(TARGET_CROSS)" LDFLAGS="$(TARGET_LDFLAGS)"
endef

define Package/cio_watchdog/install
	mkdir -p $(1)/bin/
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/cio_watchdog $(1)/bin/
endef

$(eval $(call BuildPackage,cio_watchdog))
