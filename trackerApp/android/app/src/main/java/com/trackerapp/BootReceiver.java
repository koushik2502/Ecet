package com.trackerapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class BootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
      Intent i = new Intent(context, ForegroundLocationService.class);
      i.putExtra("deviceId", "device_" + android.os.Build.SERIAL);
      i.putExtra("serverUrl", "http://<YOUR_PC_IP>:4000");
      if (android.os.Build.VERSION.SDK_INT >= 26) {
        context.startForegroundService(i);
      } else {
        context.startService(i);
      }
    }
  }
}
