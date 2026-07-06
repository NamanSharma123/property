"""
Password hashing compatible with the Node backend (argon2id via the `argon2`
npm package). Hashes are stored raw in users.password_hash — do NOT use
Django's password hasher framework, which prefixes hashes with "argon2$".
"""
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

password_hasher = PasswordHasher()


def hash_password(password):
    return password_hasher.hash(password)


def verify_password(password_hash, password):
    """Returns True/False like the Node argon2.verify usage (never raises)."""
    try:
        return password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False
