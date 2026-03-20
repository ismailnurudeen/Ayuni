package com.ayuni.app.platform

interface CameraCapture {
    fun captureSelfie()
}

interface IdDocumentScanner {
    fun scanGovernmentId()
}

interface PushRegistrar {
    fun registerPushToken()
}

interface ShareIntentLauncher {
    fun shareViaWhatsApp(message: String)
    fun shareViaSms(message: String)
}

interface SecretStore {
    fun put(key: String, value: String)
    fun get(key: String): String?
}
