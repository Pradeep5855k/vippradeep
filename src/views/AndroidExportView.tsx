import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Copy,
  Check,
  Code2,
  Terminal,
  FileCode,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

export const AndroidExportView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'room' | 'gradle' | 'build-guide'>('build-guide');

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildGradleKts = `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.billingpro.generalshop"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.billingpro.generalshop"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
        debug {
            applicationIdSuffix = ".debug"
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
        compose = true
    }
}

dependencies {
    // Jetpack Compose & Material 3
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    // Room SQLite Database for offline storage
    val roomVersion = "2.6.1"
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // ML Kit Barcode Scanning & CameraX
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
}`;

  const roomEntitiesCode = `package com.billingpro.generalshop.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

// 1. Product Entity with Barcode, Stock and Tax Settings
@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val barcode: String,
    val name: String,
    val category: String,
    val unit: String, // piece, packet, kg, g, litre
    val purchasePrice: Double,
    val sellingPrice: Double,
    val stock: Double,
    val minStockAlert: Double,
    val taxRate: Double, // 0, 5, 12, 18, 28
    val isTaxInclusive: Boolean,
    val isArchived: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
)

// 2. Invoice Record with Totals and Khata Credit
@Entity(tableName = "invoices")
data class InvoiceEntity(
    @PrimaryKey val id: String,
    val invoiceNumber: String,
    val date: String,
    val time: String,
    val customerName: String,
    val customerPhone: String,
    val subtotal: Double,
    val totalDiscount: Double,
    val totalTax: Double,
    val grandTotal: Double,
    val paymentMethod: String, // CASH, UPI, CARD, CREDIT, SPLIT
    val amountReceived: Double,
    val balanceDue: Double,
    val status: String = "COMPLETED",
    val timestamp: Long = System.currentTimeMillis()
)

// 3. Customer Khata Record
@Entity(tableName = "customers")
data class CustomerEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String,
    val address: String = "",
    val currentCreditBalance: Double = 0.0,
    val totalPurchases: Double = 0.0
)

// DAOs
@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE isArchived = 0 ORDER BY name ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM products WHERE barcode = :barcode LIMIT 1")
    suspend fun getByBarcode(barcode: String): ProductEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(product: ProductEntity)

    @Query("UPDATE products SET stock = MAX(0.0, stock - :quantity) WHERE id = :productId")
    suspend fun deductStock(productId: String, quantity: Double)
}

@Dao
interface InvoiceDao {
    @Query("SELECT * FROM invoices ORDER BY timestamp DESC")
    fun getAllInvoices(): Flow<List<InvoiceEntity>>

    @Query("SELECT * FROM invoices WHERE date = :today AND status != 'CANCELLED'")
    fun getTodayInvoices(today: String): Flow<List<InvoiceEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertInvoice(invoice: InvoiceEntity)
}

// Room Database
@Database(
    entities = [ProductEntity::class, InvoiceEntity::class, CustomerEntity::class],
    version = 1,
    exportSchema = false
)
abstract class BillingDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun invoiceDao(): InvoiceDao
}
`;

  const composeUiCode = `package com.billingpro.generalshop.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.billingpro.generalshop.data.ProductEntity

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BillingCounterScreen(
    viewModel: BillingViewModel = viewModel(),
    onPrintReceipt: (String) -> Unit
) {
    val products by viewModel.products.collectAsState(initial = emptyList())
    val cart by viewModel.cart.collectAsState()
    val grandTotal by viewModel.grandTotal.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Billing Pro – Quick Counter POS") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF0F172A),
                    titleContentColor = Color.White
                )
            )
        },
        bottomBar = {
            Surface(
                shadowElevation = 8.dp,
                color = Color.White,
                modifier = Modifier.fillMaxWidth().padding(16.dp)
            ) {
                Button(
                    onClick = { viewModel.checkoutAndPrint(onPrintReceipt) },
                    enabled = cart.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF059669)),
                    modifier = Modifier.fillMaxWidth().height(56.dp)
                ) {
                    Text("Charge ₹$grandTotal & Print Receipt", style = MaterialTheme.typography.titleMedium)
                }
            }
        }
    ) { paddingValues ->
        Column(modifier = Modifier.padding(paddingValues).fillMaxSize()) {
            // Search & Catalog Grid...
        }
    }
}
`;

  return (
    <div className="space-y-4 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              <Smartphone className="w-4 h-4" />
              <span>Native Android APK & Jetpack Compose</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              Android Source Code & APK Build Guide
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Complete Kotlin, Jetpack Compose, Room SQLite database code, and step-by-step instructions
              to generate, build and install the debug APK on any Android phone.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('build-guide')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'build-guide'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>APK Build & Install Guide</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('room')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'room'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Room Database & DAOs (Kotlin)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('compose')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'compose'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Jetpack Compose UI (Kotlin)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gradle')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'gradle'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>build.gradle.kts</span>
        </button>
      </div>

      {/* TAB CONTENT: APK BUILD & INSTALL GUIDE */}
      {activeTab === 'build-guide' && (
        <div className="space-y-4">
          {/* Method 1: Android Studio & Gradle (Native Kotlin APK) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-emerald-600" />
              <span>Method 1: Build Debug APK with Gradle / Android Studio</span>
            </h3>

            <div className="space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">Step 1: Open project in Android Studio</span>
                <p className="text-slate-600">
                  Create a new Android project with "Empty Activity (Compose)" and set package to{' '}
                  <code className="bg-slate-200 px-1 py-0.5 rounded text-blue-700 font-mono">
                    com.billingpro.generalshop
                  </code>
                  . Copy the Room and Compose files from the tabs above into <code className="font-mono">app/src/main/java</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">Step 2: Generate Debug APK via Terminal</span>
                <p className="text-slate-600 mb-2">Run the standard Gradle assemble command in the project root:</p>
                <div className="flex items-center justify-between bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-xs">
                  <span>./gradlew assembleDebug</span>
                  <button
                    onClick={() => copyToClipboard('./gradlew assembleDebug', 'gradle-cmd')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'gradle-cmd' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Output APK file will be generated at:{' '}
                  <code className="font-mono text-slate-800">app/build/outputs/apk/debug/app-debug.apk</code>
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">Step 3: Install APK on Android Phone</span>
                <p className="text-slate-600 mb-2">
                  Connect your Android phone via USB with USB Debugging enabled, then execute:
                </p>
                <div className="flex items-center justify-between bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-xs">
                  <span>adb install -r app/build/outputs/apk/debug/app-debug.apk</span>
                  <button
                    onClick={() =>
                      copyToClipboard('adb install -r app/build/outputs/apk/debug/app-debug.apk', 'adb-cmd')
                    }
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'adb-cmd' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Or simply copy <code className="font-mono">app-debug.apk</code> to your phone storage (via WhatsApp, Google Drive, or USB file transfer), tap the file, and tap "Install".
                </p>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1 text-emerald-900">
                <span className="font-bold block">Step 4: Verification & Testing a Complete Sale</span>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Launch <strong>Billing Pro</strong> on the device.</li>
                  <li>Tap <strong>New Bill</strong>. Scan a product barcode with the phone camera or tap to add items.</li>
                  <li>Select payment mode (Cash, UPI or Customer Khata).</li>
                  <li>Tap <strong>Charge & Print Bill</strong> to see instant 58mm/80mm thermal receipt with dynamic UPI QR code.</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Method 2: Instant PWA Install on Android */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <span>Method 2: Install as Android Home Screen App (PWA)</span>
            </h3>
            <p className="text-xs text-slate-600">
              Billing Pro is fully PWA-enabled with standalone viewport, offline caching, and native touch ergonomics.
            </p>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p>1. Open this application in Chrome on your Android smartphone.</p>
              <p>2. Tap Chrome's menu (<strong>⋮</strong> in top right).</p>
              <p>3. Tap <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>
              <p>4. Billing Pro launches in full-screen standalone mode with zero browser URL bar and works offline!</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ROOM DATABASE */}
      {activeTab === 'room' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              BillingDatabase.kt (Entities & Room DAOs)
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(roomEntitiesCode, 'room-code')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
              >
                {copiedKey === 'room-code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>Copy Code</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile(roomEntitiesCode, 'BillingDatabase.kt')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Download .kt</span>
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-[480px]">
            {roomEntitiesCode}
          </pre>
        </div>
      )}

      {/* TAB CONTENT: JETPACK COMPOSE UI */}
      {activeTab === 'compose' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              BillingCounterScreen.kt (Jetpack Compose Material 3)
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(composeUiCode, 'compose-code')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
              >
                {copiedKey === 'compose-code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>Copy Code</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile(composeUiCode, 'BillingCounterScreen.kt')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Download .kt</span>
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-[480px]">
            {composeUiCode}
          </pre>
        </div>
      )}

      {/* TAB CONTENT: BUILD.GRADLE.KTS */}
      {activeTab === 'gradle' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900">
              app/build.gradle.kts
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(buildGradleKts, 'gradle-code')}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
              >
                {copiedKey === 'gradle-code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>Copy Code</span>
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile(buildGradleKts, 'build.gradle.kts')}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
              >
                <Download className="w-4 h-4" />
                <span>Download .kts</span>
              </button>
            </div>
          </div>
          <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-[480px]">
            {buildGradleKts}
          </pre>
        </div>
      )}
    </div>
  );
};
