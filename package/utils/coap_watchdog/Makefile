include $(TOPDIR)/rules.mk

PKG_NAME:=coap_watchdog
PKG_VERSION:=1.0.0
PKG_RELEASE:=3

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/coap_watchdog
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=CoAP watchdog client (libcoap + OpenSSL)
  DEPENDS:=+libcoap3 +libopenssl +libjson-c +zlib +libuci
endef

define Package/coap_watchdog/description
 Small DTLS/CoAPS watchdog client using libcoap + OpenSSL.
endef

# Copy our sources into the build dir
define Build/Prepare
	$(call Build/Prepare/Default)
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) ./src/* $(PKG_BUILD_DIR)/
endef

# Make sure we compile and link against the staged libs/headers
TARGET_CFLAGS  += -I$(STAGING_DIR)/usr/include
TARGET_LDFLAGS += -L$(STAGING_DIR)/usr/lib

# Compile the binary explicitly (no cmake/autotools needed)
define Build/Compile
	@echo "*** compiling coap_watchdog at $(PKG_BUILD_DIR)"
	$(TARGET_CC) $(TARGET_CFLAGS) \
		-o $(PKG_BUILD_DIR)/coap_watchdog \
		$(PKG_BUILD_DIR)/coap_watchdog.c \
		$(PKG_BUILD_DIR)/cioclient_log.c \
		$(PKG_BUILD_DIR)/single_instance.c \
		-lcoap-3 -lssl -lcrypto -ljson-c -lz -luci
endef

# Install into the image / ipk
define Package/coap_watchdog/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/coap_watchdog $(1)/usr/bin/
endef

$(eval $(call BuildPackage,coap_watchdog))
