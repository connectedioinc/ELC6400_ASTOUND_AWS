#include "cioClient_config.h"
#include <string.h>

uint16_t get_broker_endpoint_length(void)
{
    return (uint16_t)strlen(g_aws_server);
}

