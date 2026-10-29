# Lokale Prüfung — 29.10.2026

Geprüft auf Windows mit Node.js 24.22.1. Der Auftraggeber hat eine lokale Übergabe gewählt; keine echten Server-/Provider-Zugangsdaten wurden verwendet. Repository-Basis: `a51496b`.

## Ausgeführt

| Prüfung | Ergebnis |
| --- | --- |
| `npm ci --ignore-scripts` und spätere Lockfile-Installation | Erfolgreich; optionale native SSH2-Beschleunigung nicht vorausgesetzt |
| `npm run build` | TypeScript und Vite erfolgreich |
| `npm test` | 11 Tests bestanden, 0 fehlgeschlagen |
| `npm audit --json` | 0 bekannte Schwachstellen gemeldet; Momentaufnahme, kein allgemeiner Sicherheitsbeweis |
| `node --check scripts/browser-mcp.mjs` / `scripts/token.mjs` | Erfolgreich |
| `git diff --check` | Keine Whitespace-Fehler |
| `npx cap sync ios` | Assets und Swift-Package-Konfiguration erfolgreich synchronisiert; kein Xcode-/IPA-Build |
| Auth-Mutationstest | Zugriffskontrolle temporär auf `true` gesetzt: Tests schlugen erwartungsgemäß fehl; Original wiederhergestellt; finale Tests bestanden |

Der initiale JavaScript-Bundle umfasst ca. 281 kB / 86 kB gzip. Terminal (ca. 333 kB) und VNC (ca. 182 kB) werden erst bei Bedarf geladen. Das sind Build-Größen, keine gemessene iPad-Laufzeitperformance.

## Aussagekraft der Tests

- HTTP-Integration: echte lokale Express-/WebSocket-Instanz. Fehlender Token → 401; fremder Origin → 403; unbekannte IDs/ungültige Pfade abgewiesen; leere Initialdaten; alte ungeschützte Terminal-Route nicht mehr erreichbar; einmal verwendete WebSocket-Tickets nicht erneut nutzbar.
- SSH-Integration: echter lokaler SSH2-Testserver mit eigens erzeugtem Testschlüssel. Host-Key-Challenge vor Passwort-Authentifizierung, erfolgreiche Verbindung nach Bestätigung, geänderter Schlüssel abgelehnt, falsches Passwort und Exit-Code 7 korrekt als Fehler behandelt. Das ist **kein** Linux-Server-/SFTP-Endtest.
- Persistenz: Neustart erhält Daten, unterbrochene Antworten werden als fehlgeschlagen markiert, beschädigte Daten werden nicht überschrieben.
- JSON-RPC: korrekte Zuordnung paralleler Antworten, in Blöcke geteiltes UTF-8, Freigabe-Anfragen, Disconnect, Timeout, ungültiges JSON und ungültige RPC-Objekte.
- Codex/OpenCode/Antigravity: deterministische Protokoll-Fixtures prüfen Adapterlogik, Stream-Verarbeitung, Quoten-Umrechnung, Provider-Ergebnisstatus und explizite Freigaben. **Keine tatsächliche Provider-Anmeldung oder Inferenz.**
- Kontextwechsel: sichtbare Nachrichten und Dateiverweise bleiben erhalten; zu großer Verlauf wird abgelehnt.

## Browserprüfung

Die eigene lokale App wurde im In-App-Browser bedient, anschließend auch aus dem gebauten `dist` über den Backend-Server geöffnet:

- Bridge-Login mit ausschließlich lokalem Testschlüssel; Erststart zeigt die Einführung.
- Profil gespeichert und nach einem Reload wieder vorhanden.
- SSH-Aufbau zu einem geschlossenen lokalen Testport: sichtbares `ECONNREFUSED`, kein Simulations-Fallback, Account-Schritt bleibt gesperrt.
- Keine Demo-Chats/Accounts. Senden ohne Server/Modell deaktiviert.
- 820 × 1180: Hochformat ohne horizontales Überlaufen, Composer und Onboarding erreichbar.
- 1366 × 1024: Seitenleiste, Chat und Workspace sichtbar; Tastaturbedienung der Trennlinie ändert die Aufteilung tatsächlich; kein Überlaufen.
- 390 × 844: Einstellungen und Token-Ansicht passen ins schmale Layout; Navigation horizontal scrollbar; keine erfundenen Tokenwerte.
- Screenshots befinden sich neben dem Übergabe-ZIP. Dies ist Chromium-Viewport-Prüfung, **kein** Safari-/iPadOS-Gerätetest. Die Bildschirmtastatur wurde nicht auf einem echten Gerät geprüft.

## Vor Live-Nutzung noch offen

1. Offizielle Client-Versionen auf einem dedizierten Linux-Testbenutzer erfassen. Je Anbieter echte Anmeldung und einen erfolgreichen Inferenz-Turn nachweisen.
2. Zwei Accounts desselben Providers getrennt anmelden; Identitäten, Modellkataloge, gespeicherte Profile und gegebenenfalls Keyring-Verhalten prüfen. Verzeichnistrennung ist kein Nachweis vollständiger Provider-Isolation.
3. Codex-/OpenCode-Freigaben live ablehnen und erlauben; Abbruch, Provider-Exit, Netzverlust, SSH-Neuverbindung und Browser-Hintergrundmodus prüfen.
4. Browser-Plugin gegen echtes Chromium/CDP und jeden gewählten Provider prüfen. Keine automatische Modellverfügbarkeit behaupten.
5. SFTP-Projektauswahl/Upload auf Linux, große Dateien und Pfade mit Leerzeichen/Apostrophen testen.
6. Debian-/Ubuntu-Paketinstallation, Chromium-/Blender-/Unity-Hub-Start, Xvfb, VNC und Touch-/Keyboard-Eingaben prüfen. Unity-Repo, Editor-Download und Lizenzierung separat erledigen. GPU-Beschleunigung fehlt weiterhin.
7. IPA auf macOS bauen/signieren und auf echtem iPad in beiden Orientierungen, Split View, mit Tastatur und nach App-Wechsel prüfen.
8. HTTPS-Reverse-Proxy, Origin-Liste, Firewall, Host-Key-Betrieb, Dateisystemrechte, verschlüsselte Datenträger, Upload-Aufbewahrung und Backup/Restore prüfen.
9. GitHub-Workflows ausführen; passende Required Checks durch einen Repo-Administrator aktivieren. OSV-/Gitleaks-CI-Ergebnisse und langfristige Last-/Speichertests liegen noch nicht vor.

Dieser Bericht dokumentiert die lokale Prüfung vor der Veröffentlichung. Anschließend hat der Auftraggeber den direkten Push auf `main` und den IPA-Build angefordert. Aktuelle CI-Nachweise und IPA-Artefakte stehen in GitHub Actions; sie ersetzen keine Live-Provider- oder iPad-Geräteprüfung. Kein fremder Server wurde eingerichtet.
