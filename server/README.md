# Tragarz Server

Tragarz Server to komponent serwerowy systemu synchronizacji plików Tragarz.

## Instalacja

```bash
cd tragarz-server
npm install
```

## Konfiguracja

Serwer używa pliku `tragarz.json` do konfiguracji. Domyślne ustawienia:

```json
{
  "port": 8080,
  "password": "admin123",
  "dataDir": "./projects",
  "maxProjectSize": "1GB",
  "allowedHosts": ["*"]
}
```

## Uruchomienie

### Tryb produkcyjny
```bash
npm start
```

### Tryb deweloperski (z automatycznym restartem)
```bash
npm run dev
```

## API Endpoints

### Uwierzytelnianie
- `POST /auth` - Logowanie z hasłem

### Zarządzanie projektami
- `GET /projects` - Lista projektów
- `POST /projects/:name` - Utworzenie nowego projektu
- `GET /projects/:name/info` - Informacje o projekcie

### Operacje na plikach
- `GET /projects/:name/files` - Lista plików w projekcie
- `POST /projects/:name/files` - Upload plików
- `GET /projects/:name/files/*` - Download pliku
- `DELETE /projects/:name/files/*` - Usunięcie pliku

### Snapshots
- `POST /projects/:name/snapshot` - Utworzenie snapshot'a
- `GET /projects/:name/snapshots` - Lista snapshot'ów
- `POST /projects/:name/restore/:snapshotId` - Przywrócenie snapshot'a

## Struktura katalogów

```
tragarz-server/
├── src/
│   ├── server.js          # Główny serwer
│   ├── auth.js           # Uwierzytelnianie
│   ├── projectManager.js # Zarządzanie projektami
│   ├── fileManager.js    # Operacje na plikach
│   └── snapshotManager.js # System snapshot'ów
├── projects/             # Katalog z projektami
└── yonhubserver.json    # Konfiguracja
```

## Bezpieczeństwo

- Hashowane hasła (bcrypt)
- Walidacja nazw projektów i plików
- Ochrona przed path traversal
- Rate limiting
- CORS configuration
- Helmet security headers
