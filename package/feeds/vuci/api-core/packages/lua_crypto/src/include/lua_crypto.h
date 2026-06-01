#include "lua.h"
#include "lauxlib.h"
#include "lualib.h"
#include <stdio.h>
#include <string.h>
#include <openssl/hmac.h>
#include <openssl/ecdsa.h>
#include <openssl/ec.h>
#include <openssl/evp.h>
#include <openssl/pem.h>

#define B64_ENCODE_BUF_LEN(sn) (1 + ((sn + 2) / 3 * 4))
#define BUFFER_SIZE 2048