from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hash_roundtrip():
    h = hash_password("s3cretPassw0rd!")
    assert verify_password("s3cretPassw0rd!", h)
    assert not verify_password("wrong", h)


def test_access_token_roundtrip():
    token = create_access_token("user123", "citizen")
    payload = decode_token(token, "access")
    assert payload is not None
    assert payload["sub"] == "user123"
    assert payload["role"] == "citizen"


def test_token_type_mismatch_rejected():
    token = create_refresh_token("user123")
    assert decode_token(token, "access") is None
    assert decode_token(token, "refresh") is not None


def test_garbage_token_rejected():
    assert decode_token("not-a-token", "access") is None
