WFLAGS=-Wall -Wextra -Wno-unused-parameter
INCLUDES=-Iinclude

LIBNAME=lua_crypto.so

all: $(LIBNAME)

%.o: %.c
	$(CC) $(WFLAGS) -fPIC -c -o $@ $(INCLUDES) $(CFLAGS) $<

LIBNL_OBJ=lua_crypto.o

$(LIBNAME): $(LIBNL_OBJ)
	$(CC) -Wall -lssl -lcrypto -llua -shared -fPIC -DLUA_USE_POSIX -DLUA_USE_DLOPEN -o $@ $^ -I/usr/include/lua5.1
