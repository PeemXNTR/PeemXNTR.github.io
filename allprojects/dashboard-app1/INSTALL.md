# วิธีการติดตั้งแบบย่อ สำหรับแดชบอร์ดสัญญาณ LoRa

## ขั้นตอนการติดตั้งอย่างรวดเร็ว

### 1. ติดตั้งซอฟต์แวร์ที่จำเป็น
```bash
# ติดตั้ง Node.js และ npm
# ดาวน์โหลดและติดตั้งจาก https://nodejs.org/ (เลือก LTS)

# ติดตั้ง MongoDB
# ดาวน์โหลดและติดตั้งจาก https://www.mongodb.com/try/download/community

# ติดตั้ง MQTT Broker (Mosquitto)
# Windows: ดาวน์โหลดและติดตั้งจาก https://mosquitto.org/download/
# macOS: brew install mosquitto
# Linux: sudo apt install mosquitto mosquitto-clients
```

### 2. ดาวน์โหลดและติดตั้งแอปพลิเคชัน
```bash
# โคลนโปรเจกต์
git clone https://github.com/[username]/dashboard-app.git

# เข้าไปที่โฟลเดอร์โปรเจกต์
cd dashboard-app

# ติดตั้ง dependencies
npm install
```

### 3. ตั้งค่าฐานข้อมูล
```bash
# เริ่มต้น MongoDB
# Windows: บริการจะเริ่มต้นอัตโนมัติ
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod

# เปิด MongoDB Shell
mongosh

# สร้างฐานข้อมูล
use lora_signals

# สร้างคอลเลกชัน
db.createCollection("locations")

# เพิ่มข้อมูลตัวอย่าง
db.locations.insertOne({
  name: "อาคารคณะวิทยาศาสตร์",
  location: {
    type: "Point", 
    coordinates: [99.36680712084552, 9.085161175082991]
  },
  timestamp: new Date(),
  category: "อาคารเรียน"
})

# ออกจาก MongoDB Shell
exit
```

### 4. ตั้งค่า MQTT
```bash
# แก้ไขไฟล์ mosquitto.conf เพิ่มบรรทัด:
listener 1883
allow_anonymous true

# รีสตาร์ท service
# Windows: Services -> Mosquitto -> Restart
# macOS: brew services restart mosquitto
# Linux: sudo systemctl restart mosquitto
```

### 5. ตั้งค่าแอปพลิเคชัน
```bash
# สร้างไฟล์ .env ในโฟลเดอร์หลักของโปรเจกต์
echo "MONGODB_URI=mongodb://localhost:27017/lora_signals
MQTT_BROKER=mqtt://localhost:1883
MQTT_TOPIC=@msg/gps
PORT=5000" > .env
```

### 6. รันแอปพลิเคชัน
```bash
# รันเซิร์ฟเวอร์ backend
npm run server

# เปิดเทอร์มินัลอีกหน้าต่าง และรัน frontend
npm start

# เปิดเบราว์เซอร์ไปที่ http://localhost:3000
```

### 7. ทดสอบระบบ
```bash
# ติดตั้ง MQTT client
npm install -g mqttx

# ส่งข้อมูลทดสอบ
mqttx pub -h localhost -t @msg/gps -m '{"latitude":9.084893,"longitude":99.366140,"speed":17,"altitude":15.23,"satellites":8,"device":"tracker"}'
```

## การแก้ไขปัญหาเบื้องต้น
- **MongoDB ไม่ทำงาน**: ตรวจสอบสถานะบริการและรีสตาร์ทหากจำเป็น
- **MQTT ไม่ทำงาน**: ตรวจสอบการตั้งค่าและการอนุญาตการเชื่อมต่อ 
- **Frontend ไม่แสดงข้อมูล**: ตรวจสอบว่า Backend ทำงานอยู่และเชื่อมต่อกับฐานข้อมูลได้
- **API Error**: ตรวจสอบ console.log ในเบราว์เซอร์และเทอร์มินัล

## การตรวจสอบอย่างรวดเร็ว
```bash
# ตรวจสอบ MongoDB
mongosh --eval "db.runCommand({ping: 1})"

# ตรวจสอบ MQTT
mqttx sub -h localhost -t test & mqttx pub -h localhost -t test -m "test"

# ตรวจสอบสถานะ Backend
curl http://localhost:5000/api/status
``` 