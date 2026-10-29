# CloudKI Bridge

Persönliche iPad-/Web-Oberfläche für Coding-Clients auf einem eigenen Linux-Server. React 19, Capacitor 8, Node.js und SSH. Dieser Stand ersetzt die ursprüngliche Simulation durch echte Adapter und explizite Fehlerzustände.

**Stand: 29.10.2026. Lokal geprüfte Entwicklungsversion, keine produktive Freigabe.** Nach der lokalen Übergabe wurde die Veröffentlichung auf `main` mit IPA-Build beauftragt. Den Status und die unsignierte IPA findest du im [GitHub-Actions-Workflow](https://github.com/LeonM1501/CloudKIApp/actions/workflows/build-ipad-ipa.yml). Live-Anmeldungen, Inferenz, Linux-Grafikstreaming und iPad-Hardwaretests bleiben offen. Details stehen in [VALIDATION.md](VALIDATION.md).

## Start

Node.js 22.16+ installieren, dann im Projektordner:

```sh
npm ci
npm run token
cp .env.example .env
```

Den erzeugten zufälligen Schlüssel als `BRIDGE_TOKEN` in `.env` eintragen. `BRIDGE_ORIGINS` auf die tatsächliche HTTPS-Adresse setzen; `capacitor://localhost` für die iPad-App beibehalten. `.env` niemals committen.

```sh
npm test
npm run build
npm start
```

Die Bridge bindet ausschließlich an `127.0.0.1:3001`. Lokal ist die gebaute App dort erreichbar. Für Entwicklung: `npm run dev`, Oberfläche auf `http://127.0.0.1:5173`. Im Browser darf die Bridge-Adresse leer bleiben, wenn App und API denselben Ursprung verwenden.

Für den Zugriff vom iPad benötigt die Bridge einen HTTPS-Reverse-Proxy oder einen passenden privaten Zugang mit vertrauenswürdigem HTTPS-Zertifikat. In der App dessen Adresse und den Bridge-Schlüssel eingeben. Die iPad-App kann den Node-Server nicht selbst ausführen oder installieren.

Beim Klick auf „Anmelden“ prüft die Bridge den jeweiligen KI-Client auf dem SSH-Server und installiert ihn bei Bedarf für diesen Linux-Benutzer. Codex und OpenCode kommen aus den offiziellen npm-Paketen, Antigravity über den offiziellen Installer. Weitere Accounts verwenden dieselbe Installation mit getrennten Profilen. Node.js/npm und für Antigravity curl müssen vorhanden sein; sudo ist nicht erforderlich.

Eine ausführliche Einrichtung einschließlich Server, Apps und IPA-Build steht in [docs/SETUP.md](docs/SETUP.md).

Im Projektdialog kannst du statt eines Server-Pfads einen Link wie `https://github.com/NAME/REPO` eingeben. Die Bridge klont das Repo auf den SSH-Server. Für private Repos und Uploads einmal „GitHub verbinden“ wählen und den Geräte-Login im Terminal abschließen. Nach erfolgreichen Aufträgen außerhalb des Nur-Lesen-Modus werden Änderungen unter Beachtung von `.gitignore` committed und auf den ursprünglichen Branch gepusht. Upload-Fehler sind im Chat und Projektdialog sichtbar; „Änderungen hochladen“ wiederholt den Upload. Bei Konflikten bleiben Dateien und Commits lokal erhalten; es gibt keinen Force-Push. Parallele Aufträge im selben GitHub-Projekt werden abgelehnt.

## Funktionsumfang und Grenzen

| Bereich | Implementierung | Noch zu prüfen / Einschränkung |
| --- | --- | --- |
| Einführung | Bridge-Adresse/-Schlüssel, Profil, SSH, Host-Key-Prüfung, Accounts | SSH-Passwort/Key bleibt nur in der Verbindung; nach Bridge-Neustart neu verbinden |
| Codex | App-Server über SSH, Device-Code, echte Account-Abfrage, Modellkatalog, Quota-Fenster, Text/Tool-Events, Kommando-/Dateifreigaben | Echte Anmeldung und Inferenz nicht durchgeführt; andere Anfrageformen werden verweigert |
| OpenCode | ACP über SSH, Anmeldung im offiziellen CLI-Terminal, dynamische Modelle, Text/Tool-Events, Freigaben | ACP liefert keine Quota-API; nur Nachfragen/Vollzugriff, keine zugesicherte OS-Sandbox |
| Antigravity | `agy`-Anmeldung im Terminal, `agy models`, NDJSON-Chat-/Tool-Ausgabe, Tokenzählung | Vertrag gegen Dokumentation umgesetzt, noch kein Live-Test; Headless hier nur nach explizitem Vollzugriff; `/usage` im CLI statt erfundener Quoten |
| Account-Trennung | Eigene `CODEX_HOME`, `GEMINI_HOME` und XDG-Verzeichnisse | Kein Sicherheitscontainer; globale Provider-Konfigurationen/Keyrings müssen live geprüft werden |
| Chat/Projekte | Leerer Start, Server-Persistenz, Projektordner per SFTP, Pins, Suche, Export, Löschen, Anhänge | Ein Besitzer und ein SSH-Ziel pro Bridge; keine Mehrbenutzerplattform |
| Modellwechsel | Sichtbarer Verlauf, Dateiverweise, abgeschlossene/fehlgeschlagene Tool-Events werden übergeben | Jede Antwort startet eine neue native Sitzung; höherer Tokenaufwand, keine Übertragung verborgener interner Zustände; zu große Verläufe werden abgelehnt |
| Browser | Echtes Chromium-Display via VNC über SSH/WebSocket; MCP-Plugin für Navigation, Snapshot, Screenshot, Klick, Texteingabe | Linux-Desktop und Provider-MCP-Anbindung noch nicht live getestet; Plugin verlangt expliziten Vollzugriff |
| Unity/Blender | Echte apt-Installation mit Terminalausgabe; Start auf eigenem Xvfb-Display; noVNC-Steuerung | Kein eingebauter Unity-/Blender-MCP-Spezialadapter. KI kann Dateien/Skripte über den Coding-Client bearbeiten; Editor-Integration, GPU und Streaming offen |
| Skills/Plugins | Codex-Skill-Erkennung und Skill-Verweise im Prompt; anhängbares Browser-MCP-Plugin | Kein universeller Plugin-Marktplatz. Weitere Provider-Plugins/Skills im jeweiligen Profil verwalten |
| iPad-Oberfläche | Responsive Hoch-/Querformat, verstellbare Bereiche, Tastatur-Viewport, Themes, Schriftgröße | Web-UI mit dezentem Blur; kein natives Apple-Liquid-Glass. iPadOS 17+ als Build-Ziel; echte Geräteprüfung offen |
| Nutzung | Nur tatsächlich gemeldete Tokens/Quoten, Zeitstempel, Reset-Zeiten | Keine Rechnung, keine erfundenen Kosten; gelöschte Chats zählen nicht mehr in der lokalen Statistik |

## Hardware

Für KI-Clients, Coding und einfache Browser-Aufgaben ist keine eigene Inferenz-GPU nötig: Die Modelle laufen beim Anbieter. Für interaktive Unity-/Blender-Arbeit ist eine geeignete GPU sinnvoll. Der aktuelle Xvfb-Stream verwendet zunächst Software-Rendering; GPU-Passthrough/VirtualGL ist **nicht** implementiert. Ein normales VPS-Setup ist damit keine Zusage für flüssige 3D-Editoren.

Offizielle Anforderungen: [Unity](https://docs.unity3d.com/6000.0/Documentation/Manual/system-requirements.html), [Blender](https://www.blender.org/download/requirements/).

## Daten und Betrieb

- `.bridge-data/state.json`: Profil, SSH-Ziel/Host-Key, Account-Metadaten, Projekte und Chats; atomare Schreibvorgänge. Keine SSH-Passwörter oder Bridge-Schlüssel darin.
- Auf dem SSH-Host: `~/.cloudki/accounts/<id>/`, `~/.cloudki/uploads/`, `~/.cloudki/workspace/`, `~/.cloudki/desktop/`, `~/.cloudki/tools/`.
- Provider-Tokens verwalten die offiziellen Clients. Account-Entfernung in der Bridge widerruft diese Tokens nicht. Im Anbieter abmelden und das zugehörige Profil gezielt bereinigen.
- Browser-Cookies bleiben im dedizierten Chromium-Profil. Uploads und native Provider-Verläufe bleiben beim Löschen eines Bridge-Chats erhalten. Aufbewahrung und Backups bewusst verwalten.
- Vor Updates Bridge stoppen und Datenordner sichern. Bei beschädigter `state.json` stoppt der Dienst, statt die Historie zu überschreiben.
- Grenzen: 8 Accounts, 3 gleichzeitige Antworten, 200 Chats, 400 Nachrichten/Chat, 8 MiB/Upload, 200 MiB Uploads pro Prozesslauf, 30 Minuten/Turn. Ein einzelner Prozess; kein Clusterbetrieb.

Nicht als öffentliches, gemeinsam genutztes Hosting-Angebot einsetzen. Insbesondere die Voraussetzungen der Provider für Authentifizierung und kommerzielle Nutzung separat prüfen. [OpenAI App-Server-Dokumentation](https://learn.chatgpt.com/docs/app-server) unterscheidet lokale/Open-Source-Integrationen von kommerziellen oder gehosteten Diensten.

Siehe außerdem [SECURITY.md](SECURITY.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) und [AI_PROJECT_CONTEXT.md](AI_PROJECT_CONTEXT.md).
