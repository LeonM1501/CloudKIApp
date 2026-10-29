# Third-party software

CloudKI's application changes are original implementation work. No Codex desktop UI source was copied. The original repository did not declare a project-wide license; this change does not assign one on its owner's behalf.

Dependencies are resolved in `package-lock.json`. Key runtime components:

| Component | License | Source |
| --- | --- | --- |
| React / React DOM | MIT | https://github.com/facebook/react |
| Capacitor | MIT | https://github.com/ionic-team/capacitor |
| Express, cors | MIT | https://github.com/expressjs |
| ssh2 | MIT | https://github.com/mscdex/ssh2 |
| ws | MIT | https://github.com/websockets/ws |
| xterm 6.0.0 / addon-fit 0.11.0 | MIT | https://github.com/xtermjs/xterm.js |
| noVNC 1.7.0 | MPL-2.0; vendor notices included | https://github.com/novnc/noVNC/tree/v1.7.0 |
| Lucide React | ISC | https://github.com/lucide-icons/lucide |

noVNC is used unmodified. Its corresponding source and bundled license notices are supplied in `public/licenses/novnc-1.7.0-source.zip`, copied into the web build at `/licenses/novnc-1.7.0-source.zip`. Source form is also available from the upstream tag above and the pinned npm package. Preserve these notices and source availability when redistributing the app. The ZIP contains the installed upstream source package, not application credentials or dependencies from the developer machine.

Provider CLIs, Unity, Blender, Chromium, Xvfb, x11vnc and Openbox are installed separately on the user's Linux host and are not distributed in this source handoff. Their respective licenses, provider terms, Unity activation requirements and official installation instructions apply. No legal/commercial-launch certification is claimed.
