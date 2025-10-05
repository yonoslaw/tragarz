# Tragarz Client

Tragarz Client to narzędzie CLI do synchronizacji plików z serwerem Tragarz.

## Instalacja

```bash
cd tragarz-client
npm install
npm link  # Instaluje globalnie jako 'tragarz'
```

## Użycie

### 1. Łączenie z projektem

```bash
# Nowy projekt
tragarz connect MojProjekt https://server.url admin123

# Z opisem
tragarz connect MojProjekt https://server.url admin123 --description "Opis projektu"

# Wymuszenie (nadpisanie istniejącej konfiguracji)
tragarz connect MojProjekt https://server.url admin123 --force
```

### 2. Wysyłanie zmian (Push)

```bash
# Standardowy push
tragarz push

# Z potwierdzeniem automatycznym
tragarz push --yes

# Z wymuszeniem (rozwiązuje konflikty)
tragarz push --force

# Z szczegółami
tragarz push --verbose
```

### 3. Pobieranie zmian (Pull)

```bash
# Standardowy pull
tragarz pull

# Z wymuszeniem (nadpisuje lokalne pliki)
tragarz pull --force

# Z backupem konfliktowych plików
tragarz pull --backup

# Zachowaj lokalne pliki usunięte na serwerze
tragarz pull --keep-local
```

### 4. Zarządzanie snapshot'ami (Memory)

```bash
# Stwórz snapshot
tragarz memory "Opis snapshot'a"

# Lista snapshot'ów
tragarz memory --list

# Przywróć snapshot
tragarz memory --restore <snapshot-id>

# Przywróć bez backup'u
tragarz memory --restore <snapshot-id> --no-backup --yes
```

### 5. Status projektu

```bash
# Pokaż status
tragarz status

# Z dodatkowymi informacjami
tragarz status --verbose
```

## Pliki konfiguracyjne

### .tragarz.json
Automatycznie tworzony plik konfiguracji projektu:
```json
{
  "projectName": "MojProjekt",
  "serverUrl": "https://server.url",
  "token": "auth_token",
  "lastSync": "2025-01-20T10:30:00Z",
  "files": {
    "file1.js": "hash123",
    "dir/file2.js": "hash456"
  }
}
```

### .tragarzignore
Plik z wzorcami plików do ignorowania (podobny do .gitignore):
```
node_modules/
.git/
*.log
.env
dist/
```

## Przykłady użycia

### Początkowa konfiguracja
```bash
# 1. Połącz z projektem
tragarz connect MojProjekt localhost:8080 admin123

# 2. Wyślij lokalne pliki
tragarz push

# 3. Sprawdź status
tragarz status
```

### Codzienne użycie
```bash
# Pobierz zmiany od zespołu
tragarz pull

# Pracuj lokalnie...

# Wyślij swoje zmiany
tragarz push

# Stwórz snapshot przed większymi zmianami
tragarz memory "Przed refaktoryzacją API"
```

### Praca zespołowa
```bash
# Pobierz najnowsze zmiany
tragarz pull --backup  # Backup lokalnych zmian

# Rozwiąż konflikty ręcznie, potem:
tragarz push --force  # Wyślij swoje zmiany
```

## Opcje globalnych flag

- `--verbose` / `-v` - Pokaż szczegółowe informacje
- `--yes` / `-y` - Automatyczne potwierdzenie
- `--force` / `-f` - Wymuś operację
- `--help` / `-h` - Pokaż pomoc

## Struktura katalogów

```
tragarz-client/
├── src/
│   ├── cli.js           # Główny CLI
│   ├── config.js        # Zarządzanie .tragarz.json
│   ├── api.js          # Komunikacja z serwerem
│   ├── fileSync.js     # Synchronizacja plików
│   └── commands/       # Implementacje komend
│       ├── connect.js
│       ├── push.js
│       ├── pull.js
│       └── memory.js
├── bin/
│   └── tragarz          # Plik wykonywalny
└── package.json
```

## Funkcje bezpieczeństwa

- Token-based authentication
- Hash-based file integrity checking
- Automatic backup creation
- Path traversal protection
- Input validation

## Rozwiązywanie problemów

### Problemy z połączeniem
```bash
# Sprawdź konfigurację
tragarz status

# Połącz ponownie
tragarz connect MojProjekt server.url hasło --force
```

### Konflikty plików
```bash
# Backup i pull
tragarz pull --backup

# Lub wymuszenie
tragarz push --force
```

### Reset konfiguracji
```bash
rm .tragarz.json .tragarzignore
tragarz connect MojProjekt server.url hasło
```