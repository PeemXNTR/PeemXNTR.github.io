#include <SPI.h>
#include <LoRa.h>
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// กำหนดขาที่ใช้สำหรับ LoRa สำหรับ NodeMCU V3 (ESP8266)
#define SCK 14    // D5 - GPIO14
#define MISO 12   // D6 - GPIO12
#define MOSI 13   // D7 - GPIO13
#define SS 15     // D8 - GPIO15
#define RST 2     // D4 - GPIO2 (แก้ไขจาก 16 เป็น 2 ให้ตรงกับ Transmitter)
#define DIO0 5    // D1 - GPIO5

// กำหนดขา LED สถานะ (LED บนบอร์ด NodeMCU)
#define LED_POWER 2     // D4 - LED สีฟ้าใกล้ USB (แสดงสถานะ MQTT)
#define LED_WIFI 16     // D0 - LED สีฟ้าบนชิป ESP (แสดงสถานะ WiFi)
#define LED_LORA 4      // D2 - LED แสดงสถานะ LoRa

// กำหนดขา SDA_PIN และ SCL_PIN สำหรับ I2C
#define SDA_PIN 0     // D3 (GPIO0) สำหรับ SDA
#define SCL_PIN 3     // D9 (GPIO3/RX) สำหรับ SCL

// ทดสอบทั้งสอง address ที่เป็นไปได้ของจอ LCD
bool testLCD(uint8_t addr) {
  Wire.beginTransmission(addr);
  byte error = Wire.endTransmission();
  
  if (error == 0) {
    Serial.print("Found I2C device at address 0x");
    if (addr < 16) Serial.print("0");
    Serial.println(addr, HEX);
    
    LiquidCrystal_I2C test_lcd(addr, 16, 2);
    test_lcd.begin();
    test_lcd.backlight();
    test_lcd.clear();
    test_lcd.setCursor(0, 0);
    test_lcd.print("Testing LCD");
    test_lcd.setCursor(0, 1);
    test_lcd.print("Addr: 0x");
    if (addr < 16) test_lcd.print("0");
    test_lcd.print(addr, HEX);
    delay(1000);
    return true;
  }
  
  return false;
}

// สร้าง object สำหรับจอ LCD (จะกำหนดค่าจริงในฟังก์ชัน setup)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// กำหนดค่าความถี่ LoRa (433 MHz)
#define BAND 433E6

// ข้อมูล WiFi
const char* ssid = "Lora";
const char* password = "9234587hh";

// ข้อมูล NETPIE MQTT
const char* mqtt_server = "broker.netpie.io";
const int mqtt_port = 1883;
const char* mqtt_client = "364c92a9-896b-48e8-aa42-f2005ec6f508";
const char* mqtt_username = "tanFBincgm4g9j9CsvkKSddoJ6HfEcqB";
const char* mqtt_password = "R4MGKDCtexkAKdP8CfDiso88vYxPLwyM";
const char* mqtt_topic = "@msg/gps";

// สร้าง object สำหรับ WiFi และ MQTT
WiFiClient espClient;
PubSubClient client(espClient);

// ตัวแปรสำหรับเก็บข้อมูลที่ได้รับ
String receivedData = "";

// ตัวแปรสำหรับตรวจสอบการทำงาน
unsigned long lastWiFiCheck = 0;
unsigned long lastMQTTCheck = 0;
unsigned long lastLoRaCheck = 0;
unsigned long lastDataReceived = 0;
unsigned long lastSystemReset = 0; // เพิ่มตัวแปรสำหรับจับเวลารีเซ็ตระบบ
int failedConnections = 0;
const int MAX_FAILED_CONNECTIONS = 5;
const unsigned long CHECK_INTERVAL = 60000; // ตรวจสอบทุก 1 นาที
const unsigned long DATA_TIMEOUT = 300000;  // timeout 5 นาที ถ้าไม่ได้รับข้อมูล
const unsigned long RESET_INTERVAL = 1200000; // รีเซ็ตทุก 20 นาที (20 * 60 * 1000 ms)

