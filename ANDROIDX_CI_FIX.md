# Почему ошибка повторялась

В репозитории отсутствовал корневой файл `gradle.properties`, поэтому Gradle не видел
`android.useAndroidX=true`.

Теперь исправление продублировано двумя способами:

1. В архиве есть корневой `gradle.properties`.
2. GitHub Actions перед сборкой сам создаёт этот файл на runner-е.

Даже если `gradle.properties` снова не загрузится через интерфейс GitHub,
workflow всё равно включит AndroidX перед запуском Gradle.
