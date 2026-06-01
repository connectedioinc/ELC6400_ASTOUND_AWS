// single_instance.c
#include <fcntl.h>
#include <sys/file.h>
#include <unistd.h>
#include <stdio.h>
#include <stdlib.h>
#include <errno.h>

static int lock_fd = -1;
static const char *pidfile = "/var/run/coap_watchdog.pid";

int single_instance_or_exit(void) {
    	lock_fd = open(pidfile, O_RDWR|O_CREAT, 0644);
    	if (lock_fd < 0) {
        	perror("open pidfile");
        	exit(1);
    	}
    	if (flock(lock_fd, LOCK_EX | LOCK_NB) < 0) {
        	if (errno == EWOULDBLOCK) {
            		// another instance holds the lock
            		fprintf(stderr, "Another coap_watchdog is running\n");
            		return -1;
        	}
        	perror("flock");
        	exit(1);
    	}
    	// record our pid for info (optional)
    	if (ftruncate(lock_fd, 0) == 0) {
        	dprintf(lock_fd, "%ld\n", (long)getpid());
        	fsync(lock_fd);
    	}
    	// keep lock_fd open until exit, so lock remains held
    	return 0;
}

void single_instance_cleanup(void) {
    	if (lock_fd >= 0) {
        	// releasing lock and closing; file may remain, that’s fine
        	flock(lock_fd, LOCK_UN);
        	close(lock_fd);
        	lock_fd = -1;
    	}
}
