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

    // Tell Gradle where jniLibs are
    sourceSets {
        getByName("main") {
            jniLibs.srcDirs("src/main/jniLibs")
        }
    }

    // CRITICAL: Tell Gradle NOT to strip libffmpeg.so
    // Stripping removes the ELF entry point making it
    // non-executable. We need it intact.
    packaging {
        jniLibs {
            keepDebugSymbols += setOf("**/libffmpeg.so")
        }
    }
}

chaquopy {
    defaultConfig {
        buildPython("C:/Users/pascal/AppData/Local/Programs/Python/Python312/python.exe")
        version = "3.12"
        pip {
            install("yt-dlp")
            install("fastapi")
            install("uvicorn")
            install("aiofiles")
            install("httpx")
            install("python-multipart")
            install("anyio")
        }
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
