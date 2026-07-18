_FORWARD_REQUEST_HEADERS = {"content-type", "content-length", "accept", "authorization"}  # headers passed to the plugin backend
_STRIP_RESPONSE_HEADERS = {"transfer-encoding", "content-encoding"}  # hop-by-hop headers removed before forwarding the response
