import unittest

from fastapi import HTTPException

from app.models.auth_user import AuthUser
from app.services.auth_service import (
    create_session_token,
    decode_session_token,
    hash_password,
    validate_new_password,
    verify_password,
)


class AuthServiceTest(unittest.TestCase):
    def test_password_hash_is_salted_and_verifiable(self):
        first = hash_password("StrongPassword123!")
        second = hash_password("StrongPassword123!")

        self.assertNotEqual(first, second)
        self.assertTrue(verify_password("StrongPassword123!", first))
        self.assertFalse(verify_password("wrong-password", first))

    def test_signed_session_round_trip(self):
        user = AuthUser(
            id=7,
            username="mym9259_et",
            role="admin",
            password_hash="unused",
            session_version=3,
        )

        payload = decode_session_token(create_session_token(user))

        self.assertEqual(payload["sub"], 7)
        self.assertEqual(payload["ver"], 3)

    def test_tampered_session_is_rejected(self):
        user = AuthUser(
            id=7,
            username="cgj",
            role="user",
            password_hash="unused",
            session_version=1,
        )
        token = create_session_token(user)

        self.assertIsNone(decode_session_token(token + "x"))

    def test_password_policy_rejects_short_password(self):
        with self.assertRaises(HTTPException):
            validate_new_password("short1")


if __name__ == "__main__":
    unittest.main()
