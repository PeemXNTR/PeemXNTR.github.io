#include <SPI.h>
#include <LoRa.h>
#include <TinyGPS++.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>
#include <ESP8266WiFi.h>  // Library for NodeMCU ESP8266
#include <Wire.h>
#include <LiquidCrystal_I2C.h> // Library for LCD I2C display

// Add watchdog to prevent hanging
extern "C" {
  #include "user_interface.h"
}

/*
Latest wiring instructions:

1. Connecting GY-GPS6MV2 to NodeMCU V3:
   GY-GPS6MV2  |  NodeMCU V3
   --------------------------------
   VCC         |  3.3V
   GND         |  GND
   TX          |  D2 (GPIO4)
   RX          |  D3 (GPIO0)

2. Connecting SX1278 LoRa to NodeMCU V3:
   SX1278 LoRa |  NodeMCU V3
   --------------------------------
   VCC         |  3.3V
   GND         |  GND
   MISO        |  D6 (GPIO12)
   MOSI        |  D7 (GPIO13)
   SCK         |  D5 (GPIO14)
   NSS         |  D8 (GPIO15)
   RST         |  D4 (GPIO2)
   DIO0        |  D1 (GPIO5)

3. Connecting LCD I2C:
   LCD I2C     |  NodeMCU V3
   --------------------------------
   VCC         |  3.3V
   GND         |  GND
   SDA         |  D10 (GPIO1/TX)
   SCL         |  RX (GPIO3)

Notes: 
- Use only 3.3V power supply, do not use 5V as it will damage the devices
- Connect all GND pins to ensure common ground
- Be careful with the TX/RX connections of GPS
- Remove the SCL (RX) cable when uploading code, then reconnect
- In some cases, you may need 4.7kΩ pull-up resistors for SDA and SCL pins
*/

// กำหนดขาที่ใช้สำหรับ LoRa
#define SCK     14   // D5 (GPIO14)
#define MISO    12   // D6 (GPIO12)
#define MOSI    13   // D7 (GPIO13)
#define SS      15   // D8 (GPIO15)
#define RST     2    // D4 (GPIO2)
#define DIO0    5    // D1 (GPIO5)

// กำหนดขาที่ใช้สำหรับ GPS
#define GPS_RX  4    // D2 (GPIO4)
#define GPS_TX  0    // D3 (GPIO0)

// กำหนดขา SDA_PIN และ SCL_PIN สำหรับ I2C
#define SDA_PIN 1    // D10 (GPIO1/TX) สำหรับ SDA
#define SCL_PIN 3    // RX (GPIO3) สำหรับ SCL

// กำหนดค่าความถี่ LoRa (433 MHz)
#define BAND    433E6

// กำหนดค่าคงที่และพารามิเตอร์
#define GPS_BAUD_RATE 9600      // ความเร็วในการสื่อสารกับ GPS
#define SERIAL_BAUD_RATE 115200 // ความเร็วในการสื่อสารกับ Serial Monitor
#define SEND_INTERVAL 10000     // ส่งข้อมูลทุก 10 วินาที (10,000 ms)
#define FAST_SEND_INTERVAL 1000 // ส่งข้อมูลเร็วขึ้นเมื่อได้รับ GPS แล้ว (1,000 ms)
#define LCD_UPDATE_INTERVAL 10000 // อัปเดตจอ LCD ทุก 10 วินาที (10,000 ms)
#define GPS_TIMEOUT 60000       // timeout 1 นาที (60,000 ms)
#define WATCHDOG_TIMEOUT 15000  // ค่า timeout ของ watchdog (15,000 ms)
#define SYSTEM_RESET_INTERVAL 1200000 // รีเซ็ตระบบทุก 20 นาที (1,200,000 ms)
#define MAX_ERROR_COUNT 10       // จำนวนข้อผิดพลาดสูงสุดก่อนรีเซ็ต

// สร้าง pointer ของ object สำหรับจอ LCD
LiquidCrystal_I2C *lcd_ptr = NULL;
// ประกาศตัวแปรเก็บแอดเดรสที่ถูกต้อง
byte lcd_address = 0x27;

// ตัวแปรสำหรับการรีเซ็ตระบบอัตโนมัติ
unsigned long systemStartTime = 0;
int errorCount = 0;

