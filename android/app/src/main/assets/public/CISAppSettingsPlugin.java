package com.cissulaimany.appsettings;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;

/**
 * Native bridge used by www/cisAppSettings.js.
 *
 * Exposes three actions to JavaScript:
 *   - openNotificationSettings
 *   - requestIgnoreBatteryOptimizations
 *   - isIgnoringBatteryOptimizations
 *   - openAppDetailsSettings
 */
public class CISAppSettingsPlugin extends CordovaPlugin {

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) {
        switch (action) {
            case "openNotificationSettings":
                openNotificationSettings(callbackContext);
                return true;
            case "requestIgnoreBatteryOptimizations":
                requestIgnoreBatteryOptimizations(callbackContext);
                return true;
            case "isIgnoringBatteryOptimizations":
                isIgnoringBatteryOptimizations(callbackContext);
                return true;
            case "openAppDetailsSettings":
                openAppDetailsSettings(callbackContext);
                return true;
            default:
                return false;
        }
    }

    private void openNotificationSettings(CallbackContext callbackContext) {
        try {
            Intent intent = new Intent();
            String packageName = cordova.getActivity().getPackageName();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                intent.setAction(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
                intent.putExtra(Settings.EXTRA_APP_PACKAGE, packageName);
            } else {
                intent.setAction("android.settings.APP_NOTIFICATION_SETTINGS");
                intent.putExtra("app_package", packageName);
                intent.putExtra("app_uid", cordova.getActivity().getApplicationInfo().uid);
            }
            cordova.getActivity().startActivity(intent);
            callbackContext.success();
        } catch (Exception e) {
            // Fall back to the generic app-details screen if the OEM
            // doesn't support the notification-settings intent.
            openAppDetailsSettings(callbackContext);
        }
    }

    private void requestIgnoreBatteryOptimizations(CallbackContext callbackContext) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                // Battery optimization exemptions don't exist before Marshmallow.
                callbackContext.success();
                return;
            }
            String packageName = cordova.getActivity().getPackageName();
            PowerManager pm = (PowerManager) cordova.getActivity()
                    .getSystemService(android.content.Context.POWER_SERVICE);

            if (pm != null && pm.isIgnoringBatteryOptimizations(packageName)) {
                // Already exempt — nothing to do.
                callbackContext.success();
                return;
            }

            Intent intent = new Intent();
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + packageName));
            cordova.getActivity().startActivity(intent);
            callbackContext.success();
        } catch (Exception e) {
            callbackContext.error("Could not open battery optimization prompt: " + e.getMessage());
        }
    }

    private void isIgnoringBatteryOptimizations(CallbackContext callbackContext) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, true));
                return;
            }
            String packageName = cordova.getActivity().getPackageName();
            PowerManager pm = (PowerManager) cordova.getActivity()
                    .getSystemService(android.content.Context.POWER_SERVICE);
            boolean ignoring = pm != null && pm.isIgnoringBatteryOptimizations(packageName);
            callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.OK, ignoring));
        } catch (Exception e) {
            callbackContext.error("Could not read battery optimization status: " + e.getMessage());
        }
    }

    private void openAppDetailsSettings(CallbackContext callbackContext) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", cordova.getActivity().getPackageName(), null);
            intent.setData(uri);
            cordova.getActivity().startActivity(intent);
            callbackContext.success();
        } catch (Exception e) {
            callbackContext.error("Could not open app details settings: " + e.getMessage());
        }
    }
}
