package com.ayuni.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.ayuni.app.platform.initializePhoneAuthBridge
import com.ayuni.app.platform.initializeTokenStorage

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initializeTokenStorage(this)
        initializePhoneAuthBridge(this)
        setContent { AyuniApp() }
    }
}
