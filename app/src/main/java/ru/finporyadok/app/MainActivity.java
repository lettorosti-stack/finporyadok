package ru.finporyadok.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;
import android.os.Bundle;
import java.io.OutputStream;
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
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;
import androidx.core.content.FileProvider;

import com.google.android.gms.tasks.Task;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

import org.json.JSONObject;

public class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private static final int FILE_SAVE_REQUEST = 1002;
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
        webView.addJavascriptInterface(new AndroidFileBridge(), "AndroidFileBridge");
        webView.addJavascriptInterface(new AndroidOfficialDataBridge(), "AndroidOfficialDataBridge");
        webView.setWebViewClient(new WebViewClient());
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




    public final class AndroidOfficialDataBridge {
        @JavascriptInterface
        public void fetchMoscowChildMinimum(String requestedYear) {
            new Thread(() -> {
                try {
                    int year;
                    try { year = Integer.parseInt(requestedYear); }
                    catch (Exception ignored) { year = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR); }

                    String query = "прожиточный минимум для детей Москва " + year + " постановление";
                    String searchUrl = "https://www.mos.ru/search/?q=" + URLEncoder.encode(query, "UTF-8");
                    String searchHtml = readUrl(searchUrl);
                    String documentUrl = findOfficialDocumentUrl(searchHtml);
                    String sourceUrl = documentUrl == null ? searchUrl : documentUrl;
                    String documentHtml = documentUrl == null ? searchHtml : readUrl(documentUrl);
                    String plain = Html.fromHtml(documentHtml, Html.FROM_HTML_MODE_LEGACY).toString()
                            .replace('\u00A0', ' ').replaceAll("\\s+", " ");

                    long amount = extractChildMinimum(plain, year);
                    if (amount <= 0) {
                        String searchPlain = Html.fromHtml(searchHtml, Html.FROM_HTML_MODE_LEGACY).toString()
                                .replace('\u00A0', ' ').replaceAll("\\s+", " ");
                        amount = extractChildMinimum(searchPlain, year);
                    }
                    if (amount <= 0) throw new IllegalStateException("На официальном портале не удалось распознать сумму для детей");

                    String decree = extractDecreeNumber(plain);
                    JSONObject result = new JSONObject();
                    result.put("region", "Москва");
                    result.put("year", year);
                    result.put("amount", amount);
                    result.put("decreeNumber", decree == null ? "" : decree);
                    result.put("decreeUrl", sourceUrl);
                    result.put("source", "Официальный портал Мэра и Правительства Москвы");
                    result.put("fetchedAt", new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", java.util.Locale.US).format(new java.util.Date()));
                    String js = "window.onMoscowChildMinimumLoaded(" + JSONObject.quote(result.toString()) + ");";
                    webView.post(() -> webView.evaluateJavascript(js, null));
                } catch (Exception error) {
                    String message = error.getMessage() == null ? "Ошибка загрузки официальных данных" : error.getMessage();
                    String js = "window.onMoscowChildMinimumError(" + JSONObject.quote(message) + ");";
                    webView.post(() -> webView.evaluateJavascript(js, null));
                }
            }).start();
        }
    }

    private String readUrl(String urlText) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(urlText).openConnection();
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(20000);
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
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
}
