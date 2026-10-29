import configparser
import hashlib
import json
import os
from pathlib import Path
import shutil


def desktop_apps(roots):
    apps = []
    seen = set()
    for root in roots:
        root = Path(root)
        if not root.is_dir():
            continue
        for path in sorted(root.rglob("*.desktop")):
            desktop_id = "-".join(path.relative_to(root).parts)
            if desktop_id in seen:
                continue
            seen.add(desktop_id)
            try:
                config = configparser.ConfigParser(interpolation=None, strict=False)
                config.read(path, encoding="utf-8")
                entry = config["Desktop Entry"]
                if entry.get("Type") != "Application" or not entry.get("Name") or not entry.get("Exec"):
                    continue
                if any(entry.get(key, "false").lower() == "true" for key in ["Hidden", "NoDisplay", "Terminal"]):
                    continue
                if entry.get("TryExec") and not shutil.which(entry["TryExec"]):
                    continue
                if desktop_id.lower() in {"openbox.desktop", "x11vnc.desktop", "blender.desktop", "unityhub.desktop", "chromium.desktop", "chromium-browser.desktop"}:
                    continue
                apps.append({"id": "desktop-" + hashlib.sha256(desktop_id.encode()).hexdigest()[:12], "name": entry["Name"][:100], "desktopId": desktop_id})
            except (configparser.Error, KeyError, OSError, UnicodeError):
                continue
    return apps


if __name__ == "__main__":
    data_home = os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local/share"))
    roots = [Path(data_home) / "applications"] + [Path(value) / "applications" for value in os.environ.get("XDG_DATA_DIRS", "/usr/local/share:/usr/share").split(":")]
    print(json.dumps({"apps": desktop_apps(roots), "available": [program for program in ["Xvfb", "x11vnc", "openbox", "xprop", "gtk-launch", "chromium", "chromium-browser", "blender", "unityhub", "node"] if shutil.which(program)]}))
