#include "lua_crypto.h"

// Calculates the length of a to be decoded base64 string
int calc_decode_length(const char* b64input) {
	int len = strlen(b64input);
	return (int)len*0.75;
}

unsigned char* _base64_decode(const char *str, size_t *decoded_strlen)
{
	int len = calc_decode_length(str);
	unsigned char *decoded_str = malloc(len);

	if ((len = EVP_DecodeBlock((unsigned char*)decoded_str, (unsigned char*)str, strlen(str))) < 0) {
		return NULL;
	}
	*decoded_strlen = len;
	return decoded_str;
}

void _base64uri_encode(char *str)
{
	int len = (int)strlen(str);
	int i, t;

	for (i = t = 0; i < len; i++) {
		switch (str[i]) {
		case '+':
			str[t++] = '-';
			break;
		case '/':
			str[t++] = '_';
			break;
		case '=':
			break;
		default:
			str[t++] = str[i];
		}
	}

	str[t] = '\0';
}

void _base64uri_decode(char *str)
{
	int len = (int)strlen(str);
	int i, t;

	for (i = t = 0; i < len; i++) {
		switch (str[i]) {
		case '-':
			str[t++] = '+';
			break;
		case '_':
			str[t++] = '/';
			break;
		default:
			str[t++] = str[i];
		}
	}

	str[t] = '\0';
}

unsigned char* _base64_encode(const char *str, size_t slen)
{
	int b64len = B64_ENCODE_BUF_LEN(slen);
	unsigned char *b64str = malloc(b64len);

	if ((b64len = EVP_EncodeBlock((unsigned char*)b64str, (unsigned char*)str, slen)) < 0) {
		fprintf(stderr, "base64 EVP_EncodeBlock failed (%d)\n", b64len);
		return NULL;
	}
	return b64str;
}

static int base64_encode(lua_State *L)
{
	size_t slen;
	char *str = (char *)lua_tolstring(L, 1, &slen);

	unsigned char *b64str = _base64_encode(str, slen);

	if (b64str) {
		lua_pushstring(L, b64str);
		free(b64str);
	} else {
		fprintf(stderr, "_base64_encode failed\n");
	}
	return 1;
}

static int base64_decode(lua_State *L)
{
	size_t slen;
	char *str = (char *)lua_tolstring(L, 1, &slen);
	size_t decoded_strlen;

	unsigned char *decoded_str = NULL;
	decoded_str = _base64_decode(str, &decoded_strlen);

	if (decoded_str) {
		lua_pushlstring(L, decoded_str, decoded_strlen);
		free(decoded_str);
	} else {
		fprintf(stderr, "_base64_encode failed\n");
	}
	return 1;
}

static int hmac_256(lua_State *L)
{
	size_t 	secret_len;
	size_t 	data_len;
	int 	result_len;
	unsigned char *result;

	char *secret_data	= (char *)lua_tolstring(L, 1, &secret_len);
	char *data			= (char *)lua_tolstring(L, 2, &data_len);

	result = HMAC(EVP_sha256(), secret_data, secret_len, data, data_len, NULL, &result_len);
	if (!result) {
		fprintf(stderr, "Failed to hash.\n");
		return 1;
	}

	lua_pushlstring(L, result, result_len);
	return 1;
}

