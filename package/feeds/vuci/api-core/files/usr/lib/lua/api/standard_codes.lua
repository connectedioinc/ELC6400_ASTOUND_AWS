--[[
Reserved response status codes
0   - OK
100 - Response not implemented
101 - No action provided
102 - Provided action is not available
103 - Invalid options
104 - Uci get error
105 - Uci delete error
106 - Uci create error
107 - Invalid structure
108 - Section creation is not allowed
109 - Name already used
110 - Name not provided
111 - Delete not allowed
112 - Deletion of whole configuration is not allowed
113 - Invalid section provided
114 - No body provided for the request
115 - Uci set error
116 - Invalid query parameter
117 - General configuration error,
118 - It is not allowed to provide section ID in URL

120 - Unauthorized access
121 - Login failed for any reason
122 - General structure of request is incorrect
123 - JWT token that is provided with authorization header is invalid - unparsable, incomplete, etc

150 - Not enough free space in the device (when uploading files)
151 - File size is bigger than the maximum size allowed (when uploading files)
152 - Certificate is not valid (when uploading files)
--]]
STD_CODES = {
	OK                  = 0,
	NOT_IMPLEMENTED     = 100,
	NO_ACTION           = 101,
	NO_ACTION_ARGS      = 102,
	INVALID_OPT         = 103,
	UCI_GET_ERROR       = 104,
	UCI_DELETE_ERROR    = 105,
	UCI_CREATE_ERROR    = 106,
	INVALID_STRUCT      = 107,
	NO_CREATE           = 108,
	NAME_USED           = 109,
	NAME_NOT_PROVIDED   = 110,
	NO_DELETE           = 111,
	CONF_DEL_DISALLOWED = 112,
	INVALID_SECTION     = 113,
	NO_BODY             = 114,
	UCI_SET_ERROR       = 115,
	INVALID_QUERY       = 116,
	CONF_ERROR          = 117,
	INVALID_SID_USAGE   = 118,
	NO_EDIT          	= 119,

	UNAUTHORIZED        = 120,
	LOGIN_FAILED        = 121,
	INCORRECT_REQUEST	= 122,
	INVALID_TOKEN		= 123,
	EXPIRED_PASSWORD    = 124,
	FIRST_LOGIN         = 125,

	NO_SPACE            = 150,
	FILE_MAX_SIZE       = 151,
	CERT_VALIDATION_ERR = 152,

	CODE_ERROR			= 999
}