// เพิ่มตัวแปรสำหรับเก็บ messageId ล่าสุด
String lastProcessedMessageId = "";
const int MAX_MESSAGE_HISTORY = 10;
String processedMessageIds[10]; // เก็บประวัติ messageId ที่เคยประมวลผลแล้ว 10 ล่าสุด
int messageIdIndex = 0;

// ฟังก์ชัน callback สำหรับรับข้อมูล MQTT
void callback(char* topic, byte* payload, unsigned int length) {
  // แปลง payload เป็น string
  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.print("Received MQTT data: ");
  Serial.println(message);
  
  // แสดงข้อมูลที่ได้รับบนจอ LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Received MQTT:");
  lcd.setCursor(0, 1);
  if (message.length() > 16) {
    lcd.print(message.substring(0, 16));
  } else {
    lcd.print(message);
  }
  delay(2000);
  
  // พยายามแปลง message เป็น JSON
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  // ถ้าแปลงเป็น JSON ได้สำเร็จ
  if (!error) {
    // ตรวจสอบคำสั่งเปิดไฟแจ้งเตือน
    if (doc.containsKey("X")) {
      String command = doc["X"].as<String>();
      
      if (command == "ON" || command == "เปิด") {
        Serial.println("Received command to turn ON alert light!");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("CMD: Turn ON");
        lcd.setCursor(0, 1);
        lcd.print("Sending to LoRa...");
        
        // สร้าง JSON สำหรับส่งไปยัง LoRa
        StaticJsonDocument<200> loraDoc;
        loraDoc["X"] = "ON";
        if (doc.containsKey("messageId")) {
          loraDoc["messageId"] = doc["messageId"].as<String>();
        }
        loraDoc["timestamp"] = millis();
        
        String loraMessage;
        serializeJson(loraDoc, loraMessage);
        
        // ส่งข้อมูลไปยัง LoRa
        LoRa.beginPacket();
        LoRa.print(loraMessage);
        LoRa.endPacket();
        
        Serial.print("Sending command to LoRa: ");
        Serial.println(loraMessage);
        
        // แสดงสถานะการส่งสำเร็จ
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("LoRa Command");
        lcd.setCursor(0, 1);
        lcd.print("Sent Successfully");
        delay(2000);
      }
      else if (command == "OFF" || command == "ปิด") {
        Serial.println("Received command to turn OFF alert light!");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("CMD: Turn OFF");
        lcd.setCursor(0, 1);
        lcd.print("Sending to LoRa...");
        
        // สร้าง JSON สำหรับส่งไปยัง LoRa
        StaticJsonDocument<200> loraDoc;
        loraDoc["X"] = "OFF";
        if (doc.containsKey("messageId")) {
          loraDoc["messageId"] = doc["messageId"].as<String>();
        }
        loraDoc["timestamp"] = millis();
        
        String loraMessage;
        serializeJson(loraDoc, loraMessage);
        
        // ส่งข้อมูลไปยัง LoRa
        LoRa.beginPacket();
        LoRa.print(loraMessage);
        LoRa.endPacket();
        
        Serial.print("Sending command to LoRa: ");
        Serial.println(loraMessage);
        
        // แสดงสถานะการส่งสำเร็จ
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("LoRa Command");
        lcd.setCursor(0, 1);
        lcd.print("Sent Successfully");
        delay(2000);
      }
    }
  }
}

