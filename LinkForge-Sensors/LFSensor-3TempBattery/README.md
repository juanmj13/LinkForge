# LinkForge SmartSensor (ESP32) — Temperatura 3 puntos + Battery & MQTT (TLS)

Este repositorio contiene el firmware para el **SmartSensor de LinkForge**, un dispositivo basado en **ESP32** que mide **temperatura** en **tres puntos** mediante sensores **LM35** conectados al ADC1, monitorea el **voltaje de batería**, sincroniza **hora por NTP** y **publica** periódicamente un **evento JSON** vía **MQTT sobre TLS**.

---

## ✨ Características

- **3 canales de temperatura** (LM35 – 10 mV/°C) en ADC1: `left`, `center`, `right` (GPIO 32, 33 y 34).
- **Monitoreo de batería** en `GPIO35` con **divisor resistivo 2:1** (ajustable) y **calibración** por software.
- **Publicación MQTT** cada *30 s* (configurable) con **retención** (`retain = true`), usando **TLS**.
- **Sincronización NTP** (servidores Google/Pool/Cloudflare) y timestamp en **ISO 8601** con milisegundos.
- **Identidad de dispositivo** a partir del **eFuse MAC** (UID hex de 12 caracteres).
- **Topic MQTT estructurado** por compañía/sitio/área/subárea/dispositivo.
- **Códigos de estado**: `OK` / `LOW_BATTERY` con umbral ajustable.
- **Configuración por `secrets.h`** (o `secrets_example.h`).

---

## 🧰 Hardware soportado

- **ESP32** (familia ESP32-WROOM / TTGO T-Display u otro equivalente con ADC1 disponible).
- **Sensores**: 3× **LM35** (salida analógica, 10 mV/°C).
- **Entrada de batería** (opcional): VBAT → **GPIO35** a través de **divisor resistivo** ~**2:1** (p. ej. 200k/100k o 100k/47k).

> ⚠️ **Nota sobre ADC**: Los pines del **ADC1** (`32..39`) son válidos para lecturas de `analogReadMilliVolts`. `GPIO34` y `GPIO35` son **solo entrada** (ok para sensores).

---

## 🔌 Conexiones (LM35 + Batería)

- **LM35 Left** → `GPIO32` (ADC1_CH4)  
- **LM35 Center** → `GPIO33` (ADC1_CH5)  
- **LM35 Right** → `GPIO34` (ADC1_CH6, input-only)

Para cada LM35:
- **Vs** → 5V o 3.3V *(recomendado 5V si tu placa lo permite y respetas el rango de ADC con atenuación)*  
- **Vout** → pin ADC indicado (32/33/34)  
- **GND** → GND

**Batería (VBAT)** → **GPIO35** (ADC1_CH7) mediante **divisor 2:1**. Ajusta `BATT_DIVIDER` si tu divisor difiere.

---

## 🛠️ Dependencias (Arduino IDE / PlatformIO)

Incluye en tu sketch/entorno las siguientes librerías:
- **WiFi** (ESP32)
- **WiFiClientSecure** (ESP32)
- **PubSubClient** (MQTT) — *Nick O’Leary*
- **ArduinoJson** (≥ 6.x)
- **time.h** / **sys/time.h** (incluidas en core ESP32)

> En **Arduino IDE**, instala la **ESP32 core** desde Boards Manager (Espressif Systems) y las librerías anteriores desde Library Manager.

---

## ⚙️ Configuración principal (constantes)

En el código encontrarás constantes clave que puedes ajustar:

```cpp
// Intervalo de publicación
const unsigned long PUBLISH_INTERVAL_MS = 30000UL; // 30 s

// ADC
const int   ADC_WIDTH_BITS   = 12;       // 0..4095
const auto  ADC_ATTEN        = ADC_11db; // ~hasta 3.3V
const int   ADC_SAMPLES      = 10;       // promedio simple
const int   ADC_SAMPLE_DELAY = 2;        // ms entre muestras

// Sensores LM35
const int PIN_TEMP_LEFT   = 32;
const int PIN_TEMP_CENTER = 33;
const int PIN_TEMP_RIGHT  = 34;
const float LM35_MV_PER_C = 10.0f;

// Batería
const int   PIN_BATT     = 35;
const float BATT_DIVIDER = 2.0f;   // ajusta según tu divisor real
const float BATT_CAL     = 1.00f;  // trim fino (0.97..1.03 típico)
const float BATT_V_MIN   = 3.30f;  // = 0%
const float BATT_V_MAX   = 4.20f;  // = 100%
const int   BATT_LOW_PCT = 20;     // alarma
```

---

## 🌐 Red, Hora y Zona Horaria

- **WiFi STA** con `WIFI_SSID` / `WIFI_PASS` desde `secrets.h`.
- **NTP** con `time.google.com`, `pool.ntp.org`, `time.cloudflare.com`.
- `TZ_STRING` por defecto: `"CST6"` (**UTC-6 fija**, sin DST).  
  Si quieres UTC puro en la marca de tiempo, usa `iso8601Now(true)` (ya soportado en el código).

---

## 🔒 TLS / Seguridad

Por simplicidad, el firmware permite **modo inseguro** de TLS para pruebas:

```cpp
const bool TLS_INSECURE = true;
...
if (TLS_INSECURE) {
  secureClient.setInsecure(); // SOLO PRUEBAS
}
```

