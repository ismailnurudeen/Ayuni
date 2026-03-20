package com.ayuni.app.platform

import platform.Foundation.NSLog

actual fun logError(tag: String, message: String, throwable: Throwable?) {
    NSLog("%@: %@\n%@", tag, message, throwable?.stackTraceToString() ?: "")
}

actual fun logInfo(tag: String, message: String) {
    NSLog("%@: %@", tag, message)
}
