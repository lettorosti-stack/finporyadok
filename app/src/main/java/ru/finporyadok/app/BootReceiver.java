package ru.finporyadok.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        // WorkManager restores persisted one-time work after reboot. This receiver
        // intentionally remains lightweight and ensures the app is eligible for boot events.
    }
}