**Producción**: establece `TLS_INSECURE = false` y **carga CA** adecuada con `secureClient.setCACert(...)` o almacén equivalente. Verifica también **hostname** del broker.

---

## ☁️ MQTT

- Cliente: `PubSubClient` sobre `WiFiClientSecure`.
- **ClientID**: `MQTT_CLIENT_ID_PREFIX + <chip_uid_hex>` (único por equipo).
- **Topic** (retained):

```
LinkForgeCloud/<CID>/<LOCATION>/<AREA>/<SUBAREA>/dev/<DEVICE_NAME>/SmartSensorEvent
```

> Todos estos campos provienen de `secrets.h`.

### Ejemplo de `secrets_example.h`

Copia a `secrets.h` y ajusta:

```cpp
#pragma once

// WiFi
#define WIFI_SSID              "TuSSID"
#define WIFI_PASS              "TuPassword"

// Identidad / Inventario
#define CID                    "ACME"          // Company ID
#define LOCATION               "MTY-Plant1"
#define AREA                   "LineA"
#define SUBAREA                "Oven1"
#define DEVICE_NAME            "SmartSensor-01"
#define DEVICE_TYPE            "LinkForge-SmartSensor"
#define FW_VERSION             "1.0.0"

// MQTT
#define MQTT_HOST              "mqtt.tu-dominio.com"
#define MQTT_PORT              8883
#define MQTT_USER              "sensor_user"
#define MQTT_PASS              "sensor_pass"
#define MQTT_CLIENT_ID_PREFIX  "LFSS-"
```

---

## 🧾 Payload JSON publicado

Se publica un JSON **cada 30 s** (por defecto) con `retain=true`. Ejemplo (formato ilustrativo):

```json
{
  "version": "1.0.0",
  "timestamp": "2025-08-31T10:45:12.123-06:00",
  "device": {
    "type": "LinkForge-SmartSensor",
    "id": "A1B2C3D4E5F6",
    "name": "SmartSensor-01",
    "uptime": 12345
  },
  "status": {
    "battery": 82,
    "battery_voltage": 3.94,
    "device_status": "OK",
    "alarm": false
  },
  "sensors": [
    { "type": "temperature", "name": "left",   "value": 31.6, "unit": "°C", "port": 1 },
    { "type": "temperature", "name": "center", "value": 30.8, "unit": "°C", "port": 2 },
    { "type": "temperature", "name": "right",  "value": 32.1, "unit": "°C", "port": 3 }
  ]
}
```

### Cálculos clave
- **LM35**: `°C = mV / 10`  
- **Batería (V)**: `V = (ADC_mV / 1000) * BATT_DIVIDER * BATT_CAL`  
- **% batería**: lineal entre `BATT_V_MIN` (0%) y `BATT_V_MAX` (100%)

> Si necesitas una curva de descarga **no lineal** (Li-Ion), sustituye la función `voltageToPercent()` por una LUT o interpolación polinómica.

---

## ▶️ Flujo de ejecución

1. Configura **ADC** (ancho y atenuaciones).
2. Obtiene **UID** del chip y compone **topic** MQTT.
3. **WiFi** → **NTP** (espera tiempo válido).
4. Prepara **MQTT (TLS)** y conecta (reintenta).
5. Publica **primer evento** y después cada `PUBLISH_INTERVAL_MS`.
6. Mantiene `mqtt.loop()` y reconexión si es necesario.

---

## 🚀 Cómo compilar y cargar

### Arduino IDE
1. Instala **ESP32 by Espressif Systems** (Boards Manager).
2. Selecciona tu placa (p. ej. *ESP32 Dev Module* / *TTGO T-Display*).
3. Copia `secrets_example.h` a `secrets.h` y edita credenciales/identificadores.
4. Verifica que las librerías estén instaladas: PubSubClient, ArduinoJson.
5. Compila y **Sube**.

### PlatformIO (opcional)
- Define el entorno `platform = espressif32`, `framework = arduino` en `platformio.ini` y añade dependencias de librería.

---

## 🔧 Calibración y ajustes

- **`BATT_DIVIDER`**: mide con multímetro la VBAT y el voltaje en el pin; ajusta la relación real (ej. 2.05).  
- **`BATT_CAL`**: corrige error residual del ADC (0.97..1.03 típico).
- **`ADC_ATTEN`**: usa `ADC_11db` si el pin verá hasta ~3.3V (tras divisor).  
- **Offset LM35**: si notas sesgo, puedes añadir un término de corrección previo a `mvToCelsius()`.
- **Zonas horarias**: cambia `TZ_STRING` o usa UTC (`iso8601Now(true)`).

---

## 🧪 Pruebas y diagnóstico

- **Serial @ 115200**: imprime progreso de WiFi, NTP, conexión MQTT y el **JSON publicado**.
- Si falla MQTT:
  - Revisa **certificados** (si `TLS_INSECURE=false`).
  - Verifica **usuario/contraseña**, **host/puerto**.
  - Aumenta `mqtt.setBufferSize(1280)` si amplías el JSON.
- Si lecturas a 0 o ruidosas:
  - Confirma **pinout** y **GND común**.
  - Aumenta `ADC_SAMPLES` o el **delay** entre muestras.
  - Evita **GPIO36/39** (si no están habilitados) y **ADC2** (concurrencia WiFi).

---

¡Listo! Compila, carga y empieza a **monitorear temperatura** con tu SmartSensor 🔧🌡️📡
