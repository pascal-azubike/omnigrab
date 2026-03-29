plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.chaquo.python")
}

android {
    namespace = "com.omnigrab.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.omnigrab.android"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        ndk {
            abiFilters += listOf("arm64-v8a", "x86_64")
        }

        python {
            // Use Python 3.12 — matches desktop and is supported
            version = "3.12"

            // Python source directory
            // app/src/main/python/ is the default and correct location

            pip {
                // Core download engine
                install("yt-dlp")

                // Web server
                install("fastapi")
                install("uvicorn")

                // Utilities
                install("aiofiles")
                install("httpx")
                install("python-multipart")
                install("anyio")

                // NOTE: toga, toga-android are NOT installed
                // Kotlin replaces Toga entirely
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
    }
}

dependencies {
    // Kotlin + AndroidX core
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.11.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")

    // WebView with modern features
    implementation("androidx.webkit:webkit:1.10.0")

    // Coroutines for async Kotlin operations
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Lifecycle for Service management
    implementation("androidx.lifecycle:lifecycle-service:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")

    // Document file for SAF operations
    implementation("androidx.documentfile:documentfile:1.0.1")
}
