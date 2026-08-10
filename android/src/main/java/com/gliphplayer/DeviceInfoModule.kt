package com.gliphplayer

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DeviceInfoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "DeviceInfoModule"
    }

    @ReactMethod
    fun getActiveAudioDeviceName(promise: Promise) {
        try {
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val devices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                
                var bluetoothDeviceName: String? = null
                
                for (device in devices) {
                    if (device.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP || 
                        device.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
                        bluetoothDeviceName = device.productName.toString()
                        break
                    }
                }
                
                if (bluetoothDeviceName != null) {
                    promise.resolve(bluetoothDeviceName)
                } else {
                    promise.resolve(null)
                }
            } else {
                promise.resolve(null)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
