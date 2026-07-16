# Исправление ошибки GitHub Actions

Ошибка сборки была вызвана тем, что зависимость
`com.google.android.gms:play-services-code-scanner:16.1.0`
использует AndroidX, а в проекте AndroidX не был включён.

В корень проекта добавлен файл `gradle.properties`:

```properties
android.useAndroidX=true
android.enableJetifier=true
android.suppressUnsupportedCompileSdk=35
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
```

После загрузки этого файла задача `:app:checkDebugAarMetadata`
должна пройти.
