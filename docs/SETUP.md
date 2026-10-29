# Einrichtung und Übergabe

## 1. Bridge-Host

Die Bridge ist der HTTPS-Endpunkt für das iPad. Sie kann auf demselben Linux-Server wie die KI-Clients laufen; SSH wird dann zu dessen lokalem SSH-Dienst aufgebaut. Alternativ läuft sie auf einem getrennten vertrauenswürdigen Rechner.

1. Quellcode entpacken und Node.js 22.16+ bereitstellen.
2. `npm ci`, `npm run token`, `.env.example` nach `.env` kopieren.
3. Den zufälligen Schlüssel in `.env` setzen. Tatsächlichen Ursprung in `BRIDGE_ORIGINS` eintragen, z. B. `https://bridge.example.com,capacitor://localhost`. Für Entwicklung zusätzlich die dokumentierten localhost-Ursprünge verwenden.
4. `npm test && npm run build`, danach `npm start`.
5. HTTPS-Reverse-Proxy auf `127.0.0.1:3001` konfigurieren. WebSocket-Upgrades für `/ws` weiterreichen, Request-Body-Limit mindestens 12 MiB. Keine Auth-Header oder WebSocket-Subprotokolle protokollieren.

Beispiel für einen bereits installierten Caddy mit eigener Domain:

```caddy
bridge.example.com {
    reverse_proxy 127.0.0.1:3001
}
```

Domain und Zertifikatsvoraussetzungen müssen vorher erfüllt sein. Die Bridge selbst öffnet keinen öffentlichen Listen-Port. Keine Provider-Ports, VNC-Ports oder Chromium-Debug-Ports ins Internet freigeben.

## 2. SSH-Host

Verwende einen dedizierten unprivilegierten Linux-Benutzer für deine Entwicklungsprojekte. Dessen Rechte gelten auch für KI und Terminal. Root wird für Remote-Desktop-Starts abgelehnt. Für echte Isolation voneinander unabhängiger Besitzer sind getrennte Unix-Benutzer/VMs erforderlich.

Installiere die gewünschten offiziellen Clients. Sie müssen im nicht-interaktiven SSH-PATH verfügbar sein, nicht nur in einer lokalen Shell mit aktivem nvm-Profil:

```sh
command -v codex
command -v opencode
command -v agy
node --version
```

