local headers = {}

-- relation table between supported HTTP verbs and rpcd actions
headers.SUPPORTED_HTTP_METHODS = {
	POST   = "write",
	PUT    = "write",
	GET    = "read",
	OPTIONS = "read",
	DELETE = "write",
	UPLOAD = "write"
}

-- buffer for sending files to client
headers.WRITE_BUFFER = 512*4

headers.HTTP_HEADERS = {
	["200"] = "200 OK",
	["201"] = "201 Created",
	["204"] = "204 No Content",
	["207"] = "207 Multi Status",
	["400"] = "400 Bad Request",
	["401"] = "401 Unauthorized",
	["403"] = "403 Forbidden",
	["404"] = "404 Not Found",
	["405"] = "405 Method Not Allowed",
	["407"] = "407 Proxy Authentication Required",
	["411"] = "411 Length Required",
	["413"] = "413 Payload Too Large",
	["422"] = "422 Unprocessable Entity",
	["500"] = "500 Internal Server Error",
	["501"] = "501 Not Implemented",
	["504"] = "504 Gateway Timeout"
}

return headers