static int jwt_es384_sign(lua_State *L)
{
	EVP_MD_CTX *mdctx = NULL;
	ECDSA_SIG *ec_sig = NULL;
	const BIGNUM *ec_sig_r = NULL;
	const BIGNUM *ec_sig_s = NULL;
	unsigned char *sig;
	int ret = 0;
	size_t slen;
	EVP_PKEY  *cert_privkey = NULL;
	BIO *priv_key_bio = NULL;
	FILE *keyfile = NULL;
	int privkey_len;
	char *privkey	= (char *)lua_tolstring(L, 1, &privkey_len);
	int msg_len;
	char *msg	= (char *)lua_tolstring(L, 2, &msg_len);

	if (!privkey) {
		fprintf(stderr, "Private key not provided.\n");
		goto end;
	}
	if (!msg) {
		fprintf(stderr, "Message to sign not provided.\n");
		goto end;
	}

	/* Create the Message Digest Context */
	if(!(mdctx = EVP_MD_CTX_create())) goto end;

	priv_key_bio = BIO_new(BIO_s_mem());
	if (!BIO_write(priv_key_bio, privkey, strlen(privkey))) {
		fprintf(stderr, "BIO_write privkey error.\n");
		goto end;
	}
	/* Read the private key using BIO */
	if ((cert_privkey = EVP_PKEY_new()) == NULL){
		fprintf(stderr, "Error creating EVP_PKEY structure.\n");
		goto end;
	}

	if (! (cert_privkey = PEM_read_bio_PrivateKey(priv_key_bio, NULL, NULL, NULL))){
		fprintf(stderr, "Error loading certificate private key content.\n");
		goto end;
	}


	/* Initialise the DigestSign operation - SHA-384 has been selected */
	if(1 != EVP_DigestSignInit(mdctx, NULL, EVP_sha384(), NULL, cert_privkey)) goto end;
	
	/* Call update with the message */
	if(1 != EVP_DigestSignUpdate(mdctx, msg, strlen(msg))) goto end;
	
	
	/* Finalise the DigestSign operation */
	/* First call EVP_DigestSignFinal with a NULL sig parameter to obtain the length of the
	* signature. Length is returned in slen */
	if(1 != EVP_DigestSignFinal(mdctx, NULL, &slen)) goto end;
	/* Allocate memory for the signature based on size in slen */
	if(!(sig = OPENSSL_malloc(sizeof(unsigned char) * (slen)))) goto end;
	/* Obtain the signature */
	if(1 != EVP_DigestSignFinal(mdctx, sig, &slen)) goto end;

	
	unsigned int degree, bn_len, r_len, s_len, buf_len;
	unsigned char *raw_buf;
#if OPENSSL_VERSION_NUMBER < 0x30000000L
	EC_KEY *ec_key = EVP_PKEY_get1_EC_KEY(cert_privkey);
	if (ec_key == NULL) goto end;
	degree = EC_GROUP_get_degree(EC_KEY_get0_group(ec_key));
	EC_KEY_free(ec_key);
#else
	EVP_PKEY_get_int_param(cert_privkey, "bits", &degree);
#endif

	/* Get the sig from the DER encoded version. */
	ec_sig = d2i_ECDSA_SIG(NULL, (const unsigned char **)&sig, slen);
	if (ec_sig == NULL) goto end;

	ECDSA_SIG_get0(ec_sig, &ec_sig_r, &ec_sig_s);
	r_len = BN_num_bytes(ec_sig_r);
	s_len = BN_num_bytes(ec_sig_s);
	bn_len = (degree + 7) / 8;
	if ((r_len > bn_len) || (s_len > bn_len)) goto end;

	buf_len = 2 * bn_len;
	raw_buf = alloca(buf_len);
	if (raw_buf == NULL) goto end;

	/* Pad the bignums with leading zeroes. */
	memset(raw_buf, 0, buf_len);
	BN_bn2bin(ec_sig_r, raw_buf + bn_len - r_len);
	BN_bn2bin(ec_sig_s, raw_buf + buf_len - s_len);

	char *out = OPENSSL_malloc(buf_len);
	if (out == NULL) goto end;
	memcpy(out, raw_buf, buf_len);

	/* Success */
	ret = 1;
	
end:
	if(ret != 1) {
		fprintf(stderr, "Unknown error.\n");
	}
	
	if (out) {
		char *b64_sig = _base64_encode(out, buf_len);
		_base64uri_encode(b64_sig);
		lua_pushstring(L, b64_sig);
		if (b64_sig) free(b64_sig);
	}

	/* Clean up */
	if (keyfile) fclose(keyfile);
	if (out) OPENSSL_free(out);
	if (sig && !ret) OPENSSL_free(sig);
	if (mdctx) EVP_MD_CTX_destroy(mdctx);
	if (cert_privkey) EVP_PKEY_free(cert_privkey);
	if (ec_sig) ECDSA_SIG_free(ec_sig);
	if (priv_key_bio) BIO_free(priv_key_bio);

	return 1;
}

