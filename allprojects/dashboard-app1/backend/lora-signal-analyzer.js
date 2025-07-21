const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();
const cors = require('cors');

// เชื่อมต่อกับ MongoDB
mongoose.connect('mongodb://localhost:27017/peem', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ เชื่อมต่อ MongoDB สำเร็จ'))
.catch(err => console.error('❌ เชื่อมต่อ MongoDB ล้มเหลว:', err));

// กำหนด Schema สำหรับ locations
const LocationSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  timestamp: { type: Date, default: Date.now },
  additionalInfo: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

// กำหนด Schema สำหรับ pois
const POISchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  category: {
    type: String,
    enum: ['building', 'landmark', 'restaurant', 'office', 'parking', 'other'],
    default: 'other'
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
});

// สร้าง Geospatial Index
LocationSchema.index({ location: '2dsphere' });
POISchema.index({ location: '2dsphere' });

// สร้าง Model
const Location = mongoose.model('Location', LocationSchema);
const POI = mongoose.model('POI', POISchema);

// สร้าง Schema สำหรับข้อมูลสัญญาณ LoRa
const LoraSignalSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  locationName: {
    type: String,
    required: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now 
  },
  signalStrength: {
    type: Number,
    required: true
  },
  signalQuality: {
    type: String,
    enum: ['ดีมาก', 'ดี', 'ปานกลาง', 'อ่อน', 'แย่'],
    required: true
  },
  distanceMeters: {
    type: Number,
    required: true
  },
  nearestPOI: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'POI'
  },
  poiDistance: {
    type: Number
  }
});

LoraSignalSchema.index({ location: '2dsphere' });
const LoraSignal = mongoose.model('LoraSignal', LoraSignalSchema);

// ฟังก์ชันคำนวณระยะทางระหว่างสองพิกัด (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // รัศมีของโลกในหน่วยกิโลเมตร
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // ระยะทางในหน่วยกิโลเมตร
  return distance * 1000; // แปลงเป็นเมตร
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// คำนวณความแรงของสัญญาณ LoRa จากระยะทาง
function calculateSignalStrength(distanceMeters, heightAdvantage = false) {
  // กำหนดค่าความแรงสัญญาณเริ่มต้น (dBm)
  const baseSignalStrength = -30;
  
  // สูตรคำนวณความแรงสัญญาณตามระยะทาง (สมมติ)
  // ลดลง 3 dBm ทุก 100 เมตร
  let signalStrength = baseSignalStrength - (3 * (distanceMeters / 100));
  
  // ถ้ามีความได้เปรียบด้านความสูง จะมีสัญญาณดีขึ้น 5 dBm
  if (heightAdvantage) {
    signalStrength += 5;
  }
  
  // กำหนดขีดจำกัดล่าง (-120 dBm เป็นสัญญาณที่อ่อนมาก)
  return Math.max(-120, signalStrength);
}

// ประเมินคุณภาพสัญญาณจากความแรงสัญญาณ
function evaluateSignalQuality(signalStrength) {
  if (signalStrength >= -60) {
    return {
      quality: 'ดีมาก',
      description: 'สัญญาณแรงมาก การสื่อสารเสถียรที่สุด'
    };
  } else if (signalStrength >= -80) {
    return {
      quality: 'ดี',
      description: 'สัญญาณแรง การสื่อสารเสถียร'
    };
  } else if (signalStrength >= -100) {
    return {
      quality: 'ปานกลาง',
      description: 'สัญญาณปานกลาง อาจมีการสูญหายของข้อมูลบ้าง'
    };
  } else if (signalStrength >= -110) {
    return {
      quality: 'อ่อน',
      description: 'สัญญาณอ่อน มักมีการสูญหายของข้อมูล'
    };
  } else {
    return {
      quality: 'แย่',
      description: 'สัญญาณแย่มาก การสื่อสารไม่เสถียร อาจขาดการเชื่อมต่อ'
    };
  }
}