// ฟังก์ชันสำหรับตรวจสอบสถานะระบบ
void checkSystemStatus() {
  unsigned long currentMillis = millis();
  
  // ตรวจสอบการเชื่อมต่อ WiFi
  if (currentMillis - lastWiFiCheck >= CHECK_INTERVAL) {
    lastWiFiCheck = currentMillis;
    if (WiFi.status() != WL_CONNECTED) {
      digitalWrite(LED_WIFI, LOW); // LED ติดเมื่อไม่มีการเชื่อมต่อ
      failedConnections++;
      setupWiFi();
    } else {
      digitalWrite(LED_WIFI, HIGH); // LED ดับเมื่อเชื่อมต่อ
      failedConnections = 0;
    }
  }
  
  // ตรวจสอบการเชื่อมต่อ MQTT
  if (currentMillis - lastMQTTCheck >= CHECK_INTERVAL) {
    lastMQTTCheck = currentMillis;
    if (!client.connected()) {
      digitalWrite(LED_POWER, LOW); // LED ติดเมื่อไม่มีการเชื่อมต่อ
      failedConnections++;
      reconnectMQTT();
    } else {
      digitalWrite(LED_POWER, HIGH); // LED ดับเมื่อเชื่อมต่อ
    }
  }
  
  // ตรวจสอบการรับข้อมูล LoRa
  if (currentMillis - lastDataReceived >= DATA_TIMEOUT) {
    digitalWrite(LED_LORA, LOW); // LED ติดเมื่อไม่ได้รับข้อมูล
    
    // แสดงสถานะว่ารอรับข้อมูล
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Waiting for data");
    lcd.setCursor(0, 1);
    lcd.print("LoRa active...");
  }
  
  // รีเซ็ตระบบทุก 20 นาที
  if (currentMillis - lastSystemReset >= RESET_INTERVAL) {
    Serial.println("System auto reset (20 minutes)");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Auto Reset");
    lcd.setCursor(0, 1);
    lcd.print("Every 20 Minutes");
    
    delay(2000); // แสดงข้อความ 2 วินาทีก่อนรีเซ็ต
    ESP.restart();
  }
  
  // ตรวจสอบการรีเซ็ตระบบเมื่อเชื่อมต่อไม่ได้หลายครั้ง
  if (failedConnections >= MAX_FAILED_CONNECTIONS) {
    Serial.println("Too many errors, resetting system...");
    ESP.restart();
  }
}

void initSPI() {
  // กำหนดขา SPI แบบชัดเจน
  SPI.begin();
  SPI.setBitOrder(MSBFIRST);
  SPI.setDataMode(SPI_MODE0);
  SPI.setFrequency(8000000);  // 8MHz
  
  // รอให้ SPI พร้อม
  delay(100);
}

