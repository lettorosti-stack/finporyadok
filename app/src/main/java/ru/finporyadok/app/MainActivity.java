package ru.finporyadok.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.view.ViewGroup;

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


    public final class AndroidFileBridge {
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
