#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <sys/time.h>

#if __has_include("secrets.h")
  #include "secrets.h"
#else
  #include "secrets_example.h"
#endif

// ===================== CONFIGURACIÓN =====================

// >>> Deep Sleep: intervalo entre ciclos (segundos)
//Convertir en global
const uint32_t SLEEP_INTERVAL_SEC = 60;   // 1 minuto

// Publish interval (ya no se usa en loop; se deja por referencia)
// const unsigned long PUBLISH_INTERVAL_MS = 30000UL;

// ADC config
const int   ADC_WIDTH_BITS   = 12;       // 0..4095
const auto  ADC_ATTEN        = ADC_11db; // ~ hasta 3.3V
const int   ADC_SAMPLES      = 10;       // promedio simple
const int   ADC_SAMPLE_DELAY = 2;        // ms entre muestras

// Temperature sensors (LM35 => 10 mV/°C) en ADC1
const int PIN_TEMP_LEFT   = 32; // ADC1_CH4
const int PIN_TEMP_CENTER = 33; // ADC1_CH5
const int PIN_TEMP_RIGHT  = 34; // ADC1_CH6 (input-only)
const float LM35_MV_PER_C = 10.0f;

// Battery sense (TTGO T-Display típico: VBAT -> GPIO35 via ~2:1)
const int   PIN_BATT        = 35;     // ADC1_CH7
const float BATT_DIVIDER    = 2.0f;   // factor del divisor (ajusta si tu placa difiere)
const float BATT_CAL        = 1.00f;  // trim de calibración (e.g. 0.97..1.03)
const float BATT_V_MIN      = 3.30f;  // 0% (ajusta según tu perfil)
const float BATT_V_MAX      = 4.20f;  // 100%
const int   BATT_LOW_PCT    = 20;     // umbral de alarma (%)

// TLS: para pruebas; en producción, cargar CA y quitar setInsecure()
const bool  TLS_INSECURE    = true;

// ===== Tiempo por NTP =====
const char* NTP1 = "time.google.com";
const char* NTP2 = "pool.ntp.org";
const char* NTP3 = "time.cloudflare.com";

// Zona horaria (ej. Monterrey fija sin DST):
const char* TZ_STRING = "CST6";

WiFiClientSecure secureClient;
PubSubClient     mqtt(secureClient);
unsigned long    lastPublishMs = 0;

String g_chip_uid;        // eFuse MAC como hex continuo (12 chars)
String g_mqtt_client_id;  // MQTT_CLIENT_ID_PREFIX + chip_uid
String g_mqtt_topic;

// >>> Contador de arranques en Deep Sleep (útil para diagnóstico)
RTC_DATA_ATTR uint32_t g_bootCount = 0;

/* ===================== HELPERS: ADC / BATERÍA ===================== */
uint16_t readMilliVoltsAvg(int pin, int samples = ADC_SAMPLES) {
  uint32_t acc = 0;
  for (int i = 0; i < samples; i++) {
    acc += analogReadMilliVolts(pin);
    delay(ADC_SAMPLE_DELAY);
  }
  return (uint16_t)(acc / samples);
}

float mvToCelsius(float mv) { return mv / LM35_MV_PER_C; }

float readBatteryVoltage() {
  const uint16_t mv_adc = readMilliVoltsAvg(PIN_BATT);
  return (mv_adc / 1000.0f) * BATT_DIVIDER * BATT_CAL;
}

template<typename T>
T clampVal(T x, T lo, T hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}

int voltageToPercent(float v) {
  float pct = (v - BATT_V_MIN) / (BATT_V_MAX - BATT_V_MIN) * 100.0f;
  return (int)roundf(clampVal(pct, 0.0f, 100.0f));
}

