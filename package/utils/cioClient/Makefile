include $(TOPDIR)/rules.mk

PKG_NAME:=cioClient
PKG_RELEASE:=1
PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/cioClient
  SECTION:=utils
  CATEGORY:=Utilities
  TITLE:=AWS IoT MQTT Basic TLS Demo
  DEPENDS:=+libopenssl +libpthread +libc +zlib +libubus +libblobmsg-json +libubox +libjson-c
endef

define Package/cioClient/description
  A  AWS IoT MQTT client demo using TLS, 
  based on cioClient.c from the AWS IoT Device SDK.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(CP) ./src/* $(PKG_BUILD_DIR)/
endef

define Build/Configure
	# No configure step
endef

AWS_SDK_DIR:=$(TOPDIR)/aws-iot-device-sdk-embedded-C

TARGET_CFLAGS += -I$(PKG_BUILD_DIR) \
	-I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/libraries/standard/coreMQTT/source/include \
	-I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/platform/posix/transport/include \
	-I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/platform/posix \
	-I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/libraries/standard/backoffAlgorithm/source/include \
	-I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/demos/include \
	-I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/platform/include \
        -I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/libraries/standard/coreMQTT/source/interface \
	-I$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C/demos/logging-stack

TARGET_LDFLAGS += -lssl -lcrypto -lpthread -lubus -lblobmsg_json -lubox -ljson-c

define Build/Compile
	$(MAKE) -C $(PKG_BUILD_DIR) \
		CC="$(TARGET_CC)" \
		CFLAGS="$(TARGET_CFLAGS)" \
		LDFLAGS="$(TARGET_LDFLAGS)" \
		AWS_SDK_DIR="$(PKG_BUILD_DIR)/aws-iot-device-sdk-embedded-C" \
		all
endef

define Package/cioClient/install
	$(INSTALL_DIR) $(1)/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/cioClient $(1)/bin/
endef

$(eval $(call BuildPackage,cioClient))

