##################################################################################
# cio_watchdog - a simple client that talks to CIO server in an emergency situation
##################################################################################

SHELL=/bin/bash

SRC=cio_watchdog.c cioclient_log.c 

all: cio_watchdog 

cio_watchdog: $(SRC)
	@echo "Building: $@"
	$(CC) $^ -w -DENABLE_TLS_PSK -DRELEASE -L. -lmosquitto -Wl,-Bdynamic $(CFLAGS) $(LDFLAGS) -lcrypto -pthread -lcurl -ljson-c -lz -o $@
	-@$(CROSS_COMPILE)strip cio_watchdog
	
cio_watchdog.debug: $(SRC)
	@echo "Building: $@"
	$(CC) $^ -g -w -DDEBUG -DENABLE_TLS_PSK -lmosquitto $(CFLAGS) $(LDFLAGS) -o $@
	
simulation_start:
	@echo "Starting device simulation"
	@sleep 3
	for i in {000000000000001..000000000000509}; do ./cio_watchdog.debug $$i & done;

simulation_stop:
	killall -9 cio_watchdog.debug && echo "Stop simulation successfully"
	
clean:
	rm -f cio_watchdog cio_watchdog.debug
