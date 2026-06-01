CC ?= gcc
AWS_SDK_DIR := $(CURDIR)/aws-iot-device-sdk-embedded-C

CFLAGS += -I$(CURDIR) \
          -I$(AWS_SDK_DIR)/libraries/standard/coreMQTT/source/include \
          -I$(AWS_SDK_DIR)/platform/posix/transport/source/include \
          -I$(AWS_SDK_DIR)/platform/posix \
          -I$(AWS_SDK_DIR)/libraries/standard/backoffAlgorithm/source/include \
          -I$(AWS_SDK_DIR)/demos/include \
          -I$(AWS_SDK_DIR)/platform/include \
          -I$(AWS_SDK_DIR)/libraries/standard/coreMQTT/source/interface \
          -I$(AWS_SDK_DIR)/demos/logging-stack

LDFLAGS += -lssl -lcrypto -lpthread -lubus -lblobmsg_json -lubox -ljson-c

SRC = cioClient.c cioclient_log.c onConnectData.c utilities.c provision.c publish_utils.c command_handler.c command_response.c firmware_upgrade.c log_upload.c config_restore.c modem_upgrade.c \
      cjson/cJSON.c data_track.c cioClient_config.c \
      $(AWS_SDK_DIR)/libraries/standard/coreMQTT/source/core_mqtt.c \
      $(AWS_SDK_DIR)/libraries/standard/coreMQTT/source/core_mqtt_serializer.c \
      $(AWS_SDK_DIR)/libraries/standard/coreMQTT/source/core_mqtt_state.c \
      $(AWS_SDK_DIR)/libraries/standard/backoffAlgorithm/source/backoff_algorithm.c \
      $(AWS_SDK_DIR)/platform/posix/transport/src/openssl_posix.c \
      $(AWS_SDK_DIR)/platform/posix/transport/src/sockets_posix.c \
      $(AWS_SDK_DIR)/platform/posix/clock_posix.c

OBJ = $(SRC:.c=.o)

all: cioClient

cioClient: $(OBJ)
	$(CC) $(OBJ) -o $@ $(LDFLAGS)

clean:
	rm -f $(OBJ) cioClient