bool initLoRa() {
  Serial.println("Initializing LoRa...");
  
  // รีเซ็ต LoRa module
  digitalWrite(RST, LOW);
  delay(100);
  digitalWrite(RST, HIGH);
  delay(100);
  
  // ตั้งค่าขา
  LoRa.setPins(SS, RST, DIO0);
  
  // ลองเริ่มต้น LoRa
  if (!LoRa.begin(BAND)) {
    return false;
  }
  
  // ตั้งค่าพารามิเตอร์ LoRa
  LoRa.setSpreadingFactor(9);  // ปรับให้เป็น 9 ทั้งระบบเพื่อความสมดุล
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);
  LoRa.enableCrc();
  LoRa.setSyncWord(0x34);      // เพิ่ม SyncWord ให้ตรงกับ Transmitter
  LoRa.setTxPower(20); // เพิ่มกำลังส่ง (max 20dBm)
  
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("Starting LoRa Gateway...");
  
  // ตั้งค่าขา RST เป็น OUTPUT
  pinMode(RST, OUTPUT);
  digitalWrite(RST, HIGH);
  
  // ตั้งค่า LED ทั้งหมด
  pinMode(LED_POWER, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  pinMode(LED_LORA, OUTPUT);
  
  // รีเซ็ตสถานะ LED ทั้งหมด
  digitalWrite(LED_POWER, HIGH);
  digitalWrite(LED_WIFI, HIGH);
  digitalWrite(LED_LORA, HIGH);
  
  // เริ่มต้นตัวจับเวลารีเซ็ตระบบ
  lastSystemReset = millis();
  
  // เริ่มต้น I2C สำหรับจอ LCD
  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(30000); // ลดความเร็ว I2C ให้ต่ำลงมากขึ้น

  Serial.println("Scanning I2C bus...");
  // สแกนหาอุปกรณ์ I2C ทั้งหมด
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("Found I2C device at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }

  Serial.println("Testing LCD addresses...");
  
  // ทดสอบ address ที่เป็นไปได้
  bool lcd_found = false;
  
  // ทดสอบ address ทั่วไป (0x27)
  Serial.println("Testing LCD at address 0x27...");
  if (testLCD(0x27)) {
    lcd = LiquidCrystal_I2C(0x27, 16, 2);
    lcd_found = true;
    Serial.println("LCD found at address 0x27");
  } else {
    // ทดสอบ address ทางเลือก (0x3F)
    Serial.println("Testing LCD at address 0x3F...");
    if (testLCD(0x3F)) {
      lcd = LiquidCrystal_I2C(0x3F, 16, 2);
      lcd_found = true;
      Serial.println("LCD found at address 0x3F");
    }
  }
  
  if (!lcd_found) {
    Serial.println("LCD not found! Please check connections.");
  }
  
  // เริ่มต้นจอ LCD
  lcd.begin();
  lcd.backlight();
  lcd.clear();
  delay(500);
  
  // เริ่มต้น WiFi
  setupWiFi();
  
  // ตั้งค่า MQTT
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
  
  Serial.println("Starting LoRa Gateway system");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LoRa Gateway");
  lcd.setCursor(0, 1);
  lcd.print("System Ready...");
  
  // เริ่มต้น SPI
  initSPI();
  
  // พยายามเริ่มต้น LoRa
  int tries = 0;
  bool loraInitialized = false;
  
  while (!loraInitialized && tries < 3) {
    Serial.print("Trying to initialize LoRa: attempt ");
    Serial.println(tries + 1);
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Init LoRa...");
    lcd.setCursor(0, 1);
    lcd.print("Attempt: ");
    lcd.print(tries + 1);
    
    loraInitialized = initLoRa();
    
    if (!loraInitialized) {
      Serial.println("LoRa initialization failed!");
      
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("LoRa Failed!");
      lcd.setCursor(0, 1);
      lcd.print("Retrying...");
      
      delay(1000);
      tries++;
    }
  }
  
  if (loraInitialized) {
    // แสดงการตั้งค่า LoRa สำหรับการดีบัก
    Serial.println("LoRa Default Settings:");
    Serial.print("Frequency: "); Serial.println(BAND);
    Serial.print("Spreading Factor: "); Serial.println(9);
    Serial.print("Signal Bandwidth: "); Serial.println(125E3);
    Serial.print("Coding Rate: "); Serial.println(5);
    Serial.print("Sync Word: 0x"); Serial.println(0x34, HEX);
    Serial.print("TX Power: "); Serial.println(20);
    LoRa.dumpRegisters(Serial);
  }
  
  if (!loraInitialized) {
    Serial.println("Unable to initialize LoRa after multiple attempts");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("LoRa Failed");
    lcd.setCursor(0, 1);
    lcd.print("Check Wiring");
    
    Serial.println("Please check connections:");
    Serial.println("- SCK (GPIO14/D5)");
    Serial.println("- MISO (GPIO12/D6)");
    Serial.println("- MOSI (GPIO13/D7)");
    Serial.println("- SS/NSS (GPIO15/D8)");
    Serial.println("- RST (GPIO2/D4)");
    Serial.println("- DIO0 (GPIO5/D1)");
    Serial.println("System will reset in 5 seconds...");
    delay(5000);
    ESP.restart();
  }
  
  Serial.println("LoRa Gateway started successfully!");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("LoRa Gateway");
  lcd.setCursor(0, 1);
  lcd.print("Ready!");
  delay(2000);
}

void loop() {
  static unsigned long lastYield = 0;
  
  // ให้ CPU ได้ทำงานอื่นเพื่อป้องกัน Watchdog Timer Reset
  if (millis() - lastYield >= 100) {
    yield();
    lastYield = millis();
  }
  
  // ตรวจสอบสถานะระบบ
  checkSystemStatus();
  
  // ตรวจสอบการเชื่อมต่อ MQTT
  if (!client.connected()) {
    reconnectMQTT();
  }
  client.loop();
  
  // แสดงสถานะบนจอ LCD
  static unsigned long lastLCDUpdate = 0;
  if (millis() - lastLCDUpdate >= 5000) { // อัปเดตจอ LCD ทุก 5 วินาที
    lastLCDUpdate = millis();
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi:");
    lcd.print(WiFi.status() == WL_CONNECTED ? "OK" : "X");
    lcd.print(" MQTT:");
    lcd.print(client.connected() ? "OK" : "X");
    
    lcd.setCursor(0, 1);
    lcd.print("Waiting for data...");
  }
  
  // รับข้อมูลจาก LoRa
  checkIncomingMessages();
  
  // ลดการหน่วงเวลาเพื่อให้ตรวจสอบข้อมูลเข้าบ่อยขึ้น
  delay(100); // เปลี่ยนจาก 10000 เป็น 100 มิลลิวินาที
}

void setupWiFi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  
  // แสดงข้อมูลการเชื่อมต่อ WiFi บนจอ LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print(ssid);
  
  WiFi.begin(ssid, password);
  
  int dotCount = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    
    // แสดงจุดบนจอ LCD เพื่อแสดงว่ากำลังรอ
    dotCount++;
    if (dotCount > 16) {
      dotCount = 0;
      lcd.setCursor(0, 1);
      lcd.print("                "); // ลบข้อความเดิม
      lcd.setCursor(0, 1);
      lcd.print(ssid);
    }
    lcd.setCursor(dotCount, 1);
    lcd.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected successfully");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // แสดงสถานะการเชื่อมต่อสำเร็จบนจอ LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi Connected");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP());
  delay(2000);
}

