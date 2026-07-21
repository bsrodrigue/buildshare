from __future__ import annotations

from libs.android import AndroidMetadata


class FakeAPKParser:
    """Returns canned metadata / icons, ignoring the input bytes entirely."""

    def __init__(
        self,
        metadata: AndroidMetadata | None = None,
        icon_bytes: bytes | None = None,
        parse_raises: type[Exception] | None = None,
    ):
        self._metadata = metadata or AndroidMetadata(
            app_label="FakeApp",
            package_name="com.example.fake",
            signature_hash="aabbccddee" * 8,
            is_debuggable=False,
            version_code=1,
            version_name="1.0",
            architecture="arm64-v8a",
            file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            file_size=1024,
        )
        self._icon_bytes = icon_bytes
        self._parse_raises = parse_raises

    def parse_metadata(self, data: bytes) -> AndroidMetadata:
        if self._parse_raises:
            raise self._parse_raises
        return self._metadata

    def get_app_icon_bytes(self, data: bytes) -> bytes | None:
        return self._icon_bytes


class FakeAPKDownloader:
    """Ignores storage and key; returns canned bytes."""

    def __init__(self, data: bytes = b"fake-apk-content"):
        self._data = data

    def download(self, storage: object, key: str) -> bytes:
        return self._data


def make_apk_parser(**overrides: object) -> FakeAPKParser:
    """Convenience: build a parser with selective field overrides on the default metadata."""
    base = AndroidMetadata(
        app_label="FakeApp",
        package_name="com.example.fake",
        signature_hash="aabbccddee" * 8,
        is_debuggable=False,
        version_code=1,
        version_name="1.0",
        architecture="arm64-v8a",
        file_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        file_size=1024,
    )
    return FakeAPKParser(metadata=AndroidMetadata(**{**base.__dict__, **overrides}))
