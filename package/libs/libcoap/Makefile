include $(TOPDIR)/rules.mk

PKG_NAME:=libcoap
PKG_VERSION:=4.3.5
PKG_RELEASE:=1

# GitHub “refs/tags” tarball (name is vX.Y.Z.tar.gz)
PKG_SOURCE:=v$(PKG_VERSION).tar.gz
PKG_SOURCE_URL:=https://github.com/obgm/libcoap/archive/refs/tags
# Replace this with the real hash if you want reproducible builds.
PKG_HASH:=skip

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)-$(PKG_VERSION)
PKG_BUILD_PARALLEL:=1
PKG_INSTALL:=1

PKG_LICENSE:=BSD-2-Clause GPL-2.0-or-later
PKG_LICENSE_FILES:=LICENSE.BSD LICENSE.GPL
PKG_MAINTAINER:=you <you@example.com>

include $(INCLUDE_DIR)/package.mk
include $(INCLUDE_DIR)/cmake.mk

# ===== Packages =====
define Package/libcoap3
  SECTION:=libs
  CATEGORY:=Libraries
  TITLE:=libcoap (CoAP RFC 7252) with OpenSSL (DTLS/TLS)
  DEPENDS:=+libopenssl +zlib
endef

define Package/libcoap3/description
Lightweight CoAP library with OpenSSL backend (DTLS/TLS).
endef

define Package/coap-client
  SECTION:=net
  CATEGORY:=Network
  TITLE:=libcoap example client (coap-client)
  DEPENDS:=+libcoap3 +libopenssl +zlib
endef

define Package/coap-client/description
Command-line CoAP client built from libcoap examples, with DTLS/TLS (OpenSSL).
endef

# ===== Build config =====
# Important:
#   - OPENSSL_API_COMPAT >= 0x10100000L ensures libcoap won’t compile legacy init paths
#   - OPENSSL_NO_ENGINE disables all ENGINE_* usage (OpenSSL 3 typically has ENGINE off)
# Force OpenSSL 1.1+/3 behavior and nuke ENGINE everywhere
# These must hit every compile of libcoap sources
TARGET_CFLAGS += -DOPENSSL_API_COMPAT=0x10100000L -DOPENSSL_NO_ENGINE=1 -DHAVE_OPENSSL_ENGINE=0
# Force-include our header into every C translation unit
TARGET_CFLAGS += -include $(PKG_BUILD_DIR)/no_engine.h

# Belt & suspenders: also feed them via CMake C flags
CMAKE_OPTIONS += -DCMAKE_C_FLAGS="$(TARGET_CFLAGS) -DOPENSSL_NO_ENGINE=1 -DHAVE_OPENSSL_ENGINE=0 -include $(PKG_BUILD_DIR)/no_engine.h"

# Your normal options…
CMAKE_OPTIONS += \
  -DBUILD_SHARED_LIBS=ON -DENABLE_EXAMPLES=ON -DENABLE_TESTS=OFF -DENABLE_DOCS=OFF \
  -DCOAP_WITH_OPENSSL=ON -DCOAP_WITH_GNUTLS=OFF -DCOAP_WITH_TINYDTLS=OFF \
  -DOPENSSL_ROOT_DIR=$(STAGING_DIR)/usr \
  -DOPENSSL_INCLUDE_DIR=$(STAGING_DIR)/usr/include \
  -DOPENSSL_CRYPTO_LIBRARY=$(STAGING_DIR)/usr/lib/libcrypto.so \
  -DOPENSSL_SSL_LIBRARY=$(STAGING_DIR)/usr/lib/libssl.so

define Prepare/Default
	$(call Build/Prepare/Default)
	# Relax DTLS minimum from 1.2 -> 1.0 so we can talk to legacy servers
	# This touches only coap_openssl.c in the build tree.
	[ -f $(PKG_BUILD_DIR)/src/coap_openssl.c ] && \
	$(SED) -i 's/DTLS1_2_VERSION/DTLS1_VERSION/g' \
	  $(PKG_BUILD_DIR)/src/coap_openssl.c
endef
  
define Build/Prepare
	$(call Build/Prepare/Default)
	# Write a compat header that disables ENGINE
	( \
		echo "/* no_engine.h: force libcoap to build without ENGINE */"; \
		echo "#ifndef OPENSSL_API_COMPAT"; \
		echo "#define OPENSSL_API_COMPAT 0x10100000L"; \
		echo "#endif"; \
		echo "#ifndef OPENSSL_NO_ENGINE"; \
		echo "#define OPENSSL_NO_ENGINE 1"; \
		echo "#endif"; \
		echo "#undef HAVE_OPENSSL_ENGINE"; \
		echo "#define HAVE_OPENSSL_ENGINE 0"; \
		echo "#ifdef SSL_library_init"; \
		echo "# undef SSL_library_init"; \
		echo "#endif"; \
		echo "#define SSL_library_init() /* no-op */"; \
		echo "#ifdef SSL_load_error_strings"; \
		echo "# undef SSL_load_error_strings"; \
		echo "#endif"; \
		echo "#define SSL_load_error_strings() /* no-op */"; \
		echo "#define ENGINE_by_id(...)             (NULL)"; \
		echo "#define ENGINE_init(...)              0"; \
		echo "#define ENGINE_free(...)              0"; \
		echo "#define ENGINE_finish(...)            0"; \
		echo "#define ENGINE_ctrl_cmd(...)          0"; \
		echo "#define ENGINE_ctrl_cmd_string(...)   0"; \
		echo "#define ENGINE_set_default(...)       0"; \
		echo "#define ENGINE_load_private_key(...)  (NULL)"; \
		echo "#define ENGINE_load_dynamic(...)      /* nothing */"; \
		echo "#define SSLeay(...)                   0L"; \
	) > $(PKG_BUILD_DIR)/no_engine.h
endef


# ===== Install =====
define Build/InstallDev
	# headers
	$(INSTALL_DIR) $(1)/usr/include
	$(CP) $(PKG_INSTALL_DIR)/usr/include/* $(1)/usr/include/

	# libraries
	$(INSTALL_DIR) $(1)/usr/lib
	$(CP) $(PKG_INSTALL_DIR)/usr/lib/libcoap-3*.so* $(1)/usr/lib/

	# pkg-config (if provided by the build)
	$(INSTALL_DIR) $(1)/usr/lib/pkgconfig
	-$(CP) $(PKG_INSTALL_DIR)/usr/lib/pkgconfig/libcoap-3*.pc $(1)/usr/lib/pkgconfig/
endef

define Package/libcoap3/install
	$(INSTALL_DIR) $(1)/usr/lib
	$(CP) $(PKG_INSTALL_DIR)/usr/lib/libcoap-3*.so* $(1)/usr/lib/
endef

define Package/coap-client/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(CP) $(PKG_BUILD_DIR)/coap-client $(1)/usr/bin/
endef

$(eval $(call BuildPackage,libcoap3))
$(eval $(call BuildPackage,coap-client))

