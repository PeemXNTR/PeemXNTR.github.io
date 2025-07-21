#!/usr/bin/env node

/**
 * สคริปต์ทดสอบการส่งข้อมูลผ่าน MQTT สำหรับระบบ LoRa Signal Dashboard
 * 
 * วิธีใช้งาน:
 * 1. ติดตั้ง dependencies: npm install mqtt dotenv
 * 2. สร้างไฟล์ .env ที่มีค่า MQTT_BROKER และ MQTT_TOPIC
 * 3. รันสคริปต์: node scripts/test-mqtt.js
 * 
 * สามารถส่งข้อมูลแบบกำหนดเองได้:
 * node scripts/test-mqtt.js 9.084893 99.366140 "หอสมุด" 17 15.23 8
 */

require('dotenv').config();
const mqtt = require('mqtt');

// ค่าคอนฟิก
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || '@msg/gps';

// ฟังก์ชันสำหรับเชื่อมต่อกับ MQTT Broker
function connectToMQTT() {
  console.log(`กำลังเชื่อมต่อกับ MQTT Broker: ${MQTT_BROKER}`);
  
  const client = mqtt.connect(MQTT_BROKER, {
    clientId: `test_mqtt_${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000
  });
  
  client.on('connect', () => {
    console.log('เชื่อมต่อสำเร็จ!');
    sendMessage(client);
  });
  
  client.on('error', (err) => {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ:', err);
    process.exit(1);
  });
}

// ฟังก์ชันสำหรับส่งข้อความ
function sendMessage(client) {
  // ตรวจสอบว่ามีการส่งพารามิเตอร์หรือไม่
  let data = {};
  
  if (process.argv.length > 3) {
    // ดึงค่าจากพารามิเตอร์
    const latitude = parseFloat(process.argv[2]);
    const longitude = parseFloat(process.argv[3]);
    const locationName = process.argv[4] || '';
    const speed = process.argv[5] ? parseFloat(process.argv[5]) : 0;
    const altitude = process.argv[6] ? parseFloat(process.argv[6]) : 0;
    const satellites = process.argv[7] ? parseInt(process.argv[7]) : 0;
    
    data = {
      latitude,
      longitude,
      name: locationName,
      speed,
      altitude,
      satellites,
      device: "mqtt-test"
    };
  } else {
    // ใช้ค่าตัวอย่างถ้าไม่มีพารามิเตอร์
    data = {
      latitude: 9.084893,
      longitude: 99.366140,
      name: "สถานที่ทดสอบ MQTT",
      speed: 17,
      altitude: 15.23,
      satellites: 8,
      device: "mqtt-test"
    };
  }
  
  // แปลง Object เป็น JSON
  const message = JSON.stringify(data);
  
  console.log(`กำลังส่งข้อความไปยัง topic ${MQTT_TOPIC}:`);
  console.log(message);
  
  // ส่งข้อความ
  client.publish(MQTT_TOPIC, message, { qos: 1 }, (err) => {
    if (err) {
      console.error('ไม่สามารถส่งข้อความได้:', err);
      process.exit(1);
    }
    
    console.log('ส่งข้อความสำเร็จ!');
    
    // ปิดการเชื่อมต่อหลังส่งข้อความเสร็จ
    setTimeout(() => {
      client.end();
      console.log('ปิดการเชื่อมต่อแล้ว');
      process.exit(0);
    }, 1000);
  });
}

// ฟังก์ชันแสดงวิธีใช้งาน
function showHelp() {
  console.log(`
ทดสอบส่งข้อมูล MQTT สำหรับ LoRa Signal Dashboard

วิธีใช้งาน:
  node ${require('path').basename(__filename)} [latitude] [longitude] [location_name] [speed] [altitude] [satellites]

ตัวอย่าง:
  node ${require('path').basename(__filename)}
  node ${require('path').basename(__filename)} 9.084893 99.366140 "หอสมุด" 17 15.23 8

หมายเหตุ:
  - หากไม่ระบุพารามิเตอร์ จะใช้ค่าตัวอย่างในการส่งข้อมูล
  - หากต้องการเปลี่ยน MQTT Broker หรือ Topic ให้กำหนดในไฟล์ .env
  `);
}

// ตรวจสอบว่าต้องการแสดงวิธีใช้งานหรือไม่
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// เริ่มเชื่อมต่อ
connectToMQTT(); 