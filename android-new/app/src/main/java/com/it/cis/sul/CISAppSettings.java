package com.it.cis.sul;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CISAppSettings")
public class CISAppSettings extends Plugin {

    // ١. فەرمانی بردن بۆ لاپەڕەی ڕێکخستنی پاتری (Battery Optimization)
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent();
            String packageName = context.getPackageName();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + packageName));
            } else {
                intent.setAction(Settings.ACTION_SETTINGS);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("کێشەیەک هەیە لە کردنەوەی لاپەڕەی پاتری: " + e.getLocalizedMessage());
        }
    }

    // ٢. فەرمانی بردن بۆ لاپەڕەی ڕێکخستنی نۆتیفیکەیشن (Notification Settings)
    @PluginMethod
    public void openNotificationSettings(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent();
            String packageName = context.getPackageName();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, packageName);
            } else {
                intent.setAction("android.settings.APP_NOTIFICATION_SETTINGS");
                intent.putExtra("app_package", packageName);
                intent.putExtra("app_uid", context.getApplicationInfo().uid);
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("کێشەیەک هەیە لە کردنەوەی لاپەڕەی نۆتیفیکەیشن: " + e.getLocalizedMessage());
        }
    }

    // کۆدە کۆنەکان بۆ پاراستنی داتاکان ئەگەر پێویست بکات
    @PluginMethod
    public void getSetting(PluginCall call) {
        String key = call.getString("key");
        if (key == null) {
            call.reject("Key is missing");
            return;
        }
        SharedPreferences sharedPref = getContext().getSharedPreferences("CISPrefs", Context.MODE_PRIVATE);
        String value = sharedPref.getString(key, "");

        JSObject ret = new JSObject();
        ret.put("value", value);
        call.resolve(ret);
    }

    @PluginMethod
    public void saveSetting(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || value == null) {
            call.reject("Key or Value is missing");
            return;
        }
        SharedPreferences sharedPref = getContext().getSharedPreferences("CISPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = sharedPref.edit();
        editor.putString(key, value);
        editor.apply();

        call.resolve();
    }
}