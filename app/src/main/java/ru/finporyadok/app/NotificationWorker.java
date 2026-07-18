package ru.finporyadok.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class NotificationWorker extends Worker {
    private static final String CHANNEL_ID = "finporyadok_reminders";

    public NotificationWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull @Override
    public Result doWork() {
        Context context = getApplicationContext();
        createChannel(context);
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String title = getInputData().getString("title");
        String body = getInputData().getString("body");
        String id = getInputData().getString("notificationId");
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title == null ? "ФинПорядок" : title)
                .setContentText(body == null ? "У вас есть финансовое напоминание" : body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent);
        try {
            NotificationManagerCompat.from(context).notify(id == null ? 1 : id.hashCode(), builder.build());
            if (id != null) context.getSharedPreferences("finporyadok_notifications", Context.MODE_PRIVATE).edit().putBoolean("delivered:" + id, true).apply();
            return Result.success();
        } catch (SecurityException error) {
            return Result.failure();
        }
    }

    private static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Финансовые напоминания", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Платежи, кредиты, подписки, страховки, имущество и документы");
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
