#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <stdarg.h>

#define LOG_FILE "/overlay/coap_watchdog.log"
#define LOG_FILE_ROTATED "/overlay/coap_watchdog.log.1"
#define LOG_MAX_SIZE 51200 // 50KB
#define LOG_LEVEL_INFO  "INFO"
#define LOG_LEVEL_ERROR "ERROR"
#define LOG_LEVEL_DEBUG "DEBUG"

#include "cioclient_log.h"

// Function to get the current timestamp
void get_timestamp(char *buffer, size_t size) {
    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    strftime(buffer, size, "%Y-%m-%d %H:%M:%S", t);
}

// Function to rotate the log file if it exceeds the size limit
void rotate_log_file() {
    FILE *log_file = fopen(LOG_FILE, "r");
    if (log_file) {
        fseek(log_file, 0, SEEK_END);
        long file_size = ftell(log_file);
        fclose(log_file);

        if (file_size >= LOG_MAX_SIZE) {
            // Rotate the log file
            remove(LOG_FILE_ROTATED);                // Remove old rotated file
            rename(LOG_FILE, LOG_FILE_ROTATED);      // Rename current log file
        }
    }
}

// Function to write a formatted log message
void log_message(const char *level, const char *format, ...) {
    rotate_log_file(); // Check if rotation is needed

    FILE *log_file = fopen(LOG_FILE, "a");
    if (log_file) {
        char timestamp[20];
        get_timestamp(timestamp, sizeof(timestamp));

        // Prepare the log message
        va_list args;
        va_start(args, format);
        fprintf(log_file, "[%s] [%s] ", timestamp, level);
        vfprintf(log_file, format, args); // Log formatted message
        fprintf(log_file, "\n");
        va_end(args);

        fclose(log_file);
    } else {
        fprintf(stderr, "Error: Unable to open log file!\n");
    }
}
