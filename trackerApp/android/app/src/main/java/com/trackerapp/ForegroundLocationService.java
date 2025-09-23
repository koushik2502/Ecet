package com.trackerapp;

import android.app.Service;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Notification;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.Context;
import android.location.Location;

import android.os.Build;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.*;

import org.json.JSONObject;

import java.net.HttpURLConnection;
import java.net.URL;

public class ForegroundLocationService extends Service {
  public static final String CHANNEL_ID = "tracker_channel";
  private FusedLocationProviderClient fusedLocationClient;
  private String deviceId = "unknown";
  private String serverUrl = "http://<YOUR_PC_IP>:4000";

  @Override
  public void onCreate() {
    super.onCreate();
    createNotificationChannel();
    fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent != null){
      if (intent.hasExtra("deviceId")) deviceId = intent.getStringExtra("deviceId");
      if (intent.hasExtra("serverUrl")) serverUrl = intent.getStringExtra("serverUrl");
    }
    Notification notification = buildNotification("Tracking running");
    startForeground(1, notification);
    startLocationUpdates();
    return START_STICKY;
  }

  private Notification buildNotification(String text) {
    Intent intent = new Intent(this, getMainActivityClass());
    PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE);
    return new NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Tracker")
      .setContentText(text)
      .setSmallIcon(android.R.drawable.ic_menu_mylocation)
      .setContentIntent(pendingIntent)
      .build();
  }

  private Class getMainActivityClass() {
    try {
      return Class.forName(getPackageName() + ".MainActivity");
    } catch (ClassNotFoundException e) { return null; }
  }

  private void startLocationUpdates(){
    LocationRequest request = LocationRequest.create();
    request.setInterval(5000);
    request.setFastestInterval(3000);
    request.setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
    fusedLocationClient.requestLocationUpdates(request, new LocationCallback(){
      @Override
      public void onLocationResult(LocationResult result){
        Location loc = result.getLastLocation();
        if (loc != null){
          sendLocation(loc);
        }
      }
    }, null);
  }

  private void sendLocation(Location loc){
    try {
      JSONObject payload = new JSONObject();
      payload.put("latitude", loc.getLatitude());
      payload.put("longitude", loc.getLongitude());
      payload.put("accuracy", loc.getAccuracy());
      payload.put("speed", loc.getSpeed());
      JSONObject body = new JSONObject();
      body.put("deviceId", deviceId);
      body.put("type", "location");
      body.put("payload", payload);
      URL url = new URL(serverUrl + "/api/update");
      HttpURLConnection conn = (HttpURLConnection) url.openConnection();
      conn.setRequestMethod("POST");
      conn.setRequestProperty("Content-Type", "application/json");
      conn.setDoOutput(true);
      conn.getOutputStream().write(body.toString().getBytes("UTF-8"));
      conn.getResponseCode();
      conn.disconnect();
    } catch (Exception e) { e.printStackTrace(); }
  }

  @Override
  public void onDestroy(){
    super.onDestroy();
  }

  @Nullable
  @Override
  public IBinder onBind(Intent intent){ return null; }

  private void createNotificationChannel(){
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Tracker", NotificationManager.IMPORTANCE_LOW);
      NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
      manager.createNotificationChannel(channel);
    }
  }
}
