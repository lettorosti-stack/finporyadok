# Сборка APK через GitHub Actions

Проект подготовлен как Android WebView-обертка текущего приложения. Дизайн и логика берутся из файлов:

- `index.html`
- `styles.css`
- `app.js`
- `andromoney-data.js`

## Как собрать APK на GitHub

1. Создайте новый репозиторий на GitHub.
2. Загрузите в него все файлы из этой папки, включая:
   - `.github/workflows/build-apk.yml`
   - `settings.gradle`
   - `build.gradle`
   - `app/build.gradle`
   - `app/src/main/...`
3. Откройте вкладку **Actions**.
4. Запустите workflow **Build Android APK** вручную через **Run workflow** или сделайте push в `main`.
5. После успешной сборки скачайте артефакт **finporyadok-debug-apk**.
6. Внутри архива будет файл:
   - `app-debug.apk`

## Установка на Android-телефон

Включите на телефоне:

- режим разработчика;
- USB debugging / Отладка по USB.

Команда установки:

```bat
adb install -r app-debug.apk
```

Если APK лежит в папке загрузок:

```bat
adb install -r "%USERPROFILE%\Downloads\app-debug.apk"
```

## Что делает Android-версия

APK открывает локальную HTML/CSS/JS-версию приложения внутри Android WebView:

```text
file:///android_asset/www/index.html
```

Файлы приложения копируются в APK автоматически задачей Gradle `syncWebAssets`.
