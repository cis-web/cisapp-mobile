var exec = require('cordova/exec');

/**
 * cordova.plugins.cisAppSettings
 * --------------------------------------------------------------------
 * Thin JS bridge over the native "CISAppSettings" Android plugin.
 * All methods are safe to call from any HTML page in the app; on
 * platforms where the native side isn't installed (plain browser,
 * iOS, etc.) they simply reject and the caller should fall back to
 * manual on-screen instructions.
 * --------------------------------------------------------------------
 */
var CISAppSettings = {

    /**
     * Opens the OS "App Notification Settings" screen for this app,
     * so the user can flip the master notification switch on/off
     * without hunting through Settings manually.
     * @returns {Promise<void>}
     */
    openNotificationSettings: function () {
        return new Promise(function (resolve, reject) {
            exec(resolve, reject, 'CISAppSettings', 'openNotificationSettings', []);
        });
    },

    /**
     * Requests the user to exempt this app from battery optimization
     * (shows the native Android "Allow" / "Deny" system dialog).
     * Requires REQUEST_IGNORE_BATTERY_OPTIMIZATIONS in the manifest
     * (already declared by this plugin).
     * @returns {Promise<void>}
     */
    requestIgnoreBatteryOptimizations: function () {
        return new Promise(function (resolve, reject) {
            exec(resolve, reject, 'CISAppSettings', 'requestIgnoreBatteryOptimizations', []);
        });
    },

    /**
     * Returns whether the app is already exempt from battery
     * optimization, so the UI can hide the button once it's done.
     * @returns {Promise<boolean>}
     */
    isIgnoringBatteryOptimizations: function () {
        return new Promise(function (resolve, reject) {
            exec(function (r) { resolve(!!r); }, reject, 'CISAppSettings', 'isIgnoringBatteryOptimizations', []);
        });
    },

    /**
     * Opens the generic "App Info" details screen (same as the
     * existing openAppSettings() fallback in notification-setup.html),
     * kept here too so every screen can rely on one single plugin.
     * @returns {Promise<void>}
     */
    openAppDetailsSettings: function () {
        return new Promise(function (resolve, reject) {
            exec(resolve, reject, 'CISAppSettings', 'openAppDetailsSettings', []);
        });
    }
};

module.exports = CISAppSettings;
