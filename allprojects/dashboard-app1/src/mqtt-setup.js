/**
 * MQTT Setup สำหรับระบบ LoRa Signal Dashboard
 * -----
 * ไฟล์นี้ใช้สำหรับการเชื่อมต่อ MQTT Broker เพื่อรับข้อมูลจากอุปกรณ์ LoRa 
 */

const mqtt = require('mqtt');
const mongoose = require('mongoose');
require('dotenv').config();

// ค่าคอนฟิกพื้นฐาน
const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || '@msg/gps';
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lora_signals';

// เชื่อมต่อกับฐานข้อมูล
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('เชื่อมต่อกับ MongoDB สำเร็จ'))
.catch(err => console.error('ไม่สามารถเชื่อมต่อกับ MongoDB:', err));

// ประกาศ model สำหรับเก็บข้อมูลตำแหน่ง
const Location = mongoose.model('Location', new mongoose.Schema({
  name: String,
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  timestamp: { type: Date, default: Date.now },
  additionalInfo: {
    speed: Number,
    altitude: Number,
    satellites: Number,
    device: String
  },
  category: String
}, { timestamps: true }));

// ฟังก์ชันเชื่อมต่อกับ MQTT Broker
const connectMQTT = () => {
  console.log(`กำลังเชื่อมต่อกับ MQTT Broker ที่ ${MQTT_BROKER}...`);
  
  const client = mqtt.connect(MQTT_BROKER, {
    clientId: `lora_dashboard_${Math.random().toString(16).substr(2, 8)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000
  });

  // กรณีเชื่อมต่อสำเร็จ
  client.on('connect', () => {
    console.log(`เชื่อมต่อกับ MQTT Broker สำเร็จ`);
    
    // สมัครสมาชิกไปยัง topic ที่ต้องการ
    client.subscribe(MQTT_TOPIC, (err) => {
      if (err) {
        console.error(`ไม่สามารถสมัครสมาชิกไปยัง topic ${MQTT_TOPIC}:`, err);
        return;
      }
      console.log(`สมัครสมาชิกไปยัง topic ${MQTT_TOPIC} สำเร็จ`);
    });
  });

  // กรณีเกิดข้อผิดพลาดในการเชื่อมต่อ
  client.on('error', (err) => {
    console.error('เกิดข้อผิดพลาดในการเชื่อมต่อกับ MQTT Broker:', err);
  });

  // รับข้อความจาก MQTT
  client.on('message', (topic, message) => {
    console.log(`ได้รับข้อความจาก topic ${topic}: ${message.toString()}`);
    
    try {
      // แปลงข้อความ JSON เป็น object
      const data = JSON.parse(message.toString());
      
      // ตรวจสอบว่ามีข้อมูล latitude และ longitude หรือไม่
      if (!data.latitude || !data.longitude) {
        console.error('ข้อมูลไม่ครบถ้วน ต้องมี latitude และ longitude');
        return;
      }
      
      // สร้างข้อมูลสำหรับบันทึกลงฐานข้อมูล
      const locationData = {
        location: {
          type: 'Point',
          coordinates: [parseFloat(data.longitude), parseFloat(data.latitude)]
        },
        additionalInfo: {
          speed: data.speed,
          altitude: data.altitude,
          satellites: data.satellites,
          device: data.device || 'unknown'
        }
      };
      
      // กำหนดชื่อสถานที่ถ้ามี
      if (data.name) {
        locationData.name = data.name;
      }
      
      // บันทึกลงฐานข้อมูล
      const location = new Location(locationData);
      location.save()
        .then(savedData => {
          console.log('บันทึกข้อมูลตำแหน่งลงฐานข้อมูลสำเร็จ:', savedData._id);
        })
        .catch(err => {
          console.error('ไม่สามารถบันทึกข้อมูลตำแหน่งได้:', err);
        });
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการประมวลผลข้อความ:', error);
    }
  });

  return client;
};

// ฟังก์ชันส่งข้อมูลไปยัง MQTT Broker (สำหรับการทดสอบ)
const publishLocation = (client, data) => {
  if (!client || !client.connected) {
    console.error('ไม่มีการเชื่อมต่อกับ MQTT Broker');
    return;
  }
  
  // ตรวจสอบว่าข้อมูลมีความถูกต้อง
  if (!data || !data.latitude || !data.longitude) {
    console.error('ข้อมูลไม่ครบถ้วน ต้องมี latitude และ longitude');
    return;
  }
  
  // แปลง object เป็น JSON string
  const message = JSON.stringify(data);
  
  // ส่งข้อความไปยัง topic
  client.publish(MQTT_TOPIC, message, { qos: 1 }, (err) => {
    if (err) {
      console.error('ไม่สามารถส่งข้อความได้:', err);
      return;
    }
    console.log('ส่งข้อความสำเร็จ:', message);
  });
};

// ตัวอย่างการใช้งาน
if (require.main === module) {
  // ถ้าเรียกไฟล์นี้โดยตรง ให้เริ่มเชื่อมต่อ MQTT
  const client = connectMQTT();
  
  // ตัวอย่างการส่งข้อมูลหลังจากเชื่อมต่อแล้ว 3 วินาที
  setTimeout(() => {
    const exampleData = {
      latitude: 9.084893,
      longitude: 99.366140,
      speed: 17,
      altitude: 15.23,
      satellites: 8,
      device: "tracker"
    };
    
    publishLocation(client, exampleData);
    
    // ตัวอย่างข้อมูลเพิ่มเติม
    setTimeout(() => {
      const locations = [
        { name: "อาคารคณะวิทยาศาสตร์", latitude: 9.085161175082991, longitude: 99.36680712084552 },
        { name: "อาคารคณะครุศาสตร์", latitude: 9.081924936641594, longitude: 99.36614710125723 },
        { name: "โรงอาหาร", latitude: 9.085422144376798, longitude: 99.36151359799585 },
        { name: "หอสมุด", latitude: 9.083974775846071, longitude: 99.36067355365874 }
      ];
      
      let index = 0;
      const interval = setInterval(() => {
        if (index >= locations.length) {
          clearInterval(interval);
          console.log('ส่งข้อมูลทดสอบเสร็จสิ้น');
          setTimeout(() => process.exit(0), 1000);
          return;
        }
        
        const location = locations[index];
        publishLocation(client, {
          ...location,
          speed: Math.floor(Math.random() * 20),
          altitude: 10 + Math.random() * 10,
          satellites: Math.floor(5 + Math.random() * 7),
          device: "test-device"
        });
        
        index++;
      }, 2000);
    }, 2000);
  }, 3000);
}

module.exports = {
  connectMQTT,
  publishLocation
}; 