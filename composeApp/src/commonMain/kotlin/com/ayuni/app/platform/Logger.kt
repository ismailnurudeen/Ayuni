package com.ayuni.app.platform

expect fun logError(tag: String, message: String, throwable: Throwable? = null)
expect fun logInfo(tag: String, message: String)
