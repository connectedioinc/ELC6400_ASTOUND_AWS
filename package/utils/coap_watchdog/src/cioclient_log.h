#ifndef CIOCLIENT_LOG_H_
#define CIOCLIENT_LOG_H_
#ifdef __cplusplus
extern "C" {
#endif
void log_message(const char *level, const char *format, ...);
#ifdef __cplusplus
}      /* extern "C" */
#endif

#endif /* CIOCLIENT_LOG_H_ */

