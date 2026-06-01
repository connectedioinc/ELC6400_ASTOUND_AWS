#ifndef UBUS_JSON_COMPAT_H
#define UBUS_JSON_COMPAT_H

#include <libubox/blobmsg.h>
#include <libubox/blob.h>
#include <json-c/json.h>

/* Replacement for blobmsg_format_json() when missing from libubox */
static inline char *blobmsg_format_json_safe(struct blob_attr *attr, bool list)
{
    struct json_object *obj = json_object_new_object();
    struct blob_attr *pos;
    int rem = blobmsg_data_len(attr);

    __blob_for_each_attr(pos, blobmsg_data(attr), rem) {
        const char *key = blobmsg_name(pos);
        enum blobmsg_type type = blobmsg_type(pos);

        switch (type) {
        case BLOBMSG_TYPE_STRING:
            json_object_object_add(obj, key,
                                   json_object_new_string(blobmsg_get_string(pos)));
            break;
        case BLOBMSG_TYPE_INT32:
            json_object_object_add(obj, key,
                                   json_object_new_int(blobmsg_get_u32(pos)));
            break;
        case BLOBMSG_TYPE_INT64:
            json_object_object_add(obj, key,
                                   json_object_new_int64(blobmsg_get_u64(pos)));
            break;
        case BLOBMSG_TYPE_BOOL:
            json_object_object_add(obj, key,
                                   json_object_new_boolean(blobmsg_get_u8(pos)));
            break;
        default:
            json_object_object_add(obj, key,
                                   json_object_new_string("<unsupported>"));
            break;
        }
    }

    const char *json_str = json_object_to_json_string(obj);
    char *ret = strdup(json_str);
    json_object_put(obj);
    return ret;
}

#endif /* UBUS_JSON_COMPAT_H */

