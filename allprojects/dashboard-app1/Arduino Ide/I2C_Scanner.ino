/*
 * I2C Scanner - ใช้สำหรับตรวจสอบที่อยู่ของอุปกรณ์ I2C
 * สำหรับ NodeMCU ESP8266
 * 
 * วิธีใช้งาน:
 * 1. ต่อขา SDA และ SCL ของอุปกรณ์ I2C เข้ากับ NodeMCU ตามกำหนด
 * 2. อัปโหลดโค้ดนี้ไปยัง NodeMCU (ต้องถอดสาย SCL ออกก่อนอัปโหลด)
 * 3. ต่อสาย SCL กลับและเปิด Serial Monitor ที่ความเร็ว 115200 baud
 * 4. จะเห็นที่อยู่ I2C ของอุปกรณ์ที่เชื่อมต่ออยู่
 * 
 * ค่า I2C Address ที่พบบ่อย:
 * - จอ LCD I2C: 0x27 หรือ 0x3F
 * - เซ็นเซอร์ MPU6050: 0x68 หรือ 0x69
 * - เซ็นเซอร์ BMP280: 0x76 หรือ 0x77
 */

#include <Wire.h>
#include <ESP8266WiFi.h>

// กำหนดขา SDA_PIN และ SCL_PIN สำหรับ I2C
#define SDA_PIN 4     // D2 (GPIO4) สำหรับ SDA
#define SCL_PIN 3     // RX (GPIO3) สำหรับ SCL

void setup() {
  // เริ่มต้น Serial
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }
  Serial.println("\nI2C Scanner");
  
  // ปิด WiFi เพื่อลดการรบกวน
  WiFi.mode(WIFI_OFF);
  WiFi.forceSleepBegin();
  
  // เริ่มต้น I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // ลดความเร็ว I2C เพื่อความเสถียร
  Wire.setClock(50000); // 50kHz
  
  // รอให้ I2C เริ่มต้น
  delay(1000);
}

void loop() {
  byte error, address;
  int deviceCount = 0;
  
  Serial.println("กำลังค้นหาอุปกรณ์ I2C...");
  
  for (address = 1; address < 127; address++) {
    // ลองส่งคำสั่งไปยังที่อยู่นี้
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("พบอุปกรณ์ I2C ที่ที่อยู่ 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
      deviceCount++;
    } else if (error == 4) {
      Serial.print("เกิดข้อผิดพลาดไม่ทราบสาเหตุที่ที่อยู่ 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
    }
  }
  
  if (deviceCount == 0) {
    Serial.println("ไม่พบอุปกรณ์ I2C");
    Serial.println("โปรดตรวจสอบการเชื่อมต่อ หรือลองเปลี่ยนขา SDA/SCL");
  } else {
    Serial.print("พบอุปกรณ์ I2C ทั้งหมด ");
    Serial.print(deviceCount);
    Serial.println(" เครื่อง");
  }
  
  delay(5000); // ทำการสแกนทุก 5 วินาที
} 