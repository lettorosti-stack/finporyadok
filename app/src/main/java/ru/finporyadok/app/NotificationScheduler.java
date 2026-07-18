package ru.finporyadok.app;

import android.content.Context;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.concurrent.TimeUnit;

public final class NotificationScheduler {
    private static final String PREFIX = "finporyadok-reminder-";
    private NotificationScheduler() {}

    public static void sync(Context context, JSONArray items) throws Exception {
        WorkManager manager = WorkManager.getInstance(context);
        android.content.SharedPreferences delivered = context.getSharedPreferences("finporyadok_notifications", Context.MODE_PRIVATE);
        manager.cancelAllWorkByTag("finporyadok-reminders");
        long now = System.currentTimeMillis();
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item == null) continue;
            String id = item.optString("id", "notification-" + i);
            if (delivered.getBoolean("delivered:" + id, false)) continue;
            long triggerAt = item.optLong("triggerAt", now + 1000L);
            long delay = Math.max(1000L, triggerAt - now);
            Data data = new Data.Builder()
                    .putString("notificationId", id)
                    .putString("title", item.optString("title", "ФинПорядок"))
                    .putString("body", item.optString("body", "У вас есть финансовое напоминание"))
                    .putString("kind", item.optString("kind", "general"))
                    .build();
            OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(NotificationWorker.class)
                    .setInitialDelay(delay, TimeUnit.MILLISECONDS)
                    .setInputData(data)
                    .addTag("finporyadok-reminders")
                    .build();
            manager.enqueueUniqueWork(PREFIX + id, ExistingWorkPolicy.REPLACE, request);
        }
    }
}