void reconnectMQTT() {
  // แสดงข้อมูลการเชื่อมต่อ MQTT บนจอ LCD
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting MQTT...");
  
  int attempts = 0;
  while (!client.connected()) {
    Serial.print("Connecting to MQTT...");
    
    // แสดงครั้งที่พยายามเชื่อมต่อบนจอ LCD
    lcd.setCursor(0, 1);
    lcd.print("Attempt: ");
    lcd.print(++attempts);
    
    if (client.connect(mqtt_client, mqtt_username, mqtt_password)) {
      Serial.println("connected");
      
      // แสดงสถานะการเชื่อมต่อสำเร็จบนจอ LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MQTT Connected");
      lcd.setCursor(0, 1);
      lcd.print("Waiting for data");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      
      // แสดงสถานะการเชื่อมต่อล้มเหลวบนจอ LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("MQTT Connect");
      lcd.setCursor(0, 1);
      lcd.print("Failed rc=");
      lcd.print(client.state());
      
      delay(5000);
    }
  }
}

void checkIncomingMessages() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    lastDataReceived = millis();
    lastSystemReset = millis(); // รีเซ็ตเวลานับถอยหลังเมื่อได้รับข้อมูล
    digitalWrite(LED_LORA, LOW); // LED ติดเมื่อได้รับข้อมูล
    
    // แสดงข้อมูลเบื้องต้นของแพ็กเก็ต
    Serial.print("Received LoRa packet size: ");
    Serial.print(packetSize);
    Serial.print(" bytes, RSSI: ");
    Serial.print(LoRa.packetRssi());
    Serial.print(" dBm, SNR: ");
    Serial.print(LoRa.packetSnr());
    Serial.println(" dB");
    
    // อ่านข้อมูลที่ได้รับ
    receivedData = "";
    while (LoRa.available()) {
      receivedData += (char)LoRa.read();
    }
    
    Serial.print("Data received from LoRa: ");
    Serial.println(receivedData);
    
    // แสดงข้อมูลที่ได้รับบนจอ LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Received data:");
    
    // แสดงข้อมูลสั้นๆ บนบรรทัดที่ 2
    lcd.setCursor(0, 1);
    if (receivedData.length() > 16) {
      lcd.print(receivedData.substring(0, 16));
    } else {
      lcd.print(receivedData);
    }
    
    // พยายามแปลงข้อมูลเป็น JSON
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, receivedData);
    
    if (!error) {
      // แสดงข้อมูล JSON ที่ได้รับ
      Serial.println("แปลงข้อมูล JSON สำเร็จ:");
      serializeJsonPretty(doc, Serial);
      Serial.println();
      
      // ตรวจสอบ messageId เพื่อป้องกันข้อความซ้ำ
      String messageId = "";
      if (doc.containsKey("messageId")) {
        messageId = doc["messageId"].as<String>();
        
        // ตรวจสอบว่าเป็นข้อความที่เคยประมวลผลแล้วหรือไม่
        bool isDuplicate = false;
        for (int i = 0; i < MAX_MESSAGE_HISTORY; i++) {
          if (processedMessageIds[i] == messageId) {
            isDuplicate = true;
            break;
          }
        }
        
        if (isDuplicate) {
          Serial.print("Duplicate message with ID: ");
          Serial.println(messageId);
          return; // ข้ามข้อความซ้ำ
        }
        
        // บันทึก messageId ลงในประวัติ
        processedMessageIds[messageIdIndex] = messageId;
        messageIdIndex = (messageIdIndex + 1) % MAX_MESSAGE_HISTORY;
      }
      
      // ถ้าเป็นข้อมูล GPS
      if (doc.containsKey("latitude") && doc.containsKey("longitude")) {
        // ส่งข้อมูล GPS ไปยัง MQTT
        client.publish(mqtt_topic, receivedData.c_str());
        Serial.println("ส่งข้อมูล GPS ไปยัง MQTT สำเร็จ");
        
        // แสดงข้อมูล GPS บนจอ LCD
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Sending GPS data");
        lcd.setCursor(0, 1);
        lcd.print("Lat:");
        lcd.print(doc["latitude"].as<float>(), 2);
        delay(3000);  // แสดง 3 วินาที
        
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Sending GPS data");
        lcd.setCursor(0, 1);
        lcd.print("Lon:");
        lcd.print(doc["longitude"].as<float>(), 2);
      }
      // ถ้าเป็นการตอบรับคำสั่งเปิด/ปิดไฟ
      else if (doc.containsKey("alertResponse") || doc.containsKey("alertStatus")) {
        // ส่งการตอบรับไปยัง MQTT
        client.publish(mqtt_topic, receivedData.c_str());
        Serial.println("Sending response to MQTT: " + receivedData);
        
        // แสดงข้อมูลตอบรับบนจอ LCD
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Got Response");
        lcd.setCursor(0, 1);
        lcd.print("Action: ");
        // ตรวจสอบทั้งสองเวอร์ชันของฟิลด์
        if (doc.containsKey("alertResponse")) {
          lcd.print(doc["alertResponse"].as<String>());
        } else if (doc.containsKey("alertStatus")) {
          lcd.print(doc["alertStatus"].as<String>());
        }
      }
    } else {
      // แสดงข้อผิดพลาดในการแปลง JSON
      Serial.print("ไม่สามารถแปลงข้อมูลเป็น JSON ได้: ");
      Serial.println(error.c_str());
      
      // ถ้าไม่ใช่ JSON ให้แยกข้อมูล GPS ตามรูปแบบเดิม
      float lat, lon, speed, alt;
      int sat;
      parseGPSData(receivedData, &lat, &lon, &speed, &alt, &sat);
      
      // สร้าง JSON สำหรับส่งไปยัง MQTT
      String jsonData = createJSON(lat, lon, speed, alt, sat);
      
      // ส่งข้อมูลไปยัง MQTT
      client.publish(mqtt_topic, jsonData.c_str());
      Serial.println("Sending GPS data to MQTT: " + jsonData);
      
      // แสดงข้อมูลบนจอ LCD
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Sending GPS data");
      lcd.setCursor(0, 1);
      lcd.print("Sat:");
      lcd.print(sat);
      lcd.print(" Spd:");
      lcd.print(speed);
    }
  }
}

void parseGPSData(String data, float *lat, float *lon, float *speed, float *alt, int *sat) {
  int index1 = data.indexOf(',');
  int index2 = data.indexOf(',', index1 + 1);
  int index3 = data.indexOf(',', index2 + 1);
  int index4 = data.indexOf(',', index3 + 1);
  
  *lat = data.substring(0, index1).toFloat();
  *lon = data.substring(index1 + 1, index2).toFloat();
  *speed = data.substring(index2 + 1, index3).toFloat();
  *alt = data.substring(index3 + 1, index4).toFloat();
  *sat = data.substring(index4 + 1).toInt();
}

String createJSON(float lat, float lon, float speed, float alt, int sat) {
  String json = "{";
  json += "\"latitude\":" + String(lat, 6) + ",";
  json += "\"longitude\":" + String(lon, 6) + ",";
  json += "\"speed\":" + String(speed, 2) + ",";
  json += "\"altitude\":" + String(alt, 2) + ",";
  json += "\"satellites\":" + String(sat) + ",";
  json += "\"timestamp\":\"" + String(millis()) + "\"";
  json += "}";
  return json;
} 