// Test LCD address
bool testLCD(uint8_t addr) {
  Wire.beginTransmission(addr);
  byte error = Wire.endTransmission();
  
  if (error == 0) {
    Serial.print("Found LCD at address 0x");
    if (addr < 16) Serial.print("0");
    Serial.println(addr, HEX);
    
    // เพิ่มการหน่วงเวลาก่อนเริ่มต้น LCD
    delay(100);
    
    LiquidCrystal_I2C test_lcd(addr, 16, 2);
    test_lcd.begin(); // เปลี่ยนกลับเป็น begin() เพราะไลบรารีที่ใช้ไม่มี init()
    delay(50);
    test_lcd.backlight();
    delay(50);
    test_lcd.clear();
    delay(50);
    test_lcd.setCursor(0, 0);
    test_lcd.print("ทดสอบจอ LCD");
    test_lcd.setCursor(0, 1);
    test_lcd.print("Addr: 0x");
    if (addr < 16) test_lcd.print("0");
    test_lcd.print(addr, HEX);
    delay(1000);
    return true;
  }
  
  return false;
}

// สแกนหาอุปกรณ์ I2C ทั้งหมดในบัส
void scanI2CBus() {
  Serial.println("Scanning I2C bus...");
  bool found_any_device = false;
  
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    
    if (error == 0) {
      found_any_device = true;
      Serial.print("Found I2C device at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }
  
  if (!found_any_device) {
    Serial.println("No I2C devices found. Please check connections");
    errorCount++; // เพิ่มจำนวนข้อผิดพลาด
  }
}

// ตรวจสอบและเริ่มต้นจอ LCD
bool initializeLCD() {
  Serial.println("Testing LCD address...");
  
  // ทดสอบ address ที่เป็นไปได้
  bool lcd_found = false;
  
  // Try all common I2C LCD addresses
  byte possible_addresses[] = {0x27, 0x3F, 0x26, 0x20, 0x23};
  
  for (byte i = 0; i < sizeof(possible_addresses); i++) {
    Serial.println("Testing LCD at address 0x");
    if (possible_addresses[i] < 16) Serial.print("0");
    Serial.print(possible_addresses[i], HEX);
    Serial.println("...");
    
    if (testLCD(possible_addresses[i])) {
      lcd_address = possible_addresses[i];
      lcd_found = true;
      Serial.print("Found LCD at address 0x");
      if (lcd_address < 16) Serial.print("0");
      Serial.println(lcd_address, HEX);
      break;
    }
  }
  
  if (!lcd_found) {
    Serial.println("No LCD found! Please check connection");
    return false;
  }
  
  // สร้าง object LCD ด้วย address ที่ตรวจพบ
  if (lcd_ptr != NULL) {
    delete lcd_ptr; // ลบ pointer เดิมถ้ามี
  }
  lcd_ptr = new LiquidCrystal_I2C(lcd_address, 16, 2);
  
  // เริ่มต้น LCD อย่างระมัดระวัง
  delay(200);
  lcd_ptr->begin();
  delay(100);
  lcd_ptr->backlight();
  delay(100);
  lcd_ptr->clear();
  delay(100);
  
  // ทดสอบการทำงานของจอ LCD
  lcd_ptr->setCursor(0, 0);
  lcd_ptr->print("GPS Tracker");
  lcd_ptr->setCursor(0, 1);
  lcd_ptr->print("Initializing GPS Tracker System...");
  
  return true;
}

// สร้าง object สำหรับ GPS
TinyGPSPlus gps;
SoftwareSerial GPSSerial(GPS_RX, GPS_TX); // ใช้ SoftwareSerial แทน HardwareSerial

// ตัวแปรเก็บข้อมูล GPS
float latitude = 0.0;
float longitude = 0.0;
float speed_kmph = 0.0;
float altitude = 0.0;
int satellites = 0;
bool gpsFixed = false;

// ตัวแปรสำหรับการส่งข้อมูล
unsigned long lastSendTime = 0;
unsigned long currentSendInterval = SEND_INTERVAL;

// ตัวแปรสำหรับตรวจสอบการทำงานของ GPS
unsigned long startTime;

// ตัวแปรสำหรับอัปเดตหน้าจอ LCD
unsigned long lastLCDUpdateTime = 0;

// ฟังก์ชันสำหรับรีเซ็ตระบบ
void resetSystem(String reason) {
  lcd_ptr->clear();
  lcd_ptr->setCursor(0, 0);
  lcd_ptr->print(reason);
  lcd_ptr->setCursor(0, 1);
  lcd_ptr->print("Resetting in 3s...");
  
  Serial.println("------------------------------");
  Serial.println(reason);
  Serial.println("System will reset in 3 seconds");
  Serial.println("------------------------------");
  
  delay(3000);
  ESP.restart();
}

void setup() {
  // Setup watchdog timer to reset if hanging
  ESP.wdtDisable();
  ESP.wdtEnable(WATCHDOG_TIMEOUT);
  
  // เก็บเวลาเริ่มต้นระบบ
  systemStartTime = millis();
  
  // Wait a moment before starting to ensure NodeMCU is ready
  delay(3000);
  
  // Turn off WiFi to save power and improve stability
  WiFi.mode(WIFI_OFF);
  WiFi.forceSleepBegin();
  delay(100);
  
  // Initialize GPS Serial
  GPSSerial.begin(GPS_BAUD_RATE);
  
  // Initialize Serial Monitor
  Serial.begin(SERIAL_BAUD_RATE);
  Serial.println("Initializing GPS Tracker System");
  
  // Initialize I2C for LCD with longer delay
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(500); // เพิ่มการหน่วงเวลาหลังเริ่ม I2C
  Wire.setClock(10000); // ลดความเร็ว I2C เพื่อความเสถียรยิ่งขึ้น (10kHz)

  // สแกนและเริ่มต้นจอ LCD
  scanI2CBus();
  if (!initializeLCD()) {
    errorCount += 2; // เพิ่มจำนวนข้อผิดพลาด
  }
  
  // Setup LoRa pins
  SPI.begin();  // ESP8266 doesn't need to specify SPI pins
  LoRa.setPins(SS, RST, DIO0);
  
  // Initialize LoRa
  int counter = 0;
  while (!LoRa.begin(BAND) && counter < 10) {
    // Display on LCD
    lcd_ptr->clear();
    lcd_ptr->setCursor(0, 0);
    lcd_ptr->print("LoRa Failed");
    lcd_ptr->setCursor(0, 1);
    lcd_ptr->print("Retrying: ");
    lcd_ptr->print(counter + 1);
    
    Serial.println("LoRa initialization failed, retrying...");
    counter++;
    errorCount++; // เพิ่มจำนวนข้อผิดพลาด
    delay(500);
    ESP.wdtFeed(); // Reset watchdog timer during connection attempts
    
    // ตรวจสอบจำนวนข้อผิดพลาด
    if (errorCount >= MAX_ERROR_COUNT) {
      resetSystem("Too many errors, resetting system...");
    }
  }

  if (counter >= 10) {
    // Display error message on LCD
    lcd_ptr->clear();
    lcd_ptr->setCursor(0, 0);
    lcd_ptr->print("LoRa Failed!");
    lcd_ptr->setCursor(0, 1);
    lcd_ptr->print("Check connection");
    
    Serial.println("LoRa initialization failed. Please check connections");
    
    // รีเซ็ตระบบหลังเจอข้อผิดพลาดมากเกินไป
    resetSystem("Too many errors, resetting system...");
  }
  
  // Configure LoRa parameters
  LoRa.setSpreadingFactor(9);    // Set to 9 for balanced system
  LoRa.setSignalBandwidth(125E3); // 125 kHz
  LoRa.setCodingRate4(5);         // 4/5
  LoRa.enableCrc();               // Add CRC to match Gateway
  LoRa.setSyncWord(0x34);         // Set SyncWord to match Gateway
  LoRa.setTxPower(20);            // Maximum power
  
  // Show LoRa settings for debugging
  Serial.println("LoRa initial settings:");
  Serial.print("Frequency: "); Serial.println(BAND);
  Serial.print("Spreading Factor: "); Serial.println(9);
  Serial.print("Signal Bandwidth: "); Serial.println(125E3);
  Serial.print("Coding Rate: "); Serial.println(5);
  Serial.print("Sync Word: 0x"); Serial.println(0x34, HEX);
  Serial.print("TX Power: "); Serial.println(20);
  LoRa.dumpRegisters(Serial);
  
  // Display success message on LCD
  lcd_ptr->clear();
  lcd_ptr->setCursor(0, 0);
  lcd_ptr->print("LoRa Ready!");
  lcd_ptr->setCursor(0, 1);
  lcd_ptr->print("Waiting for GPS...");
  
  Serial.println("LoRa initialized successfully!");
  Serial.println("Waiting for GPS data...");
  Serial.println("System will auto-reset every 20 minutes");
  
  startTime = millis();
}

void loop() {
  // Reset watchdog timer
  ESP.wdtFeed();
  
  // ตรวจสอบการรีเซ็ตอัตโนมัติตามเวลา
  if (millis() - systemStartTime > SYSTEM_RESET_INTERVAL) {
    resetSystem("System auto reset (20 minutes)");
  }
  
  // ตรวจสอบจำนวนข้อผิดพลาด
  if (errorCount >= MAX_ERROR_COUNT) {
    resetSystem("Too many errors, resetting system...");
  }
  
  // Read data from GPS
  while (GPSSerial.available() > 0) {
    if (gps.encode(GPSSerial.read())) {
      updateGPSData();
    }
  }

  // Check GPS timeout
  if (!gpsFixed && (millis() - startTime > GPS_TIMEOUT)) {
    // อัปเดตหน้าจอ LCD ตามช่วงเวลา
    if (millis() - lastLCDUpdateTime > LCD_UPDATE_INTERVAL) {
      // Display no GPS signal message on LCD
      lcd_ptr->clear();
      lcd_ptr->setCursor(0, 0);
      lcd_ptr->print("No GPS Signal!");
      lcd_ptr->setCursor(0, 1);
      lcd_ptr->print("Check GPS wiring");
      lastLCDUpdateTime = millis();
    }
    
    Serial.println("No GPS signal! Please check GPS connection");
    startTime = millis();
    errorCount++; // เพิ่มจำนวนข้อผิดพลาด
  }
  
  // ปรับความเร็วในการส่งข้อมูลตามสถานะของ GPS
  if (gpsFixed) {
    currentSendInterval = FAST_SEND_INTERVAL;
  } else {
    currentSendInterval = SEND_INTERVAL;
  }
  
  // Send data when it's time
  if (millis() - lastSendTime > currentSendInterval) {
    // ส่งข้อมูลเฉพาะเมื่อได้รับสัญญาณ GPS แล้ว
    if (gpsFixed) {
      sendGPSData();
    } else {
      Serial.println("Not sending data - waiting for GPS fix");
    }
    lastSendTime = millis();
  }

  // Check for incoming messages from LoRa
  checkIncomingMessages();
  
  // Reset watchdog timer at end of loop
  ESP.wdtFeed();
}

void updateGPSData() {
  // Update GPS data
  if (gps.location.isValid()) {
    gpsFixed = true;
    latitude = gps.location.lat();
    longitude = gps.location.lng();
  }
  
  if (gps.speed.isValid()) {
    speed_kmph = gps.speed.kmph();
  }
  
  if (gps.altitude.isValid()) {
    altitude = gps.altitude.meters();
  }
  
  if (gps.satellites.isValid()) {
    satellites = gps.satellites.value();
  }
  
  // อัปเดตจอ LCD ตามช่วงเวลา
  if (millis() - lastLCDUpdateTime > LCD_UPDATE_INTERVAL) {
    if (gpsFixed) {
      // Update data on LCD
      lcd_ptr->clear();
      lcd_ptr->setCursor(0, 0);
      lcd_ptr->print("Lat:");
      lcd_ptr->print(latitude, 6);
      lcd_ptr->setCursor(0, 1);
      lcd_ptr->print("Lng:");
      lcd_ptr->print(longitude, 6);
      
      // Display data in Serial Monitor
      Serial.println("------------ GPS DATA ------------");
      Serial.print("Coordinates: ");
      Serial.print(latitude, 6);
      Serial.print(", ");
      Serial.println(longitude, 6);
      Serial.print("Speed: ");
      Serial.print(speed_kmph);
      Serial.println(" km/h");
      Serial.print("Altitude: ");
      Serial.print(altitude);
      Serial.println(" meters");
      Serial.print("Satellites: ");
      Serial.println(satellites);
      Serial.println("----------------------------------");
    } else {
      // Show searching for signal
      lcd_ptr->clear();
      lcd_ptr->setCursor(0, 0);
      lcd_ptr->print("Searching GPS...");
      lcd_ptr->setCursor(0, 1);
      lcd_ptr->print("Satellites: ");
      lcd_ptr->print(satellites);
      
      // แสดงสถานะการค้นหาสัญญาณใน Serial Monitor
      Serial.println("Searching for GPS signal...");
      Serial.print("Satellites found: ");
      Serial.println(satellites);
    }
    
    lastLCDUpdateTime = millis();
  }
}

void sendGPSData() {
  // ตรวจสอบว่ามีการรับสัญญาณ GPS แล้วหรือไม่
  if (!gpsFixed) {
    Serial.println("Cannot send GPS data - No GPS fix");
    return;
  }
  
  // Create JSON object
  StaticJsonDocument<200> doc;
  doc["latitude"] = latitude;
  doc["longitude"] = longitude;
  doc["speed"] = speed_kmph;
  doc["altitude"] = altitude;
  doc["satellites"] = satellites;
  doc["timestamp"] = millis();
  doc["device"] = "tracker"; // Add device ID for identification
  
  // Convert JSON to string
  String jsonMessage;
  serializeJson(doc, jsonMessage);
  
  // อัปเดตจอ LCD ในช่วงการส่งข้อมูลเท่านั้น
  if (millis() - lastLCDUpdateTime > LCD_UPDATE_INTERVAL) {
    // Update LCD before sending data
    lcd_ptr->clear();
    lcd_ptr->setCursor(0, 0);
    lcd_ptr->print("Sending Data");
    lcd_ptr->setCursor(0, 1);
    lcd_ptr->print("Sat:");
    lcd_ptr->print(satellites);
    lcd_ptr->print(" S:");
    lcd_ptr->print(speed_kmph);
    
    lastLCDUpdateTime = millis();
  }
  
  // Display the data being sent in Serial Monitor
  Serial.println("Sending GPS data via LoRa...");
  Serial.println(jsonMessage);
  
  // Send data via LoRa multiple times to increase reception chances
  for (int i = 0; i < 3; i++) {
    LoRa.beginPacket();
    LoRa.print(jsonMessage);
    LoRa.endPacket();
    
    Serial.print("Sending attempt ");
    Serial.println(i + 1);
    
    delay(100); // ลดการหน่วงเวลาระหว่างการส่งแต่ละครั้ง
  }
  
  Serial.println("Data sent successfully!");
}

void checkIncomingMessages() {
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    // Read received message
    String message = "";
    while (LoRa.available()) {
      message += (char)LoRa.read();
    }
    
    // Display received message on LCD
    lcd_ptr->clear();
    lcd_ptr->setCursor(0, 0);
    lcd_ptr->print("Message Received");
    lcd_ptr->setCursor(0, 1);
    // Show short message
    if (message.length() > 16) {
      lcd_ptr->print(message.substring(0, 16));
    } else {
      lcd_ptr->print(message);
    }
    
    // Display received message in Serial Monitor
    Serial.println("Received new message:");
    Serial.println(message);
    
    // Try to parse message as JSON
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);
    
    // If JSON parsing successful
    if (!error) {
      // Send acknowledgement back
      StaticJsonDocument<200> ackDoc;
      ackDoc["messageId"] = doc.containsKey("messageId") ? doc["messageId"].as<String>() : String("ack_") + millis();
      ackDoc["received"] = true;
      ackDoc["timestamp"] = millis();
      
      String ackMessage;
      serializeJson(ackDoc, ackMessage);
      
      // Send acknowledgement back
      LoRa.beginPacket();
      LoRa.print(ackMessage);
      LoRa.endPacket();
      
      lcd_ptr->clear();
      lcd_ptr->setCursor(0, 0);
      lcd_ptr->print("Ack Sent");
      lcd_ptr->setCursor(0, 1);
      lcd_ptr->print("ID: ");
      lcd_ptr->print(ackDoc["messageId"].as<String>().substring(0, 8));
      
      Serial.println("Acknowledgement sent successfully:");
      Serial.println(ackMessage);
    }
  }
} 