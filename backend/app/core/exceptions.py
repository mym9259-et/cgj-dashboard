class AppException(Exception):
    """Base application exception."""

    def __init__(self, message: str, detail: str = ""):
        self.message = message
        self.detail = detail
        super().__init__(message)


class UploadException(AppException):
    """Upload-related errors."""


class ParseException(AppException):
    """Excel parsing errors."""


class ImportException(AppException):
    """Data import errors."""


class FilterException(AppException):
    """Invalid filter parameters."""