static int jwt_es384_verify(lua_State *L)
{
	unsigned char *sig = NULL;
	EVP_MD_CTX *mdctx = NULL;
	ECDSA_SIG *ec_sig = NULL;
	BIGNUM *ec_sig_r = NULL;
	BIGNUM *ec_sig_s = NULL;
	EVP_PKEY *pkey = NULL;
	const EVP_MD *alg;
	int type;
	int pkey_type;
	BIO *pubkey_bio = NULL;
	int valid = 0;
	size_t slen;

	char *pubkey = (char *)lua_tostring(L, 1);
	char *jwt = (char *)lua_tostring(L, 2);
	if (!pubkey) {
		fprintf(stderr, "Public key not provided.\n");
		goto end;
	}
	if (!jwt) {
		fprintf(stderr, "JWT not provided.\n");
		goto end;
	}

	size_t jwt_len = strlen(jwt);
	char *head = calloc(jwt_len, sizeof(char));
	char *sig_b64 = calloc(jwt_len, sizeof(char));
	for (int i = jwt_len - 1; i >= 0; i--) {
		if (jwt[i] == '.') {
			strncpy(sig_b64, jwt + i + 1, jwt_len - i);
			strncpy(head, jwt, i);
			break;
		}
	}

	alg = EVP_sha384();
	type = EVP_PKEY_EC;

	_base64uri_decode(sig_b64);
	sig = _base64_decode(sig_b64, &slen);

	if (sig == NULL)
		goto end;

	pubkey_bio = BIO_new(BIO_s_mem());
	if (!pubkey_bio) {
		fprintf(stderr, "BIO_new(BIO_s_mem()) error.\n");
		goto end;
	}
	if (!BIO_write(pubkey_bio, pubkey, strlen(pubkey))) {
		fprintf(stderr, "BIO_write pubkey error.\n");
		goto end;
	}
	/* Read the public key file */
	if ((pkey = EVP_PKEY_new()) == NULL){
		fprintf(stderr, "Error creating EVP_PKEY structure.\n");
		goto end;
	}
	if (! (pkey = PEM_read_bio_PUBKEY(pubkey_bio, NULL, NULL, NULL))){
		fprintf(stderr, "Error loading certificate public key content.\n");
		goto end;
	}

	if (pkey == NULL)
		goto end;

	pkey_type = EVP_PKEY_id(pkey);
	if (pkey_type != type)
		goto end;

	/* Convert EC sigs back to ASN1. */
	if (pkey_type == EVP_PKEY_EC) {
		unsigned int degree, bn_len;
		unsigned char *p;

		ec_sig = ECDSA_SIG_new();
		if (ec_sig == NULL)
			goto end;

#if OPENSSL_VERSION_NUMBER < 0x30000000L
		EC_KEY *ec_key = EVP_PKEY_get1_EC_KEY(pkey);
		if (ec_key == NULL)
			goto end;
		degree = EC_GROUP_get_degree(EC_KEY_get0_group(ec_key));
		EC_KEY_free(ec_key);
#else
		EVP_PKEY_get_int_param(pkey, "bits", &degree);
#endif

		bn_len = (degree + 7) / 8;
		if ((bn_len * 2) != slen)
			goto end;

		ec_sig_r = BN_bin2bn(sig, bn_len, NULL);
		ec_sig_s = BN_bin2bn(sig + bn_len, bn_len, NULL);
		if (ec_sig_r  == NULL || ec_sig_s == NULL)
			goto end;

		ECDSA_SIG_set0(ec_sig, ec_sig_r, ec_sig_s);
		free(sig);

		slen = i2d_ECDSA_SIG(ec_sig, NULL);
		sig = calloc(slen, sizeof(char));
		if (sig == NULL)
			goto end;

		p = sig;
		slen = i2d_ECDSA_SIG(ec_sig, &p);

		if (slen == 0)
			goto end;
	}

	mdctx = EVP_MD_CTX_create();
	if (mdctx == NULL)
		goto end;

	/* Initialize the DigestVerify operation using alg */
	if (EVP_DigestVerifyInit(mdctx, NULL, alg, NULL, pkey) != 1)
		goto end;

	/* Call update with the message */
	if (EVP_DigestVerifyUpdate(mdctx, head, strlen(head)) != 1)
		goto end;

	/* Now check the sig for validity. */
	if (EVP_DigestVerifyFinal(mdctx, sig, slen) == 1) {
		valid = 1;
	}

end:
	if (pubkey_bio) BIO_free(pubkey_bio);
	if (pkey) EVP_PKEY_free(pkey);
	if (mdctx) EVP_MD_CTX_destroy(mdctx);
	if (sig) free(sig);
	if (ec_sig) ECDSA_SIG_free(ec_sig);
	if (head) free(head);
	if (sig_b64) free(sig_b64);

	lua_pushboolean(L, valid);
	return 1;
}

