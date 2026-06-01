#ifndef COMMAND_HANDLER_H
#define COMMAND_HANDLER_H

#define MAX_CMD_PARAMS 8
#define CMD_FIELD_SIZE 256
#include "core_mqtt.h"
typedef struct {
    char notificationID[CMD_FIELD_SIZE];
    char commandType[CMD_FIELD_SIZE];
    char params[MAX_CMD_PARAMS][CMD_FIELD_SIZE];
    int  paramCount;
} ServerCommand;

void handle_server_command(MQTTContext_t * pMqttContext, const ServerCommand *cmd);
void publish_command_response(MQTTContext_t *pMqttContext, const char *topic, const char *notificationID, const char *status, const char *response);
#endif