Installationsanleitungen: [Codex](https://developers.openai.com/codex/cli), [OpenCode](https://opencode.ai/docs/), [Antigravity](https://antigravity.google/docs/install?tab=cli). Für das Browser-MCP-Skript wird auch auf diesem Host Node.js 22+ benötigt. Die Bridge installiert keine KI-Clients stillschweigend und übernimmt keine lokalen Anmeldungen vom Entwickler-PC.

Im Onboarding SSH-Host, Port, Benutzer und Passwort oder unverschlüsselten privaten Schlüssel eingeben. Passphrase-geschützte Schlüssel und SSH-Agent-Forwarding sind in dieser Version nicht angebunden. Zugangsdaten werden nicht auf Platte gespeichert.

Den beim ersten Verbindungsversuch angezeigten Host-Fingerabdruck über einen bereits vertrauenswürdigen Kanal vergleichen, beispielsweise auf der Server-Konsole mit `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`. Das tatsächlich ausgehandelte Schlüsselverfahren muss zum geprüften Schlüssel passen. Ein später geänderter Schlüssel wird nicht automatisch übernommen; Änderung auf dem Bridge-Host untersuchen.

## 3. Anbieter anmelden

- Codex: Account hinzufügen → „Anmelden“ → echten Device-Code auf der angegebenen Anbieter-Seite eingeben → „Prüfen“. CLI-Funktionen und Auth-Verfügbarkeit hängen von Version/Account ab.
- OpenCode: Account hinzufügen → „Anmelden“ öffnet `opencode auth login` im profilbezogenen Terminal. Anbieter wählen und den offiziellen Login abschließen → schließen → „Prüfen“.
- Antigravity: Account hinzufügen → „Anmelden“ öffnet `agy` im profilbezogenen Terminal. Remote-Login-URL/Code der CLI verwenden → schließen → „Prüfen“. Ein geladener Modellkatalog wird als „Client bereit“, nicht als bestätigte Anmeldung dargestellt.

Jeder Account erhält eine zufällige ID und ein separates Provider-Profil. Vor mehreren Accounts desselben Anbieters live kontrollieren, dass unterschiedliche Identitäten angezeigt/verwendet werden. Ambient API-Key-Variablen werden im Launcher entfernt; der jeweilige Client verwendet sein Profil.

Codex-Quoten werden über die offizielle API gelesen. Für Antigravity `/usage` im interaktiven Account-Terminal verwenden. OpenCode-Provider können eigene Abrechnungsmodelle haben; die Bridge erfindet dafür keine Abo-Limits.

## 4. Projekte, Berechtigungen und Dateien

Projektordner werden tatsächlich auf dem SSH-Server durchsucht. Der Dialog legt keine fiktiven Ordner an. Ohne Projekt arbeitet der Agent in `~/.cloudki/workspace`.

Codex unterstützt Nachfragen, projektbezogenes Arbeiten, nur Lesen und Vollzugriff über seine Sandbox-/Approval-Parameter. OpenCode wird mit `permission: ask` gestartet; die Bridge beantwortet seine ACP-Freigaben. Antigravity-Headless erfordert hier expliziten Vollzugriff, weil seine interaktive Freigabeoberfläche nicht in dieses Chat-Protokoll eingebunden ist. Für vorsichtige Arbeit stattdessen die interaktive CLI verwenden.

Anhänge werden per SFTP mit zufälligem Pfad übertragen. Im Chat werden diese Server-Pfade weitergegeben. Ob Bilder, Binärdateien oder PDFs analysiert werden können, hängt vom jeweiligen Client ab; die Bridge täuscht keine Verarbeitung vor.

## 5. Browser, Unity und Blender

Der Workspace startet eine eigene Xvfb-Display-Sitzung mit Openbox, App und x11vnc. Es wird kein vorhandener Server-Desktop aufgenommen. VNC läuft auf Loopback und wird über die bestehende SSH-Verbindung zur authentifizierten App getunnelt. Die Loopback-Dienste setzen einen vertrauenswürdigen, nur diesem Besitzer gehörenden Host voraus.

„Installieren“ zeigt zuerst den exakten apt-Befehl; nach Start läuft die echte Ausgabe im Terminal. Ein benötigtes sudo-Passwort dort eingeben. Der Status kommt vom Prozess, nicht von einem Timer.

- Debian: `chromium`, `blender`, `xvfb`, `x11vnc`, `openbox` kommen aus den eingerichteten Paketquellen.
- Ubuntu: Chromium kann ein Snap-Wrapper sein. Dessen Start in der Xvfb-Sitzung muss geprüft werden. Kein automatischer `--no-sandbox`-Fallback.
- Unity: Das offizielle Unity-Hub-Paketrepository muss bereits eingerichtet sein. Danach installiert apt `unityhub`. Anmeldung, Lizenzannahme, Editor-Versionen und zusätzliche Module erfolgen im echten Hub. Die Bridge automatisiert keine EULA-Annahme und liefert keine inoffiziellen Editor-Pakete.

Für den KI-Browser zuerst Chromium starten, dann im Chat über `+` das Browser-Plugin anhängen und bewusst Vollzugriff wählen. Der MCP-Helper steuert den sichtbaren Chromium-Tab über CDP auf `127.0.0.1:9229`. Klicks erhalten eine sichtbare Markierung. Seiteninhalt wird als unzuverlässige Daten an den Agenten gegeben. Nach Nutzung sensible Browser-Sitzungen abmelden.

## 6. IPA bauen

Unter Windows ist kein Xcode-Build möglich. Das bestehende iOS-Projekt wurde für iPadOS 17+ aktualisiert. Der GitHub-Workflow `.github/workflows/build-ipad-ipa.yml` baut nach Übernahme der Änderungen eine **unsignierte** IPA auf einem macOS-Runner. Alternativ auf einem eigenen Mac:

```sh
npm ci
npm test
npm run build
npx cap sync ios
npx cap open ios
```

In Xcode Signing/Team festlegen und auf dem eigenen iPad testen. Unsignierte CI-IPAs müssen vor Installation passend signiert werden; eine erfolgreiche Web-Kompilation ist kein erfolgreicher IPA-Build. Der nach der lokalen Übergabe beauftragte Push auf `main` startet diesen Workflow automatisch. Buildstatus und IPA-Artefakte stehen unter https://github.com/LeonM1501/CloudKIApp/actions/workflows/build-ipad-ipa.yml.

## 7. Vor dem ersten echten Einsatz

Einen Testserver verwenden, je Anbieter einen kleinen Inferenzauftrag ausführen, Account-Trennung prüfen, Tool-Freigabe ablehnen/erlauben, Abbruch/SSH-Verlust testen und den Wechsel mit einem bekannten Verlauf kontrollieren. Danach Browser-/Editor-Streaming auf dem echten iPad prüfen. Die ausführliche Liste steht in `VALIDATION.md`.
