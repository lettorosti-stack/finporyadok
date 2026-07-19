# Firebase для ФинПорядка

Проект Firebase: `family-budget-d951d`

## Что нужно сделать в Firebase Console

1. Откройте Project settings.
2. Добавьте Android-приложение.
3. Укажите Android package name:
   `ru.finporyadok.app`
4. Скачайте `google-services.json`.
5. Положите файл сюда:
   `app/google-services.json`
6. Включите Realtime Database в Firebase Console.
7. Для первой локальной проверки можно временно использовать тестовые правила базы.

## Как это работает в приложении

Firebase подключён как дополнительный способ синхронизации рядом с существующей облачной папкой Android.

Если `app/google-services.json` отсутствует, APK продолжит работать, но в настройках Firebase будет статус `Не настроено`.

Если файл добавлен и APK пересобран, в настройках появятся кнопки:

- `Отправить в Firebase`
- `Получить из Firebase`
- `Автоотправка в Firebase`

Данные сохраняются в Realtime Database по пути:

`finporyadok/families/default/state`

Перед применением данных из Firebase приложение создаёт локальный снимок и объединяет базу через существующий механизм синхронизации.
