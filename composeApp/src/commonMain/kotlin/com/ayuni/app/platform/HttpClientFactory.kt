package com.ayuni.app.platform

import io.ktor.client.HttpClient

expect fun createPlatformHttpClient(): HttpClient
