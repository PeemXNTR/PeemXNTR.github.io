# คู่มือการติดตั้งและใช้งานระบบแดชบอร์ดสัญญาณ LoRa

## สารบัญ
1. [ความต้องการของระบบ](#ความต้องการของระบบ)
2. [การติดตั้ง Node.js และ npm](#การติดตั้ง-nodejs-และ-npm)
3. [การติดตั้ง MongoDB](#การติดตั้ง-mongodb)
4. [การติดตั้ง MQTT Broker](#การติดตั้ง-mqtt-broker)
5. [การดาวน์โหลดและติดตั้งโค้ด](#การดาวน์โหลดและติดตั้งโค้ด)
6. [การตั้งค่าฐานข้อมูล](#การตั้งค่าฐานข้อมูล)
7. [การรันแอปพลิเคชัน](#การรันแอปพลิเคชัน)
8. [การใช้งานระบบ](#การใช้งานระบบ)
9. [การเพิ่มข้อมูลพิกัด](#การเพิ่มข้อมูลพิกัด)
10. [การแก้ไขปัญหาที่พบบ่อย](#การแก้ไขปัญหาที่พบบ่อย)

## ความต้องการของระบบ
ระบบแดชบอร์ดสัญญาณ LoRa มีความต้องการด้านซอฟต์แวร์ ดังนี้:

- **ระบบปฏิบัติการ**: Windows 10/11, macOS, หรือ Linux
- **Node.js**: เวอร์ชัน 14.x ขึ้นไป
- **npm** (Node Package Manager): เวอร์ชัน 6.x ขึ้นไป
- **MongoDB**: เวอร์ชัน 4.4 ขึ้นไป
- **MQTT Broker**: MQTT.js หรือ Mosquitto
- **พื้นที่ว่างในฮาร์ดดิสก์**: อย่างน้อย 500 MB
- **หน่วยความจำ (RAM)**: อย่างน้อย 2 GB

## การติดตั้ง Node.js และ npm

### วินโดวส์ (Windows)
1. เข้าไปที่เว็บไซต์ [nodejs.org](https://nodejs.org/)
2. ดาวน์โหลด Node.js เวอร์ชัน LTS (Long Term Support)
3. เปิดไฟล์ที่ดาวน์โหลดและทำการติดตั้งตามขั้นตอนที่แสดงในโปรแกรมติดตั้ง
4. ติ๊กเลือก "Automatically install the necessary tools..." หากต้องการติดตั้งเครื่องมือเพิ่มเติมโดยอัตโนมัติ
5. เมื่อติดตั้งเสร็จแล้ว เปิด Command Prompt หรือ PowerShell และตรวจสอบเวอร์ชันด้วยคำสั่ง:
   ```
   node -v
   npm -v
   ```

### macOS
1. ติดตั้ง Homebrew (หากยังไม่มี) โดยเปิด Terminal และรันคำสั่ง:
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. ติดตั้ง Node.js ด้วย Homebrew:
   ```
   brew install node
   ```
3. ตรวจสอบเวอร์ชันด้วยคำสั่ง:
   ```
   node -v
   npm -v
   ```

### Linux (Ubuntu/Debian)
1. เปิด Terminal และรันคำสั่งต่อไปนี้:
   ```
   sudo apt update
   sudo apt install nodejs npm
   ```
2. สำหรับ Node.js เวอร์ชันล่าสุด ให้เพิ่ม NodeSource repository:
   ```
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. ตรวจสอบเวอร์ชันด้วยคำสั่ง:
   ```
   node -v
   npm -v
   ```

## การติดตั้ง MongoDB

### วินโดวส์ (Windows)
1. เข้าไปที่ [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. เลือก "MongoDB Community Server"
3. เลือก Platform: Windows, เวอร์ชันล่าสุด, และ Package: MSI
4. ดาวน์โหลดและเปิดไฟล์ติดตั้ง
5. เลือก "Complete" เป็นประเภทการติดตั้ง
6. ติ๊กเลือก "Install MongoDB as a Service" และปล่อยให้ค่าอื่นเป็นค่าเริ่มต้น
7. คลิก Install และรอจนกระบวนการติดตั้งเสร็จสมบูรณ์

### macOS
1. ติดตั้ง MongoDB ด้วย Homebrew:
   ```
   brew tap mongodb/brew
   brew install mongodb-community
   ```
2. เริ่มต้นใช้งาน MongoDB:
   ```
   brew services start mongodb-community
   ```

### Linux (Ubuntu/Debian)
1. นำเข้า public key ของ MongoDB:
   ```
   wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -
   ```
2. สร้างไฟล์สำหรับ MongoDB:
   ```
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list
   ```
3. อัปเดต package database:
   ```
   sudo apt update
   ```
4. ติดตั้ง MongoDB:
   ```
   sudo apt install -y mongodb-org
   ```
5. เริ่มต้นใช้งาน MongoDB:
   ```
   sudo systemctl start mongod
   ```
6. ตรวจสอบสถานะ:
   ```
   sudo systemctl status mongod
   ```

## การติดตั้ง MQTT Broker

### วินโดวส์ (Windows)
1. ดาวน์โหลด Mosquitto จาก [mosquitto.org](https://mosquitto.org/download/)
2. เลือก Mosquitto สำหรับ Windows และดาวน์โหลด installer
3. ติดตั้งตามขั้นตอนที่แสดงในโปรแกรมติดตั้ง
4. เปิด Services ใน Windows และตรวจสอบว่า Mosquitto Broker ทำงานอยู่
5. แก้ไขไฟล์ `mosquitto.conf` ในโฟลเดอร์ติดตั้งให้อนุญาตการเชื่อมต่อแบบไม่มีการยืนยันตัวตน (สำหรับการทดสอบเท่านั้น):
   ```
   listener 1883
   allow_anonymous true
   ```
6. รีสตาร์ท Mosquitto service

### macOS
1. ติดตั้ง Mosquitto ด้วย Homebrew:
   ```
   brew install mosquitto
   ```
2. เริ่มต้น Mosquitto:
   ```
   brew services start mosquitto
   ```
3. แก้ไขไฟล์คอนฟิกที่ `/usr/local/etc/mosquitto/mosquitto.conf`

### Linux (Ubuntu/Debian)
1. ติดตั้ง Mosquitto:
   ```
   sudo apt update
   sudo apt install -y mosquitto mosquitto-clients
   ```
2. เริ่มต้น Mosquitto:
   ```
   sudo systemctl start mosquitto
   ```
3. ตั้งค่าให้เริ่มทำงานอัตโนมัติ:
   ```
   sudo systemctl enable mosquitto
   ```
4. แก้ไขไฟล์คอนฟิกที่ `/etc/mosquitto/mosquitto.conf` เพิ่มบรรทัดต่อไปนี้:
   ```
   listener 1883
   allow_anonymous true
   ```
5. รีสตาร์ท Mosquitto:
   ```
   sudo systemctl restart mosquitto
   ```

## การดาวน์โหลดและติดตั้งโค้ด

1. ดาวน์โหลด Git จาก [git-scm.com](https://git-scm.com/downloads) และติดตั้ง (หากยังไม่มี)
2. เปิด Terminal หรือ Command Prompt
3. โคลนโปรเจกต์ด้วยคำสั่ง:
   ```
   git clone https://github.com/[username]/dashboard-app.git
   ```
   (แทนที่ [username] ด้วยชื่อผู้ใช้ GitHub ที่ถูกต้อง)

4. เข้าไปยังโฟลเดอร์ของโปรเจกต์:
   ```
   cd dashboard-app
   ```
5. ติดตั้ง dependencies ของโปรเจกต์:
   ```
   npm install
   ```

## การตั้งค่าฐานข้อมูล

1. เริ่มต้น MongoDB หากยังไม่ได้เริ่ม:
   - Windows: ตรวจสอบว่า Service ทำงานอยู่
   - macOS: `brew services start mongodb-community`
   - Linux: `sudo systemctl start mongod`

2. เปิด Terminal หรือ Command Prompt ใหม่ และรัน MongoDB Shell:
   ```
   mongosh
   ```

3. สร้างฐานข้อมูลใหม่:
   ```
   use lora_signals
   ```

4. สร้างคอลเลกชันสำหรับข้อมูลตำแหน่ง:
   ```
   db.createCollection("locations")
   ```

5. เพิ่มข้อมูลตัวอย่าง:
   ```javascript
   db.locations.insertOne({
     name: "อาคารคณะวิทยาศาสตร์",
     location: {
       type: "Point",
       coordinates: [99.36680712084552, 9.085161175082991]
     },
     timestamp: new Date(),
     category: "อาคารเรียน"
   })
   ```

6. ออกจาก MongoDB Shell:
   ```
   exit
   ```

## การตั้งค่าแอปพลิเคชัน

1. สร้างไฟล์ `.env` ในโฟลเดอร์หลักของโปรเจกต์:

   ```
   MONGODB_URI=mongodb://localhost:27017/lora_signals
   MQTT_BROKER=mqtt://localhost:1883
   MQTT_TOPIC=@msg/gps
   PORT=5000
   ```

2. แก้ไขไฟล์ `.env` ตามการตั้งค่าของคุณ (หากจำเป็น)

## การรันแอปพลิเคชัน

1. เปิดโฟลเดอร์ของโปรเจกต์ใน Terminal หรือ Command Prompt
2. เริ่มต้นเซิร์ฟเวอร์ Backend:
   ```
   npm run server
   ```
3. เปิด Terminal หรือ Command Prompt อีกหน้าต่างหนึ่ง เข้าไปที่โฟลเดอร์โปรเจกต์และเริ่มต้น Frontend:
   ```
   npm start
   ```
4. เว็บเบราว์เซอร์จะเปิดอัตโนมัติที่ http://localhost:3000

## การใช้งานระบบ

### การเข้าถึงแดชบอร์ด
1. เปิดเว็บเบราว์เซอร์และไปที่ URL: http://localhost:3000
2. เลือกเมนู "LoRa Signal" เพื่อดูข้อมูลสัญญาณ

### การดึงข้อมูล
1. คลิกปุ่ม "ดึงข้อมูลล่าสุด" เพื่อดึงข้อมูลตำแหน่งและสัญญาณจากฐานข้อมูล
2. คลิกปุ่ม "วิเคราะห์ข้อมูล" เพื่อแสดงการวิเคราะห์ข้อมูลสัญญาณ
3. คลิกปุ่ม "ส่งออก Excel" เพื่อดาวน์โหลดข้อมูลในรูปแบบไฟล์ Excel

## การเพิ่มข้อมูลพิกัด

### การใช้ฟอร์มบนหน้าเว็บ
1. ในหน้าแดชบอร์ด กรอกข้อมูลในฟอร์ม "บันทึกพิกัด"
2. กรอกชื่อสถานที่, Latitude และ Longitude 
3. คลิกปุ่ม "บันทึกพิกัด" เพื่อบันทึกข้อมูล

### การใช้ MQTT เพื่อส่งข้อมูล
1. ติดตั้ง MQTT Client:
   ```
   npm install -g mqttx
   ```
2. ส่งข้อมูลพิกัดใหม่:
   ```
   mqttx pub -h localhost -t @msg/gps -m '{"latitude":9.084893,"longitude":99.366140,"speed":17,"altitude":15.23,"satellites":8,"device":"tracker"}'
   ```
3. รูปแบบข้อมูลที่ส่งต้องเป็น JSON และมีค่า latitude และ longitude เป็นอย่างน้อย

## การแก้ไขปัญหาที่พบบ่อย

### 1. ไม่สามารถเชื่อมต่อกับ MongoDB ได้
- ตรวจสอบว่า MongoDB ทำงานอยู่:
  ```
  # Windows
  sc query MongoDB
  
  # macOS
  brew services list
  
  # Linux
  sudo systemctl status mongod
  ```
- ตรวจสอบ URL การเชื่อมต่อใน `.env`
- ลองรีสตาร์ท MongoDB:
  ```
  # Windows
  net stop MongoDB
  net start MongoDB
  
  # macOS
  brew services restart mongodb-community
  
  # Linux
  sudo systemctl restart mongod
  ```

### 2. ไม่สามารถส่งข้อมูลผ่าน MQTT ได้
- ตรวจสอบว่า MQTT Broker ทำงานอยู่:
  ```
  # Windows ดูใน Services
  
  # macOS
  brew services list
  
  # Linux
  sudo systemctl status mosquitto
  ```
- ตรวจสอบการตั้งค่า MQTT Broker ให้อนุญาตการเชื่อมต่อแบบไม่มีการยืนยันตัวตน
- ลองทดสอบการส่งข้อมูลด้วย MQTT Client:
  ```
  mqttx sub -h localhost -t @msg/gps
  ```
  แล้วเปิดเทอร์มินอลอีกอันและลองส่งข้อมูล:
  ```
  mqttx pub -h localhost -t @msg/gps -m '{"latitude":9.084893,"longitude":99.366140}'
  ```

### 3. Backend ไม่ทำงาน
- ตรวจสอบข้อผิดพลาดในเทอร์มินอล
- ตรวจสอบค่า PORT ใน `.env` ว่าไม่ขัดแย้งกับบริการอื่น
- ลองรีสตาร์ทเซิร์ฟเวอร์:
  ```
  npm run server
  ```

### 4. Frontend ไม่แสดงข้อมูล
- ตรวจสอบว่า Backend ทำงานอยู่
- เปิด Console ในเบราว์เซอร์ (F12) ดูข้อความผิดพลาด
- ตรวจสอบการตั้งค่า API URL ในไฟล์ `src/LoraSignalDisplay.js` ว่าชี้ไปที่ backend URL ที่ถูกต้อง

### 5. การแสดงผลไม่ถูกต้อง
- ล้างแคชเบราว์เซอร์ (Ctrl+F5)
- ตรวจสอบรูปแบบข้อมูลจาก console.log
- ตรวจสอบว่าข้อมูลในฐานข้อมูลมีรูปแบบที่ถูกต้อง

## การติดต่อขอความช่วยเหลือ
หากคุณประสบปัญหาในการติดตั้งหรือใช้งานระบบ สามารถติดต่อได้ที่:
- Email: support@lorasignal.com
- GitHub Issue: https://github.com/[username]/dashboard-app/issues 