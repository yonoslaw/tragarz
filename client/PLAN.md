# YonHub Client Architecture Plan

## Główne komponenty

### 1. Struktura klienta
```
yonhub-client/
├── src/
│   ├── cli.js           # Główny CLI interface
│   ├── commands/        # Komendy CLI
│   │   ├── connect.js   # yonhub connect
│   │   ├── push.js      # yonhub push
│   │   ├── pull.js      # yonhub pull
│   │   └── memory.js    # yonhub memory
│   ├── config.js        # Zarządzanie .yonhub.json
│   ├── api.js          # Komunikacja z serwerem
│   ├── fileSync.js     # Synchronizacja plików
│   └── ignore.js       # Obsługa .yonhubignore
├── bin/
│   └── yonhub          # Plik wykonywalny
└── package.json
```

### 2. Konfiguracja projektu (.yonhub.json)
```json
{
  "projectName": "SUPAPROJEKT",
  "serverUrl": "https://server.url",
  "token": "encrypted_auth_token",
  "lastSync": "2025-01-20T10:30:00Z",
  "files": {
    "file1.js": "hash123",
    "dir/file2.js": "hash456"
  }
}
```

### 3. Plik ignorowania (.yonhubignore)
```
node_modules/
.git/
*.log
temp/
.env
```

### 4. CLI Commands

#### yonhub connect PROJECT_NAME SERVER_URL PASSWORD
1. Uwierzytelnianie na serwerze
2. Sprawdzenie czy projekt istnieje
3. Jeśli tak → download wszystkich plików
4. Jeśli nie → utworzenie nowego projektu
5. Zapisanie konfiguracji w .yonhub.json

#### yonhub push
1. Wczytanie .yonhub.json
2. Skanowanie plików (z pominięciem .yonhubignore)
3. Porównanie hash'y plików z ostatnim sync'em
4. Upload tylko zmienionych/nowych plików
5. Aktualizacja .yonhub.json

#### yonhub pull
1. Pobranie listy plików z serwera
2. Porównanie z lokalnymi plikami
3. Download nowych/zmienionych plików
4. Aktualizacja .yonhub.json

#### yonhub memory [DESCRIPTION]
1. Wywołanie API snapshot'a na serwerze
2. Serwer tworzy ZIP całego projektu
3. Zwrócenie ID snapshot'a

### 5. Implementacja Node.js

#### Technologie:
- **commander.js** - CLI framework
- **axios** - HTTP client
- **crypto** - hashowanie plików
- **form-data** - upload plików
- **globby** - wyszukiwanie plików
- **ignore** - parsowanie .yonhubignore
- **chalk** - kolorowanie output'u

#### Główne klasy:
1. **ConfigManager** - zarządzanie .yonhub.json
2. **ApiClient** - komunikacja z serwerem
3. **FileManager** - operacje na plikach lokalnych
4. **IgnoreManager** - obsługa .yonhubignore
5. **SyncManager** - logika synchronizacji

### 6. Workflow komend

#### Connect:
```
yonhub connect PROJEKT server.url password
↓
Auth na serwerze
↓
Sprawdzenie projektu
↓
Download plików (jeśli istnieje)
↓
Utworzenie .yonhub.json
```

#### Push:
```
yonhub push
↓
Wczytanie konfiguracji
↓
Skanowanie plików lokalnych
↓
Porównanie hash'y
↓
Upload zmienionych plików
↓
Aktualizacja konfiguracji
```

#### Pull:
```
yonhub pull
↓
Pobranie listy z serwera
↓
Porównanie z lokalnymi
↓
Download zmienionych
↓
Aktualizacja lokalnych plików
```

### 7. Obsługa błędów
- Brak połączenia z serwerem
- Nieprawidłowe uwierzytelnianie
- Konflikty plików
- Brak uprawnień do zapisu
- Przekroczenie limitu rozmiaru

### 8. Security
- Przechowywanie zaszyfrowanego tokena
- Walidacja URL'i serwera
- Sprawdzanie integralności plików (hash'e)
- Zabezpieczenie przed path traversal