// ฟังก์ชันหลักสำหรับการวิเคราะห์สัญญาณ LoRa
async function analyzeLoraSignals() {
  try {
    console.log('📡 เริ่มต้นการวิเคราะห์สัญญาณ LoRa...');
    
    // ดึงข้อมูลตำแหน่งทั้งหมด
    const locations = await Location.find().sort({ timestamp: -1 });
    console.log(`📍 พบข้อมูลตำแหน่ง ${locations.length} รายการ`);
    
    // ดึงข้อมูล POIs ทั้งหมด
    const pois = await POI.find();
    console.log(`🏢 พบข้อมูลสถานที่ ${pois.length} รายการ`);
    
    // จุดรับสัญญาณ (Receiver) - กำหนดตามตึกวิทยาศาสตร์ ชั้น 11
    const receiver = {
      latitude: 9.085311643852359,
      longitude: 99.36704889656512,
      height: 11 * 3 // ความสูงประมาณ 3 เมตรต่อชั้น = 33 เมตร
    };
    
    // สร้างข้อมูลสัญญาณ LoRa จากข้อมูลตำแหน่ง
    const loraSignals = [];
    
    for (const location of locations) {
      // แปลงพิกัดจาก MongoDB [longitude, latitude] เป็น {latitude, longitude}
      const latitude = location.location.coordinates[1];
      const longitude = location.location.coordinates[0];
      
      // หาระยะทางจากจุดรับสัญญาณ
      const distanceMeters = calculateDistance(
        receiver.latitude, 
        receiver.longitude, 
        latitude, 
        longitude
      );
      
      // หาจุดสนใจ (POI) ที่ใกล้ที่สุด
      let nearestPOI = null;
      let minDistance = Infinity;
      
      for (const poi of pois) {
        const poiLatitude = poi.location.coordinates[1];
        const poiLongitude = poi.location.coordinates[0];
        
        const poiDistance = calculateDistance(
          latitude, 
          longitude, 
          poiLatitude, 
          poiLongitude
        );
        
        if (poiDistance < minDistance) {
          minDistance = poiDistance;
          nearestPOI = poi;
        }
      }
      
      // คำนวณความแรงสัญญาณ
      const hasHeightAdvantage = receiver.height > 10; // ถ้าตัวรับอยู่สูงกว่า 10 เมตร
      const signalStrength = calculateSignalStrength(distanceMeters, hasHeightAdvantage);
      
      // ประเมินคุณภาพสัญญาณ
      const { quality, description } = evaluateSignalQuality(signalStrength);
      
      // สร้างข้อมูลสัญญาณ LoRa
      const loraSignal = {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        locationName: nearestPOI ? nearestPOI.name : `พิกัด ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        timestamp: location.timestamp,
        signalStrength,
        signalQuality: quality,
        signalDescription: description,
        distanceMeters: Math.round(distanceMeters),
        nearestPOI: nearestPOI ? nearestPOI._id : null,
        poiDistance: Math.round(minDistance)
      };
      
      loraSignals.push(loraSignal);
    }
    
    console.log(`✅ สร้างข้อมูลสัญญาณ LoRa ${loraSignals.length} รายการ`);
    
    // บันทึกข้อมูลลงฐานข้อมูล
    await LoraSignal.deleteMany({}); // ลบข้อมูลเดิม
    await LoraSignal.insertMany(loraSignals);
    
    console.log('✅ บันทึกข้อมูลสัญญาณ LoRa ลงฐานข้อมูลเรียบร้อยแล้ว');
    
    // สรุปผลการวิเคราะห์
    const analysis = {
      totalSignals: loraSignals.length,
      averageSignalStrength: loraSignals.reduce((sum, signal) => sum + signal.signalStrength, 0) / loraSignals.length,
      qualityBreakdown: {
        excellent: loraSignals.filter(signal => signal.signalQuality === 'ดีมาก').length,
        good: loraSignals.filter(signal => signal.signalQuality === 'ดี').length,
        moderate: loraSignals.filter(signal => signal.signalQuality === 'ปานกลาง').length,
        weak: loraSignals.filter(signal => signal.signalQuality === 'อ่อน').length,
        poor: loraSignals.filter(signal => signal.signalQuality === 'แย่').length
      },
      averageDistance: loraSignals.reduce((sum, signal) => sum + signal.distanceMeters, 0) / loraSignals.length
    };
    
    console.log('📊 สรุปผลการวิเคราะห์:');
    console.log(JSON.stringify(analysis, null, 2));
    
    return {
      success: true,
      data: loraSignals,
      analysis
    };
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการวิเคราะห์สัญญาณ LoRa:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ฟังก์ชันเพิ่มข้อมูลสถานที่เริ่มต้น
async function seedPOIs() {
  try {
    // ตรวจสอบว่ามีข้อมูล POI อยู่แล้วหรือไม่
    const count = await POI.countDocuments();
    if (count > 0) {
      console.log(`🏢 มีข้อมูลสถานที่ ${count} รายการอยู่แล้ว ไม่ต้องเพิ่มข้อมูลเริ่มต้น`);
      return;
    }

    // รายการสถานที่เริ่มต้น
    const initialPOIs = [
      {
        name: "อาคารคณะวิทยาศาสตร์",
        description: "อาคารคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
        location: {
          type: "Point",
          coordinates: [99.36680712084552, 9.085161175082991]
        },
        category: "building"
      },
      {
        name: "อาคารคณะครุศาสตร์",
        description: "อาคารคณะครุศาสตร์ สำนักงานและห้องเรียน",
        location: {
          type: "Point",
          coordinates: [99.36614710125723, 9.081924936641594]
        },
        category: "building"
      },
      {
        name: "โรงอาหาร",
        description: "โรงอาหารหลัก มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
        location: {
          type: "Point",
          coordinates: [99.36151359799585, 9.085422144376798]
        },
        category: "restaurant"
      },
      {
        name: "หอสมุด",
        description: "หอสมุดกลาง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
        location: {
          type: "Point",
          coordinates: [99.36067355365874, 9.083974775846071]
        },
        category: "building"
      },
      {
        name: "สนามกีฬา",
        description: "สนามกีฬากลาง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
        location: {
          type: "Point",
          coordinates: [99.3648378021075, 9.080826775139359]
        },
        category: "landmark"
      },
      {
        name: "ตึกทีปังกอนรัศมีโชติ",
        description: "อาคารทีปังกอนรัศมีโชติ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
        location: {
          type: "Point",
          coordinates: [99.366150, 9.083262]
        },
        category: "building"
      },
      {
        name: "ตึกเทคโนโลยีการประมง",
        description: "อาคารเทคโนโลยีการประมง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
        location: {
          type: "Point",
          coordinates: [99.366110, 9.083069]
        },
        category: "building"
      }
    ];

    // เพิ่มข้อมูลสถานที่ในฐานข้อมูล
    const result = await POI.insertMany(initialPOIs);
    console.log(`✅ เพิ่มข้อมูลสถานที่เริ่มต้น ${result.length} รายการสำเร็จ`);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการเพิ่มข้อมูลสถานที่เริ่มต้น:', error);
  }
}

// ส่วนของ Express API
const app = express();
app.use(cors());
app.use(express.json());

// API endpoint สำหรับดึงข้อมูลสัญญาณ LoRa
app.get('/api/lora-signals', async (req, res) => {
  try {
    const loraSignals = await LoraSignal.find()
      .sort({ timestamp: -1 })
      .populate('nearestPOI');
    
    res.json({
      success: true,
      count: loraSignals.length,
      data: loraSignals
    });
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูลสัญญาณ LoRa:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint สำหรับบันทึกพิกัด
app.post('/api/save-coordinates', async (req, res) => {
  try {
    // รองรับทั้งรูปแบบเดิม และรูปแบบใหม่
    const { 
      latitude, 
      longitude, 
      locationName, 
      name, // รองรับ name เพิ่มเติม
      speed = 0, 
      category: reqCategory // รองรับ category จาก request
    } = req.body;
    
    // ใช้ name ถ้ามี หรือไม่ก็ใช้ locationName
    const locationNameToUse = name || locationName;
    // ใช้ category จาก request ถ้ามี
    const categoryToUse = reqCategory || 'other';
    
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุค่า latitude และ longitude'
      });
    }
    
    console.log(`📍 บันทึกพิกัด: ${latitude}, ${longitude}${locationNameToUse ? ` (${locationNameToUse})` : ''}`);
    
    // หาสถานที่ที่ใกล้ที่สุด
    const nearestPOI = await findNearestPOI(latitude, longitude);
    
    // กำหนดชื่อสถานที่
    let locName = `พิกัด ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
    // ถ้าผู้ใช้ระบุชื่อสถานที่มา ให้ใช้ชื่อนั้น
    if (locationNameToUse && locationNameToUse.trim() !== '') {
      locName = locationNameToUse.trim();
      
      // หากเป็นชื่อสถานที่ใหม่ที่ไม่มีในฐานข้อมูล ให้บันทึกเป็น POI ใหม่
      if (!nearestPOI || (nearestPOI && nearestPOI.name !== locName)) {
        const existingPOI = await POI.findOne({ name: locName });
        
        if (!existingPOI) {
          // สร้าง POI ใหม่
          const newPOI = new POI({
            name: locName,
            description: `สถานที่บันทึกโดยผู้ใช้งาน`,
            location: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            category: categoryToUse // ใช้ category ที่ส่งมา
          });
          
          await newPOI.save();
          console.log(`✅ เพิ่มสถานที่ใหม่: ${locName}`);
        }
      }
    } else if (nearestPOI) {
      // ถ้าไม่ได้ระบุชื่อสถานที่ แต่อยู่ใกล้กับสถานที่ที่มีอยู่แล้ว
      locName = `บริเวณ${nearestPOI.name}`;
    }
    
    // สร้างข้อมูลตำแหน่งใหม่
    const newLocation = new Location({
      location: {
        type: 'Point',
        coordinates: [longitude, latitude] // MongoDB ใช้รูปแบบ [longitude, latitude]
      },
      timestamp: new Date(),
      additionalInfo: {
        name: locName,
        category: categoryToUse, // ใช้ category ที่ส่งมา
        speed: speed || 0, // ใช้ speed ที่ส่งมา หรือใช้ 0 ถ้าไม่มี
        altitude: 0,
        satellites: 0,
        heading: 0,
        accuracy: 0,
        battery: 100
      }
    });
    
    // บันทึกลงฐานข้อมูล
    await newLocation.save();
    
    // วิเคราะห์ข้อมูลใหม่
    await analyzeLoraSignals();
    
    res.json({
      success: true,
      message: 'บันทึกพิกัดสำเร็จ'
    });
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการบันทึกพิกัด:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint สำหรับวิเคราะห์สัญญาณ LoRa
app.post('/api/analyze-lora-signals', async (req, res) => {
  try {
    const result = await analyzeLoraSignals();
    res.json(result);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการวิเคราะห์สัญญาณ LoRa:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ฟังก์ชันหาสถานที่ใกล้ที่สุด
async function findNearestPOI(latitude, longitude) {
  try {
    // ค้นหา POI ที่ใกล้ที่สุด
    const pois = await POI.find();
    if (pois.length === 0) return null;
    
    let nearestPOI = null;
    let minDistance = Infinity;
    
    for (const poi of pois) {
      const poiLatitude = poi.location.coordinates[1];
      const poiLongitude = poi.location.coordinates[0];
      
      const poiDistance = calculateDistance(
        latitude, 
        longitude, 
        poiLatitude, 
        poiLongitude
      );
      
      if (poiDistance < minDistance) {
        minDistance = poiDistance;
        nearestPOI = poi;
      }
    }
    
    // ถ้าระยะทางมากกว่า 300 เมตร ถือว่าไม่ได้อยู่ในบริเวณใด
    if (minDistance > 300) {
      return null;
    }
    
    return nearestPOI;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการหาสถานที่ใกล้ที่สุด:', error);
    return null;
  }
}

// เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`✅ เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT}`);
  
  // เพิ่มข้อมูลสถานที่เริ่มต้น
  await seedPOIs();
  
  console.log('📡 เริ่มต้นการวิเคราะห์สัญญาณ LoRa อัตโนมัติ...');
  await analyzeLoraSignals();
});

module.exports = {
  analyzeLoraSignals,
  calculateSignalStrength,
  evaluateSignalQuality
}; 