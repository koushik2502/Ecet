package com.trackerapp;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import android.content.Intent;

public class NativeStarter extends ReactContextBaseJavaModule {
  ReactApplicationContext reactContext;
  public NativeStarter(ReactApplicationContext ctx){ super(ctx); reactContext = ctx; }
  @Override public String getName(){ return "NativeStarter"; }

  @ReactMethod
  public void startService(String deviceId, String serverUrl){
    Intent intent = new Intent(reactContext, ForegroundLocationService.class);
    intent.putExtra("deviceId", deviceId);
    intent.putExtra("serverUrl", serverUrl);
    if (android.os.Build.VERSION.SDK_INT >= 26) {
      reactContext.startForegroundService(intent);
    } else {
      reactContext.startService(intent);
    }
  }
}
