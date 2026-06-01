WFLAGS=-Wall -Wextra -Wno-unused-parameter
INCLUDES=-Iinclude

LIBNAME=lualibparam.so

all: $(LIBNAME)

%.o: %.c
	$(CC) $(WFLAGS) -fPIC -c -o $@ $(INCLUDES) $(CFLAGS) $<

LIBNL_OBJ=lualibparam.o

LDFLAGS+=-lparam -lubus -llua

ifneq (,$(findstring MOBILE_SUPPORT,$(CFLAGS)))
LDFLAGS+=-lgsm
endif

$(LIBNAME): $(LIBNL_OBJ)
	$(CC) $(LDFLAGS) -Wall -shared -fPIC -DLUA_USE_POSIX -DLUA_USE_DLOPEN -o $@ $^ -I/usr/include/lua5.1