// reimplementation of the uci calculations for anonymous sections
// uses Daniel J. Bernstein’s hash Algorithm
// could be improved but for now uses exact uci function
static int djb_hash(lua_State *L)
{
	int c;
	size_t slen;
	char *str = (char *)lua_tolstring(L, 1, &slen);
	unsigned int hash = (unsigned int)lua_tonumber(L, 2);

	/* initial value */
	if (hash == 0)
		hash = 5381;

	while (c = *str++)
		hash = ((hash << 5) + hash) + c; /* hash * 33 + c */

	// non hash related, but moved here for simplicity of bitwise operations
	hash = (hash & 0x7FFFFFFF);
	hash = hash % (1 << 16);
	//---------------
	lua_pushinteger(L, hash);
	return 1;
}

static int ec_keygen(lua_State *L)
{
	char *curve = (char *)lua_tostring(L, 1);
	EVP_PKEY *evp_key = NULL;
	BIO *priv_key_bio = NULL;
	BIO *pub_key_bio = NULL;
	char priv_key_buf[BUFFER_SIZE] = {0};
	char pub_key_buf[BUFFER_SIZE] = {0};
	int success = 0;

	if (!curve) {
		fprintf(stderr, "curve must be provided\n");
		goto end;
	}

#if OPENSSL_VERSION_NUMBER < 0x30000000L
	int nid = EC_curve_nist2nid(curve);
	if (nid == NID_undef)
		nid = OBJ_sn2nid(curve);
	if (nid == 0) {
		fprintf(stderr, "EC_curve_nist2nid error\n");
		goto end;
	}
	EC_KEY *ec_key = EC_KEY_new_by_curve_name(nid);
	if (!ec_key) {
		fprintf(stderr, "EC_KEY_new_by_curve_name error\n");
		goto end;
	}
	if (EC_KEY_generate_key(ec_key) == 0) {
		fprintf(stderr, "EC_KEY_generate_key error\n");
		goto end;
	}

	evp_key = EVP_PKEY_new();
	if (! EVP_PKEY_set1_EC_KEY(evp_key, ec_key)) {
		fprintf(stderr, "EVP_PKEY_set1_EC_KEY error.\n");
		goto end;
	}
#else
	evp_key = EVP_EC_gen(curve);
	if (!evp_key) {
		fprintf(stderr, "EVP_EC_gen error\n");
		goto end;
	}
#endif

	priv_key_bio = BIO_new(BIO_s_mem());
	pub_key_bio = BIO_new(BIO_s_mem());
	PEM_write_bio_PrivateKey(priv_key_bio, evp_key, NULL, NULL, 0, NULL, NULL);
	PEM_write_bio_PUBKEY(pub_key_bio, evp_key);

	if (! BIO_read(priv_key_bio, priv_key_buf, BUFFER_SIZE)) {
		fprintf(stderr, "BIO_read priv_key error.\n");
		goto end;
	}

	if (! BIO_read(pub_key_bio, pub_key_buf, BUFFER_SIZE)) {
		fprintf(stderr, "BIO_read pub_key error.\n");
		goto end;
	}

	success = 1;
end:
	if (priv_key_bio) BIO_free(priv_key_bio);
	if (pub_key_bio) BIO_free(pub_key_bio);
	if (evp_key) EVP_PKEY_free(evp_key);

	if (success) {
		lua_pushstring(L, priv_key_buf);
		lua_pushstring(L, pub_key_buf);
		return 2;
	} else {
		lua_pushnil(L);
		return 1;
	}
}

static const luaL_Reg syslib[] = { 
	{ "hmac_256", hmac_256 },
	{ "base64_encode", base64_encode },
	{ "base64_decode", base64_decode },
	{ "djb_hash", djb_hash },
	{ "jwt_es384_sign", jwt_es384_sign },
	{ "jwt_es384_verify", jwt_es384_verify },
	{ "ec_keygen", ec_keygen },
	{ NULL, NULL } 
};

LUALIB_API int luaopen_lua_crypto(lua_State *L)
{
	luaL_register(L, "lua_crypto", syslib);
	return 1;
}