// eFuse MAC -> hex continuo (12 chars) como chip_uid (número de serie)
String getChipUidHex() {
  uint64_t mac = ESP.getEfuseMac(); // 48-bit en bits bajos
  char buf[13];
  snprintf(buf, sizeof(buf),
           "%02X%02X%02X%02X%02X%02X",
           (uint8_t)(mac >> 40), (uint8_t)(mac >> 32),
           (uint8_t)(mac >> 24), (uint8_t)(mac >> 16),
           (uint8_t)(mac >> 8),  (uint8_t)(mac >> 0));
  return String(buf);
}

String shortIdFromUid(const String& uid12) {
  if (uid12.length() >= 6) return uid12.substring(uid12.length() - 6);
  return uid12;
}

/* ===================== TIEMPO (NTP + ISO 8601) ===================== */
void setupTime() {
  configTzTime(TZ_STRING, NTP1, NTP2, NTP3);

  const time_t MIN_VALID = 1609459200; // 2021-01-01 UTC
  Serial.print("Syncing time via SNTP");
  for (int i = 0; i < 40; ++i) { // ~20 s
    time_t now = time(nullptr);
    if (now > MIN_VALID) {
      Serial.println("\nSNTP time synced.");
      return;
    }
    Serial.print(".");
    delay(500);
  }
  Serial.println("\nSNTP sync timeout (continuing anyway).");
}

String iso8601Now(bool useUtc = true) {
  struct timeval tv;
  gettimeofday(&tv, nullptr);

  time_t secs = tv.tv_sec;
  struct tm tmres;
  if (useUtc) {
    gmtime_r(&secs, &tmres);
  } else {
    localtime_r(&secs, &tmres);
  }

  char base[32];
  strftime(base, sizeof(base), "%Y-%m-%dT%H:%M:%S", &tmres);
  int ms = (int)(tv.tv_usec / 1000);

  if (useUtc) {
    char out[40];
    snprintf(out, sizeof(out), "%s.%03dZ", base, ms);
    return String(out);
  } else {
    char zbuf[6]; // ej: -0600
    strftime(zbuf, sizeof(zbuf), "%z", &tmres);
    char ziso[7]; // ±HH:MM
    snprintf(ziso, sizeof(ziso), "%c%c%c:%c%c", zbuf[0], zbuf[1], zbuf[2], zbuf[3], zbuf[4]);

    char out[48];
    snprintf(out, sizeof(out), "%s.%03d%s", base, ms, ziso);
    return String(out);
  }
}

/* ===================== WIFI / MQTT ===================== */
void setupWifi() {
  Serial.printf("Connecting to %s ...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void ensureMqtt() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT over TLS ... ");
    if (mqtt.connect(g_mqtt_client_id.c_str(), MQTT_USER, MQTT_PASS)) {
      Serial.println("connected.");
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" retrying in 5s");
      delay(5000);
    }
  }
}

/* ===================== PUBLISH ===================== */
bool publishSensors() {
  // Lecturas
  const float t_left   = mvToCelsius((float)readMilliVoltsAvg(PIN_TEMP_LEFT));
  const float t_center = mvToCelsius((float)readMilliVoltsAvg(PIN_TEMP_CENTER));
  const float t_right  = mvToCelsius((float)readMilliVoltsAvg(PIN_TEMP_RIGHT));

  const float vbatt    = readBatteryVoltage();
  const int   batt_pct = voltageToPercent(vbatt);

  const bool alarm = (batt_pct <= BATT_LOW_PCT);
  const char* device_status = alarm ? "LOW_BATTERY" : "OK";

  // JSON
  StaticJsonDocument<1280> doc;
  doc["version"]= FW_VERSION;

  // Timestamp (usa hora local con offset, como ya tenías)
  doc["timestamp"] = iso8601Now(/*useUtc=*/ false);

  JsonObject device = doc.createNestedObject("device");
  device["type"]  = DEVICE_TYPE;
  device["id"]    = g_chip_uid;
  device["name"]  = DEVICE_NAME;
  device["uptime"] = (uint32_t)(millis() / 1000);

  JsonObject status = doc.createNestedObject("status");
  status["battery"]         = batt_pct;     // %
  status["battery_voltage"] = vbatt;        // V
  status["device_status"]   = device_status;
  status["alarm"]           = alarm;

  JsonArray sensors = doc.createNestedArray("sensors");

  JsonObject s1 = sensors.createNestedObject();
  s1["type"]  = "temperature";
  s1["name"]  = "left";
  s1["value"] = t_left;
  s1["unit"]  = "°C";
  s1["port"]  = 1;

  JsonObject s2 = sensors.createNestedObject();
  s2["type"]  = "temperature";
  s2["name"]  = "center";
  s2["value"] = t_center;
  s2["unit"]  = "°C";
  s2["port"]  = 2;

  JsonObject s3 = sensors.createNestedObject();
  s3["type"]  = "temperature";
  s3["name"]  = "right";
  s3["value"] = t_right;
  s3["unit"]  = "°C";
  s3["port"]  = 3;

  char jsonBuffer[1280];
  size_t n = serializeJson(doc, jsonBuffer, sizeof(jsonBuffer));

  bool ok = mqtt.publish(g_mqtt_topic.c_str(), (const uint8_t*)jsonBuffer, (unsigned int)n, true);

  Serial.println("JSON published:");
  Serial.println(jsonBuffer);
  if (!ok) {
    Serial.println("Publish failed (buffer too small or connection issue).");
  }
  return ok;
}

