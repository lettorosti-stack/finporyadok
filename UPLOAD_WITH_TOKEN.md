# Загрузка в GitHub без GitHub App

Если Codex/GitHub connector не имеет права записи, используйте локальный скрипт:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\upload-to-github.ps1
```

Скрипт попросит GitHub token в защищенном вводе и загрузит файлы в:

```text
lettorosti-stack/finporyadok
```

## Как создать token

1. Откройте GitHub.
2. Нажмите аватар справа сверху.
3. **Settings**.
4. Слева внизу **Developer settings**.
5. **Personal access tokens**.
6. **Fine-grained tokens**.
7. **Generate new token**.
8. Repository access: выберите `lettorosti-stack/finporyadok`.
9. Permissions:
   - **Contents: Read and write**
   - **Actions: Read and write**
10. Скопируйте token и вставьте его в prompt скрипта.

Token не сохраняется в файлы и не показывается в чате.

После загрузки откройте:

```text
https://github.com/lettorosti-stack/finporyadok/actions
```

Workflow **Build Android APK** соберет APK и выложит артефакт `finporyadok-debug-apk`.
