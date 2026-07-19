# Удаление лишней папки finance-icons

Папка `finance-icons` не используется приложением и удалена из очищенного пакета.

Для очистки уже существующей локальной папки и GitHub запустите из PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
& "C:\Users\User\Documents\приложение для семейного бюджета\remove-duplicate-finance-icons.ps1"
```

Скрипт:
- удаляет `finance-icons` с компьютера;
- выполняет `git rm`;
- создаёт commit;
- отправляет удаление в ветку `main`.