/* ===================== DEEP SLEEP HELPERS ===================== */
void goToDeepSleep(uint32_t sleep_sec) {
  // Cierra conexiones y radios para consumir menos antes de dormir
  if (mqtt.connected()) {
    mqtt.disconnect();            // permitirá que se envíe LWT=offline si aplica
    delay(50);
  }
  WiFi.disconnect(true, true);    // borra credenciales y desconecta
  WiFi.mode(WIFI_OFF);
  btStop();                       
  delay(50);
  Serial.flush();

  esp_sleep_enable_timer_wakeup((uint64_t)sleep_sec * 1000000ULL);
  Serial.printf("Entering deep sleep for %u s...\n", sleep_sec);
  delay(10);
  esp_deep_sleep_start();
}

/* ===================== SETUP / LOOP ===================== */
void setup() {
  const unsigned long t_start = millis();

  g_bootCount++;
  Serial.begin(115200);
  delay(50);
  Serial.printf("\n=== Boot #%lu (wakeup reason: %d) ===\n", (unsigned long)g_bootCount, esp_sleep_get_wakeup_cause());

  // ADC
  analogSetWidth(ADC_WIDTH_BITS);
  analogSetPinAttenuation(PIN_TEMP_LEFT,   ADC_ATTEN);
  analogSetPinAttenuation(PIN_TEMP_CENTER, ADC_ATTEN);
  analogSetPinAttenuation(PIN_TEMP_RIGHT,  ADC_ATTEN);
  analogSetPinAttenuation(PIN_BATT,        ADC_ATTEN);

  // Identificadores / tópicos
  g_chip_uid   = getChipUidHex();
  g_mqtt_topic = String("LinkForgeCloud/") + CID + "/" + LOCATION + "/" + AREA + "/" + SUBAREA + "/dev/" + DEVICE_NAME + "/SmartSensorEvent";
  Serial.println(g_mqtt_topic);

  // WiFi + Tiempo
  setupWifi();
  setupTime();

  // MQTT TLS
  g_mqtt_client_id  = String(MQTT_CLIENT_ID_PREFIX) + g_chip_uid;
  if (TLS_INSECURE) {
    secureClient.setInsecure(); // ⚠️ Solo pruebas; en prod carga CA
  }
  mqtt.setBufferSize(1280);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);

  ensureMqtt();
  bool ok = publishSensors();

  // Simple: duerme exactamente SLEEP_INTERVAL_SEC cada ciclo
  (void)ok; // evita warning si no lo usas
  delay(50);
  goToDeepSleep(SLEEP_INTERVAL_SEC);
}

void loop() {
  // No se usa: el equipo entra a deep sleep desde setup()
}
