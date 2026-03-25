@file:Suppress("DEPRECATION", "DEPRECATION_ERROR")

plugins {
    id("org.jetbrains.kotlin.multiplatform")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.compose")
    id("com.android.application")
    id("app.cash.sqldelight")
    id("com.google.gms.google-services")
}

val apiBaseUrl = project.findProperty("API_BASE_URL")?.toString()
    ?: System.getenv("API_BASE_URL")
    ?: "http://localhost:3000/v1"

kotlin {
    jvmToolchain(17)
    androidTarget {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
            freeCompilerArgs.add("-Xexpect-actual-classes")
        }
    }
    iosX64()
    iosArm64()
    iosSimulatorArm64()

    targets.withType<org.jetbrains.kotlin.gradle.plugin.mpp.KotlinNativeTarget>().configureEach {
        compilations.getByName("main").defaultSourceSet.dependencies {
            implementation("io.ktor:ktor-client-darwin:2.3.12")
        }
    }

    sourceSets {
        val commonMain by getting {
            dependencies {
                implementation(compose.runtime)
                implementation(compose.foundation)
                implementation(compose.material3)
                implementation(compose.ui)
                implementation(compose.components.resources)
                implementation("org.jetbrains.compose.material:material-icons-extended:1.7.3")
                implementation("io.ktor:ktor-client-core:2.3.12")
                implementation("io.ktor:ktor-client-content-negotiation:2.3.12")
                implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.12")
                implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
                implementation("org.jetbrains.kotlinx:kotlinx-datetime:0.7.1")
            }
        }
        val commonTest by getting {
            dependencies {
                implementation(kotlin("test"))
            }
        }
        val androidMain by getting {
            dependencies {
                implementation("androidx.activity:activity-compose:1.10.0")
                implementation("androidx.appcompat:appcompat:1.7.0")
                implementation("androidx.core:core-ktx:1.15.0")
                implementation("androidx.security:security-crypto:1.1.0")
                implementation("io.ktor:ktor-client-okhttp:2.3.12")
                implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
                implementation("com.google.firebase:firebase-auth")
            }
        }
    }
}

android {
    namespace = "com.ayuni.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ayuni.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"

        buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

sqldelight {
    databases {
        create("AyuniDatabase") {
            packageName.set("com.ayuni.db")
        }
    }
}

// Generate config file for iOS
val generateIosConfig by tasks.registering {
    doLast {
        val configDir = file("src/iosMain/kotlin/com/ayuni/app/platform")
        configDir.mkdirs()
        val configFile = file("$configDir/GeneratedApiBaseUrl.kt")
        configFile.writeText("""
            package com.ayuni.app.platform

            internal const val GENERATED_API_BASE_URL = "$apiBaseUrl"
        """.trimIndent())
    }
}

tasks.matching { it.name.contains("compileKotlinIos") }.configureEach {
    dependsOn(generateIosConfig)
}
