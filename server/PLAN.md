# YonHub Server Architecture Plan

## Główne komponenty

### 1. Konfiguracja (yonhubserver.json)
```json
{
  "port": 8080,
  "password": "admin123",
  "dataDir": "./projects",
  "maxProjectSize": "1GB",
  "allowedHosts": ["*"]
}
```

### 2. Struktura katalogów serwera
```
yonhub-server/
├── src/
│   ├── server.js          # Główny serwer HTTP/WebSocket
│   ├── auth.js           # Uwierzytelnianie
│   ├── projectManager.js # Zarządzanie projektami
│   ├── fileManager.js    # Operacje na plikach
│   └── utils.js          # Narzędzia pomocnicze
├── projects/             # Katalog z projektami
│   └── [PROJECT_NAME]/   # Każdy projekt w osobnym folderze
│       ├── files/        # Pliki projektu
│       └── snapshots/    # Zrzuty pamięci (.zip)
├── package.json
└── yonhubserver.json
```

### 3. API Endpoints

#### Uwierzytelnianie
- `POST /auth` - Logowanie z hasłem

#### Zarządzanie projektami
- `GET /projects` - Lista projektów
- `POST /projects/:name` - Utworzenie nowego projektu
- `GET /projects/:name/info` - Informacje o projekcie

#### Operacje na plikach
- `GET /projects/:name/files` - Lista plików w projekcie
- `POST /projects/:name/files` - Upload plików (push)
- `GET /projects/:name/files/*` - Download pliku
- `DELETE /projects/:name/files/*` - Usunięcie pliku

#### Snapshots (memory)
- `POST /projects/:name/snapshot` - Utworzenie snapshot'a
- `GET /projects/:name/snapshots` - Lista snapshot'ów
- `POST /projects/:name/restore/:snapshotId` - Przywrócenie snapshot'a

### 4. Implementacja Node.js

#### Technologie:
- **Express.js** - serwer HTTP
- **multer** - upload plików
- **archiver** - tworzenie ZIP
- **extract-zip** - rozpakowywanie ZIP
- **crypto** - hashowanie haseł
- **fs-extra** - operacje na plikach

#### Główne klasy:
1. **AuthManager** - zarządzanie uwierzytelnianiem
2. **ProjectManager** - CRUD projektów
3. **FileManager** - upload/download/sync plików
4. **SnapshotManager** - zarządzanie snapshot'ami

### 5. Bezpieczeństwo
- Hashowanie haseł (bcrypt)
- Walidacja nazw projektów/plików
- Ograniczenia rozmiaru plików
- Rate limiting
- CORS configuration

### 6. Workflow serwera
1. Start serwera → wczytanie konfiguracji
2. Inicjalizacja katalogów projektów
3. Nasłuchiwanie na porcie
4. Obsługa requestów z uwierzytelnianiem
5. Operacje na systemie plików
6. Logowanie wszystkich operacji