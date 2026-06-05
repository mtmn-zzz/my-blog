import os
from pathlib import Path

UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "/app/uploads"))
AVATAR_DIR = UPLOAD_DIR / "avatars"

ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def ensure_upload_dirs() -> None:
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)


def avatar_file_from_url(avatar_url: str | None) -> Path | None:
    if not avatar_url or not avatar_url.startswith("/uploads/avatars/"):
        return None
    name = avatar_url.removeprefix("/uploads/avatars/")
    if not name or ".." in name or "/" in name or "\\" in name:
        return None
    return AVATAR_DIR / name


def delete_avatar_file(avatar_url: str | None) -> None:
    path = avatar_file_from_url(avatar_url)
    if path and path.is_file():
        path.unlink(missing_ok=True)
