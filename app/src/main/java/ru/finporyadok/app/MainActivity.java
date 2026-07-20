package ru.finporyadok.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationManagerCompat;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Base64;
import android.os.Bundle;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import android.text.Html;
import java.nio.charset.StandardCharsets;
import android.webkit.JavascriptInterface;
import android.util.Base64;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import androidx.core.content.FileProvider;
import androidx.documentfile.provider.DocumentFile;

import com.google.android.gms.tasks.Task;
import com.google.firebase.FirebaseApp;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.barcode.BarcodeScanner;
import com.google.mlkit.vision.barcode.BarcodeScanning;
import com.google.mlkit.vision.barcode.BarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import org.json.JSONObject;
import org.json.JSONArray;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int FILE_SAVE_REQUEST = 1002;
    private static final int CLOUD_FOLDER_REQUEST = 1003;
    private static final int NOTIFICATION_PERMISSION_REQUEST = 1004;
    private static final String CLOUD_PREFS = "finporyadok_cloud";
    private static final String CLOUD_URI_KEY = "tree_uri";
    private static final String FIREBASE_DATABASE_URL = "https://family-budget-d951d-default-rtdb.firebaseio.com/";
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String pendingFileContent;
    private String pendingFileName;
    private GmsBarcodeScanner barcodeScanner;

    @Override
    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setDatabaseEnabled(true);

        GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .enableAutoZoom()
                .build();
        barcodeScanner = GmsBarcodeScanning.getClient(this, options);

        webView.addJavascriptInterface(new AndroidQrBridge(), "AndroidQrScanner");
        webView.addJavascriptInterface(new AndroidQrImageBridge(), "AndroidQrImageScanner");
        webView.addJavascriptInterface(new AndroidFileBridge(), "AndroidFileBridge");
        webView.addJavascriptInterface(new AndroidOfficialDataBridge(), "AndroidOfficialDataBridge");
        webView.addJavascriptInterface(new AndroidReceiptOcrBridge(), "AndroidReceiptOcr");
        webView.addJavascriptInterface(new AndroidCloudSyncBridge(), "AndroidCloudSync");
        webView.addJavascriptInterface(new AndroidFirebaseSyncBridge(), "AndroidFirebaseSync");
        webView.addJavascriptInterface(new AndroidNotificationBridge(), "AndroidNotifications");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, android.webkit.WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri == null ? "" : uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) { }
                    return true;
                }
                return false;
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;
                Intent intent = params.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                } catch (Exception exception) {
                    filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        setContentView(webView);
        webView.loadUrl("file:///android_asset/www/index.html");
    }


    public final class AndroidNotificationBridge {
        @JavascriptInterface
        public void sync(String json) {
            try {
                NotificationScheduler.sync(getApplicationContext(), new JSONArray(json == null ? "[]" : json));
            } catch (Exception error) {
                sendNotificationState(false, "Не удалось запланировать уведомления: " + error.getMessage());
            }
        }

        @JavascriptInterface
        public void requestPermission() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33 && ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
                } else {
                    sendNotificationState(NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled(), "");
                }
            });
        }

        @JavascriptInterface
        public boolean areEnabled() {
            if (Build.VERSION.SDK_INT >= 33 && ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false;
            return NotificationManagerCompat.from(MainActivity.this).areNotificationsEnabled();
        }
    }

    private void sendNotificationState(boolean enabled, String message) {
        String js = "window.onNativeNotificationState && window.onNativeNotificationState(" + enabled + "," + JSONObject.quote(message == null ? "" : message) + ");";
        if (webView != null) webView.post(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NOTIFICATION_PERMISSION_REQUEST) {
            boolean enabled = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            sendNotificationState(enabled, enabled ? "Системные уведомления включены" : "Разрешение на уведомления не предоставлено");
        }
    }

    public final class AndroidQrBridge {
        @JavascriptInterface
        public void scanQr() {
            runOnUiThread(() -> {
                if (barcodeScanner == null) {
                    sendQrError("Сканер QR недоступен.");
                    return;
                }
                Task<Barcode> task = barcodeScanner.startScan();
                task.addOnSuccessListener(barcode -> {
                    String value = barcode.getRawValue();
                    if (value == null || value.trim().isEmpty()) {
                        sendQrError("QR-код не содержит данных.");
                        return;
                    }
                    String js = "window.onNativeQrScanned(" + JSONObject.quote(value) + ");";
                    webView.post(() -> webView.evaluateJavascript(js, null));
                });
                task.addOnCanceledListener(() -> sendQrError("Сканирование отменено."));
                task.addOnFailureListener(error ->
                        sendQrError(error.getMessage() == null
                                ? "Не удалось запустить сканер QR."
                                : error.getMessage())
                );
            });
        }
    }


    public final class AndroidQrImageBridge {
        @JavascriptInterface
        public void recognizeBase64(String base64) {
            runOnUiThread(() -> {
                BarcodeScanner scanner = null;
                try {
                    byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                    Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    if (bitmap == null) {
                        sendQrImageError("Не удалось открыть изображение чека.");
                        return;
                    }
                    BarcodeScannerOptions options = new BarcodeScannerOptions.Builder()
                            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                            .build();
                    scanner = BarcodeScanning.getClient(options);
                    final BarcodeScanner finalScanner = scanner;
                    com.google.mlkit.vision.common.InputImage image = com.google.mlkit.vision.common.InputImage.fromBitmap(bitmap, 0);
                    scanner.process(image)
                            .addOnSuccessListener(barcodes -> {
                                String value = "";
                                for (Barcode barcode : barcodes) {
                                    String raw = barcode.getRawValue();
                                    if (raw != null && !raw.trim().isEmpty()) { value = raw; break; }
                                }
                                if (value.isEmpty()) sendQrImageError("QR-код на изображении не найден.");
                                else {
                                    final String finalValue = value;
                                    String js = "window.onNativeQrImageScanned(" + JSONObject.quote(finalValue) + ");";
                                    webView.post(() -> webView.evaluateJavascript(js, null));
                                }
                                finalScanner.close();
                            })
                            .addOnFailureListener(error -> {
                                sendQrImageError(error.getMessage() == null ? "Не удалось распознать QR на изображении." : error.getMessage());
                                finalScanner.close();
                            });
                } catch (Exception error) {
                    if (scanner != null) scanner.close();
                    sendQrImageError(error.getMessage() == null ? "Ошибка распознавания QR." : error.getMessage());
                }
            });
        }
    }

    private void sendQrImageError(String message) {
        String js = "window.onNativeQrImageScanError(" + JSONObject.quote(message) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    public final class AndroidOfficialDataBridge {
        @JavascriptInterface
        public void fetchMoscowChildMinimum(String requestedPeriod) {
            new Thread(() -> {
                long deadline = System.currentTimeMillis() + 12000L;
                try {
                    java.util.Calendar now = java.util.Calendar.getInstance();
                    int year = now.get(java.util.Calendar.YEAR), month = now.get(java.util.Calendar.MONTH) + 1;
                    try {
                        String[] parts = requestedPeriod == null ? new String[0] : requestedPeriod.split("-");
                        year = Integer.parseInt(parts[0]);
                        if (parts.length > 1) month = Math.max(1, Math.min(12, Integer.parseInt(parts[1])));
                    } catch (Exception ignored) { }
                    int quarter = (month - 1) / 3 + 1;
                    String half = month <= 6 ? "первое полугодие" : "второе полугодие";
                    String periodKey = String.format(java.util.Locale.US, "%04d-%02d", year, month);
                    String cacheKey = year >= 2021 ? "year:" + year : (year >= 2013 ? "half:" + year + ":" + (month <= 6 ? 1 : 2) : "quarter:" + year + ":" + quarter);
                    String periodPhrase = year >= 2021 ? (year + " год") : (year >= 2013 ? (half + " " + year) : (quarter + " квартал " + year));

                    // Для известных периодов сначала открываем прямые публикации без поисковой выдачи.
                    java.util.ArrayList<String> directUrls = new java.util.ArrayList<>();
                    if (year == 2026) directUrls.add("https://www.garant.ru/hotlaw/moscow/1908878/");

                    String exactQuery = "величина прожиточного минимума в городе Москве для детей " + periodPhrase + " постановление Правительства Москвы";
                    String encoded = URLEncoder.encode(exactQuery, "UTF-8");
                    java.util.ArrayList<String> searchUrls = new java.util.ArrayList<>();
                    searchUrls.add("https://yandex.ru/search/?text=" + URLEncoder.encode("site:garant.ru " + exactQuery, "UTF-8"));
                    searchUrls.add("https://yandex.ru/search/?text=" + URLEncoder.encode("site:publication.pravo.gov.ru " + exactQuery, "UTF-8"));

                    Exception lastError = null;
                    for (String sourceUrl : directUrls) {
                        if (System.currentTimeMillis() >= deadline) break;
                        try {
                            JSONObject found = parsePmPage(sourceUrl, year, periodKey, cacheKey, periodPhrase, deadline);
                            if (found != null) { sendMoscowPm(found); return; }
                        } catch (Exception error) { lastError = error; }
                    }

                    for (String searchUrl : searchUrls) {
                        if (System.currentTimeMillis() >= deadline) break;
                        try {
                            String searchHtml = readUrl(searchUrl, 3500, 4500);
                            java.util.List<String> candidates = findPmDocumentUrls(searchHtml, searchUrl);
                            int checked = 0;
                            for (String sourceUrl : candidates) {
                                if (checked++ >= 4 || System.currentTimeMillis() >= deadline) break;
                                try {
                                    JSONObject found = parsePmPage(sourceUrl, year, periodKey, cacheKey, periodPhrase, deadline);
                                    if (found != null) { sendMoscowPm(found); return; }
                                } catch (Exception error) { lastError = error; }
                            }
                            // Иногда сумма присутствует прямо в выдаче.
                            JSONObject fromSearch = parsePmHtml(searchHtml, searchUrl, year, periodKey, cacheKey, periodPhrase);
                            if (fromSearch != null) { sendMoscowPm(fromSearch); return; }
                        } catch (Exception error) { lastError = error; }
                    }
                    throw new IllegalStateException(lastError == null ? "Данные за выбранный период не найдены за 12 секунд" : lastError.getMessage());
                } catch (Exception error) {
                    String message = error.getMessage() == null ? "Ошибка загрузки данных" : error.getMessage();
                    String js = "window.onMoscowChildMinimumError(" + JSONObject.quote(message) + ");";
                    webView.post(() -> webView.evaluateJavascript(js, null));
                }
            }).start();
        }
    }

    private JSONObject parsePmPage(String sourceUrl, int year, String periodKey, String cacheKey, String periodPhrase, long deadline) throws Exception {
        if (System.currentTimeMillis() >= deadline) return null;
        String html = readUrl(sourceUrl, 3500, 4500);
        return parsePmHtml(html, sourceUrl, year, periodKey, cacheKey, periodPhrase);
    }

    private JSONObject parsePmHtml(String html, String sourceUrl, int year, String periodKey, String cacheKey, String periodPhrase) throws Exception {
        String plain = Html.fromHtml(html, Html.FROM_HTML_MODE_LEGACY).toString()
                .replace('\u00A0', ' ').replaceAll("\\s+", " ");
        long amount = extractChildMinimum(plain, year);
        if (amount <= 0) return null;
        String decree = extractDecreeNumber(plain);
        JSONObject result = new JSONObject();
        result.put("region", "Москва");
        result.put("year", year);
        result.put("periodKey", periodKey);
        result.put("cacheKey", cacheKey);
        result.put("periodLabel", periodPhrase);
        result.put("amount", amount);
        result.put("decreeNumber", decree == null ? "" : decree);
        result.put("decreeUrl", sourceUrl);
        result.put("source", sourceUrl.contains("garant.ru") ? "ГАРАНТ" : "Официальный портал правовой информации");
        result.put("fetchedAt", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", java.util.Locale.US).format(new java.util.Date()));
        return result;
    }

    private void sendMoscowPm(JSONObject result) {
        String js = "window.onMoscowChildMinimumLoaded(" + JSONObject.quote(result.toString()) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private java.util.List<String> findPmDocumentUrls(String html, String baseUrl) {
        java.util.LinkedHashSet<String> urls = new java.util.LinkedHashSet<>();
        Pattern[] patterns = new Pattern[] {
                Pattern.compile("[\\\"']([^\\\"']*/hotlaw/moscow/\\d+/?[^\\\"']*)[\\\"']", Pattern.CASE_INSENSITIVE),
                Pattern.compile("[\\\"']([^\\\"']*(?:Document/View|document/view|Document\\?id=|/document/)[^\\\"']*)[\\\"']", Pattern.CASE_INSENSITIVE),
                Pattern.compile("[\\\"']([^\\\"']*/products/ipo/prime/doc/[^\\\"']*)[\\\"']", Pattern.CASE_INSENSITIVE)
        };
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(html);
            while (matcher.find() && urls.size() < 8) {
                String value = matcher.group(1).replace("&amp;", "&");
                try { urls.add(new URL(new URL(baseUrl), value).toString()); } catch (Exception ignored) { }
            }
        }
        return new java.util.ArrayList<>(urls);
    }

    private String readUrl(String urlText) throws Exception {
        return readUrl(urlText, 3500, 4500);
    }

    private String readUrl(String urlText, int connectTimeout, int readTimeout) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlText).openConnection();
        connection.setConnectTimeout(connectTimeout);
        connection.setReadTimeout(readTimeout);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Android) FinPoryadok/0.7");
        connection.setRequestProperty("Accept-Language", "ru-RU,ru;q=0.9");
        try {
            int code = connection.getResponseCode();
            if (code < 200 || code >= 400) throw new IllegalStateException("Официальный портал вернул HTTP " + code);
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) builder.append(line).append('\n');
            return builder.toString();
        } finally {
            connection.disconnect();
        }
    }

    private String findOfficialDocumentUrl(String html) {
        Pattern pattern = Pattern.compile("(?:https://www\\.mos\\.ru)?(/authority/documents/doc/[^\\\"'<> ]+)", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(html);
        if (!matcher.find()) return null;
        String path = matcher.group(1).replace("&amp;", "&");
        return path.startsWith("http") ? path : "https://www.mos.ru" + path;
    }

    private long extractChildMinimum(String text, int year) {
        Pattern[] patterns = new Pattern[] {
                Pattern.compile("для детей.{0,220}?(\\d{2}[ \\u00A0]?\\d{3})\\s*(?:руб|₽)", Pattern.CASE_INSENSITIVE),
                Pattern.compile("детей.{0,220}?(\\d{2}[ \\u00A0]?\\d{3})", Pattern.CASE_INSENSITIVE),
                Pattern.compile("(\\d{2}[ \\u00A0]?\\d{3})\\s*(?:руб|₽).{0,120}?для детей", Pattern.CASE_INSENSITIVE)
        };
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            while (matcher.find()) {
                String raw = matcher.group(1).replace(" ", "").replace("\u00A0", "");
                try {
                    long value = Long.parseLong(raw);
                    if (value >= 10000 && value <= 100000) return value;
                } catch (Exception ignored) { }
            }
        }
        return 0;
    }

    private String extractDecreeNumber(String text) {
        Pattern pattern = Pattern.compile("(?:постановлен(?:ие|ия)[^№]{0,80})?№\\s*([0-9]+(?:-[А-ЯA-Z]{1,4})?)", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        Matcher matcher = pattern.matcher(text);
        return matcher.find() ? "Постановление № " + matcher.group(1) : "";
    }

    public final class AndroidReceiptOcrBridge {
        @JavascriptInterface
        public void recognizeBase64(String base64) {
            runOnUiThread(() -> {
                try {
                    byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                    Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    if (bitmap == null) { sendReceiptOcrError("Не удалось открыть изображение чека."); return; }
                    com.google.mlkit.vision.common.InputImage image = com.google.mlkit.vision.common.InputImage.fromBitmap(bitmap, 0);
                    com.google.mlkit.vision.text.TextRecognizer recognizer = com.google.mlkit.vision.text.TextRecognition.getClient(com.google.mlkit.vision.text.latin.TextRecognizerOptions.DEFAULT_OPTIONS);
                    recognizer.process(image).addOnSuccessListener(result -> {
                        String js = "window.onNativeReceiptTextRecognized(" + JSONObject.quote(result.getText()) + ");";
                        webView.evaluateJavascript(js, null);
                    }).addOnFailureListener(error -> sendReceiptOcrError(error.getMessage() == null ? "Не удалось распознать текст чека." : error.getMessage()));
                } catch (Exception error) { sendReceiptOcrError(error.getMessage() == null ? "Ошибка распознавания чека." : error.getMessage()); }
            });
        }
    }

    private void sendReceiptOcrError(String message) {
        String js = "window.onNativeReceiptTextError(" + JSONObject.quote(message) + ");";
        webView.evaluateJavascript(js, null);
    }

    public final class AndroidCloudSyncBridge {
        @JavascriptInterface
        public void chooseCloudFolder() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION | Intent.FLAG_GRANT_PREFIX_URI_PERMISSION);
                    startActivityForResult(intent, CLOUD_FOLDER_REQUEST);
                } catch (Exception error) { sendCloudReadError(error.getMessage()); }
            });
        }

        @JavascriptInterface
        public void getCloudStatus() {
            String raw = getSharedPreferences(CLOUD_PREFS, MODE_PRIVATE).getString(CLOUD_URI_KEY, "");
            if (raw == null || raw.isEmpty()) { sendCloudStatus(false, ""); return; }
            try {
                Uri uri = Uri.parse(raw);
                DocumentFile folder = DocumentFile.fromTreeUri(MainActivity.this, uri);
                sendCloudStatus(folder != null && folder.exists(), folder == null ? "" : folder.getName());
            } catch (Exception error) { sendCloudStatus(false, ""); }
        }

        @JavascriptInterface
        public void disconnectCloudFolder() {
            getSharedPreferences(CLOUD_PREFS, MODE_PRIVATE).edit().remove(CLOUD_URI_KEY).apply();
            String js = "window.onNativeCloudFolderDisconnected();";
            webView.post(() -> webView.evaluateJavascript(js, null));
        }

        @JavascriptInterface
        public void readSyncFile(String fileName) {
            new Thread(() -> {
                try {
                    DocumentFile folder = getCloudFolder();
                    DocumentFile file = folder.findFile(safeCloudFileName(fileName));
                    if (file == null || !file.exists()) throw new IllegalStateException("Файл синхронизации не найден");
                    try (InputStream input = getContentResolver().openInputStream(file.getUri()); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        if (input == null) throw new IllegalStateException("Не удалось открыть облачный файл");
                        byte[] buffer = new byte[8192]; int count;
                        while ((count = input.read(buffer)) != -1) out.write(buffer, 0, count);
                        String text = out.toString(StandardCharsets.UTF_8.name());
                        String js = "window.onNativeCloudRead(" + JSONObject.quote(text) + ");";
                        webView.post(() -> webView.evaluateJavascript(js, null));
                    }
                } catch (Exception error) { sendCloudReadError(error.getMessage()); }
            }).start();
        }

        @JavascriptInterface
        public void writeSyncFile(String fileName, String content) {
            new Thread(() -> {
                try {
                    DocumentFile folder = getCloudFolder();
                    String safe = safeCloudFileName(fileName);
                    DocumentFile file = folder.findFile(safe);
                    if (file == null) file = folder.createFile("application/json", safe);
                    if (file == null) throw new IllegalStateException("Не удалось создать облачный файл");
                    try (OutputStream output = getContentResolver().openOutputStream(file.getUri(), "wt")) {
                        if (output == null) throw new IllegalStateException("Не удалось открыть облачный файл для записи");
                        output.write((content == null ? "" : content).getBytes(StandardCharsets.UTF_8));
                        output.flush();
                    }
                    String js = "window.onNativeCloudWritten();";
                    webView.post(() -> webView.evaluateJavascript(js, null));
                } catch (Exception error) { sendCloudWriteError(error.getMessage()); }
            }).start();
        }
    }

    public final class AndroidFirebaseSyncBridge {
        @JavascriptInterface
        public boolean isConfigured() {
            return ensureFirebaseReady(false);
        }

        @JavascriptInterface
        public void getStatus() {
            boolean configured = ensureFirebaseReady(false);
            String js = "window.onNativeFirebaseStatus(" + configured + ");";
            webView.post(() -> webView.evaluateJavascript(js, null));
        }

        @JavascriptInterface
        public void readState(String syncPath) {
            if (!ensureFirebaseReady(true)) return;
            try {
                firebaseReference(syncPath).addListenerForSingleValueEvent(new ValueEventListener() {
                    @Override
                    public void onDataChange(DataSnapshot snapshot) {
                        String content = "";
                        Object raw = snapshot.getValue();
                        if (raw instanceof String) {
                            content = (String) raw;
                        } else if (raw != null) {
                            content = raw.toString();
                        }
                        String js = "window.onNativeFirebaseRead(" + JSONObject.quote(content) + ");";
                        webView.post(() -> webView.evaluateJavascript(js, null));
                    }

                    @Override
                    public void onCancelled(DatabaseError error) {
                        sendFirebaseError(error == null ? "Ошибка чтения Firebase" : error.getMessage());
                    }
                });
            } catch (Exception error) {
                sendFirebaseError(error.getMessage());
            }
        }

        @JavascriptInterface
        public void writeState(String syncPath, String content) {
            if (!ensureFirebaseReady(true)) return;
            try {
                firebaseReference(syncPath).setValue(content == null ? "" : content)
                        .addOnSuccessListener(unused -> {
                            String js = "window.onNativeFirebaseWritten();";
                            webView.post(() -> webView.evaluateJavascript(js, null));
                        })
                        .addOnFailureListener(error -> sendFirebaseError(error.getMessage()));
            } catch (Exception error) {
                sendFirebaseError(error.getMessage());
            }
        }
    }

    private boolean ensureFirebaseReady(boolean notifyWeb) {
        try {
            FirebaseApp app = FirebaseApp.initializeApp(this);
            if (app == null) {
                app = FirebaseApp.getInstance();
            }
            return app != null;
        } catch (Exception error) {
            if (notifyWeb) {
                String message = error.getMessage();
                sendFirebaseError(message == null || message.trim().isEmpty()
                        ? "Firebase не настроен. Добавьте app/google-services.json и пересоберите APK."
                        : message);
            }
            return false;
        }
    }

    private DatabaseReference firebaseReference(String syncPath) {
        String rawPath = syncPath == null || syncPath.trim().isEmpty()
                ? "families/default/state"
                : syncPath.trim();
        DatabaseReference reference = FirebaseDatabase.getInstance(FIREBASE_DATABASE_URL).getReference("finporyadok");
        for (String part : rawPath.split("/")) {
            String safe = safeFirebaseSegment(part);
            if (!safe.isEmpty()) {
                reference = reference.child(safe);
            }
        }
        return reference;
    }

    private String safeFirebaseSegment(String value) {
        if (value == null) return "";
        return value.trim().replaceAll("[.#$\\[\\]/]", "_");
    }

    private void sendFirebaseError(String message) {
        String safeMessage = message == null || message.trim().isEmpty()
                ? "Ошибка Firebase"
                : message;
        String js = "window.onNativeFirebaseError(" + JSONObject.quote(safeMessage) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private DocumentFile getCloudFolder() {
        String raw = getSharedPreferences(CLOUD_PREFS, MODE_PRIVATE).getString(CLOUD_URI_KEY, "");
        if (raw == null || raw.isEmpty()) throw new IllegalStateException("Облачная папка не подключена");
        DocumentFile folder = DocumentFile.fromTreeUri(this, Uri.parse(raw));
        if (folder == null || !folder.exists() || !folder.canRead() || !folder.canWrite()) throw new IllegalStateException("Нет доступа к выбранной облачной папке");
        return folder;
    }

    private String safeCloudFileName(String value) {
        String name = value == null || value.trim().isEmpty() ? "finporyadok-family-sync.json" : value.trim();
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private void sendCloudStatus(boolean connected, String name) {
        String js = "window.onNativeCloudStatus(" + connected + "," + JSONObject.quote(name == null ? "" : name) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
    private void sendCloudReadError(String message) {
        String js = "window.onNativeCloudReadError(" + JSONObject.quote(message == null ? "Ошибка чтения облака" : message) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }
    private void sendCloudWriteError(String message) {
        String js = "window.onNativeCloudWriteError(" + JSONObject.quote(message == null ? "Ошибка записи в облако" : message) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    public final class AndroidFileBridge {
        @JavascriptInterface
        public void openPdfBase64(String base64Data, String fileName) {
            new Thread(() -> {
                try {
                    if (base64Data == null || base64Data.trim().isEmpty()) {
                        throw new IllegalArgumentException("PDF-файл пуст.");
                    }
                    String safeName = (fileName == null || fileName.trim().isEmpty())
                            ? "insurance-policy.pdf"
                            : fileName.replaceAll("[^a-zA-Z0-9а-яА-Я._-]", "_");
                    if (!safeName.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")) {
                        safeName += ".pdf";
                    }
                    File directory = new File(getCacheDir(), "insurance_pdfs");
                    if (!directory.exists() && !directory.mkdirs()) {
                        throw new IllegalStateException("Не удалось подготовить папку для PDF.");
                    }
                    File pdfFile = new File(directory, safeName);
                    byte[] bytes = Base64.decode(base64Data, Base64.DEFAULT);
                    try (FileOutputStream stream = new FileOutputStream(pdfFile)) {
                        stream.write(bytes);
                        stream.flush();
                    }
                    Uri uri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            pdfFile
                    );
                    Intent intent = new Intent(Intent.ACTION_VIEW);
                    intent.setDataAndType(uri, "application/pdf");
                    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                    runOnUiThread(() -> {
                        try {
                            startActivity(Intent.createChooser(intent, "Открыть страховой полис"));
                        } catch (Exception error) {
                            sendPdfOpenError("На устройстве нет приложения для просмотра PDF.");
                        }
                    });
                } catch (Exception error) {
                    sendPdfOpenError(error.getMessage());
                }
            }).start();
        }

        @JavascriptInterface
        public void saveTextFile(String fileName, String mimeType, String content) {
            runOnUiThread(() -> {
                try {
                    pendingFileName = (fileName == null || fileName.trim().isEmpty())
                            ? "finporyadok-backup.json" : fileName;
                    pendingFileContent = content == null ? "" : content;
                    Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType((mimeType == null || mimeType.trim().isEmpty())
                            ? "application/octet-stream" : mimeType);
                    intent.putExtra(Intent.EXTRA_TITLE, pendingFileName);
                    startActivityForResult(intent, FILE_SAVE_REQUEST);
                } catch (Exception error) {
                    sendFileSaveError(error.getMessage());
                }
            });
        }
    }

    private void sendPdfOpenError(String message) {
        String safeMessage = message == null ? "Не удалось открыть PDF." : message;
        String js = "window.onNativePdfOpenError(" + JSONObject.quote(safeMessage) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void sendFileSaved(String fileName) {
        String js = "window.onNativeFileSaved(" + JSONObject.quote(fileName) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void sendFileSaveError(String message) {
        String safeMessage = message == null ? "Не удалось сохранить файл." : message;
        String js = "window.onNativeFileSaveError(" + JSONObject.quote(safeMessage) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    private void sendQrError(String message) {
        String js = "window.onNativeQrScanError(" + JSONObject.quote(message) + ");";
        webView.post(() -> webView.evaluateJavascript(js, null));
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == CLOUD_FOLDER_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                Uri uri = data.getData();
                int flags = data.getFlags() & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                try { getContentResolver().takePersistableUriPermission(uri, flags); } catch (Exception ignored) { }
                getSharedPreferences(CLOUD_PREFS, MODE_PRIVATE).edit().putString(CLOUD_URI_KEY, uri.toString()).apply();
                DocumentFile folder = DocumentFile.fromTreeUri(this, uri);
                String name = folder == null || folder.getName() == null ? "Облачная папка" : folder.getName();
                String js = "window.onNativeCloudFolderSelected(" + JSONObject.quote(name) + ");";
                webView.post(() -> webView.evaluateJavascript(js, null));
            }
            return;
        }
        if (requestCode == FILE_SAVE_REQUEST) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null) {
                Uri uri = data.getData();
                try (OutputStream output = getContentResolver().openOutputStream(uri)) {
                    if (output == null) throw new IllegalStateException("Не удалось открыть файл для записи.");
                    output.write((pendingFileContent == null ? "" : pendingFileContent)
                            .getBytes(StandardCharsets.UTF_8));
                    output.flush();
                    sendFileSaved(pendingFileName == null ? "Файл" : pendingFileName);
                } catch (Exception error) {
                    sendFileSaveError(error.getMessage());
                }
            }
            pendingFileContent = null;
            pendingFileName = null;
            return;
        }

        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) {
            return;
        }
        Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return !!(window.FinPoryadokBack && window.FinPoryadokBack());}catch(e){return false;}})();",
                handled -> {
                    if (!"true".equals(handled) && webView != null && webView.canGoBack()) {
                        webView.goBack();
                    }
                }
        );
    }
}
