require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB connection
const connectDB = async () => {
  try {
    console.log("📡 Attempting to connect to MongoDB...");
    console.log("🔗 URI:", process.env.MONGO_URI);
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

// สร้าง Schema สำหรับเก็บข้อมูลตำแหน่งและประวัติ
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

// เพิ่ม Geospatial Index
LocationSchema.index({ location: '2dsphere' });

const Location = mongoose.model('Location', LocationSchema);

// สร้าง Schema สำหรับเก็บข้อมูลสถานที่สำคัญ (Points of Interest)
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
  // ข้อมูลเพิ่มเติมเฉพาะของแต่ละประเภทสถานที่
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: { type: Date, default: Date.now }
});

// เพิ่ม Geospatial Index สำหรับ POI
POISchema.index({ location: '2dsphere' });

const POI = mongoose.model('POI', POISchema);

// เพิ่ม middleware สำหรับตรวจสอบ Longdo Map API key
const validateLongdoMapKey = (req, res, next) => {
  const apiKey = process.env.REACT_APP_LONGDO_MAP_KEY;
  if (!apiKey) {
    console.error('❌ Longdo Map API key is not configured');
    return res.status(500).json({ error: 'Map service configuration error' });
  }
  next();
};

// ใช้ middleware กับ routes ที่เกี่ยวข้องกับแผนที่
app.use('/api/locations', validateLongdoMapKey);

// สร้าง map สำหรับเก็บเวลาล่าสุดของการบันทึกตำแหน่ง
const lastLocationSaveTime = new Map();

// API Endpoints
// 1. บันทึกตำแหน่งใหม่
app.post('/api/locations', async (req, res) => {
  try {
    console.log('📥 Received location data:', req.body);
    
    const { latitude, longitude, additionalInfo } = req.body;
    
    // ตรวจสอบว่ามีค่า latitude และ longitude ที่ถูกต้อง
    if (latitude === undefined || longitude === undefined || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return res.status(400).json({ 
        error: 'Invalid location data',
        message: 'Latitude and longitude are required and must be valid numbers'
      });
    }
    
    // สร้าง key จากพิกัด
    const locationKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const now = Date.now();
    
    // ตรวจสอบว่าตำแหน่งนี้ถูกบันทึกล่าสุดเมื่อไร
    const minTimeBetweenSaves = 5000; // 5 วินาที (5000 มิลลิวินาที)
    if (lastLocationSaveTime.has(locationKey)) {
      const lastSaveTime = lastLocationSaveTime.get(locationKey);
      const timeSinceLastSave = now - lastSaveTime;
      
      if (timeSinceLastSave < minTimeBetweenSaves) {
        console.log(`ℹ️ Throttling location save. Last saved ${timeSinceLastSave}ms ago.`);
        return res.status(200).json({
          message: 'Throttled due to frequent updates',
          nextAllowedSaveIn: minTimeBetweenSaves - timeSinceLastSave
        });
      }
    }
    
    // เพิ่มการตรวจสอบว่ามีข้อมูลซ้ำหรือไม่ (ตำแหน่งเดียวกันที่บันทึกไปเมื่อไม่นานมานี้)
    const recentTimeThreshold = new Date();
    recentTimeThreshold.setSeconds(recentTimeThreshold.getSeconds() - 10); // 10 วินาทีย้อนหลัง
    
    const existingLocation = await Location.findOne({
      'location.coordinates': [Number(longitude), Number(latitude)],
      timestamp: { $gte: recentTimeThreshold }
    });
    
    if (existingLocation) {
      console.log('ℹ️ Skip duplicate location data (same coordinates within last 10 seconds)');
      return res.status(200).json({ 
        message: 'Skip duplicate location',
        existing: existingLocation
      });
    }
    
    // ตรวจสอบว่ามีข้อมูลที่อยู่ใกล้เคียงมากๆ ในช่วงเวลาใกล้กัน (near duplicate)
    const nearbyExistingLocation = await Location.findOne({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(longitude), Number(latitude)]
          },
          $maxDistance: 5 // ห่างกันไม่เกิน 5 เมตร
        }
      },
      timestamp: { $gte: recentTimeThreshold }
    });
    
    if (nearbyExistingLocation) {
      console.log('ℹ️ Skip near-duplicate location data (within 5 meters in the last 10 seconds)');
      return res.status(200).json({ 
        message: 'Skip near-duplicate location',
        existing: nearbyExistingLocation
      });
    }
    
    const newLocation = new Location({
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)] // MongoDB เก็บพิกัดในรูปแบบ [longitude, latitude]
      },
      timestamp: new Date(),
      additionalInfo: additionalInfo || {}
    });

    const savedLocation = await newLocation.save();
    console.log('✅ Location saved:', savedLocation);
    
    // อัปเดตเวลาล่าสุดที่บันทึกพิกัดนี้
    lastLocationSaveTime.set(locationKey, now);
    
    res.status(201).json(savedLocation);
  } catch (error) {
    console.error('❌ Error saving location:', error);
    res.status(500).json({ 
      error: 'Failed to save location',
      details: error.message 
    });
  }
});

// 2. ดึงประวัติตำแหน่งทั้งหมด
app.get('/api/locations', async (req, res) => {
  try {
    console.log('📤 Fetching locations...');
    const locations = await Location.find().sort({ timestamp: -1 });
    console.log(`✅ Found ${locations.length} locations`);
    res.json({
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('❌ Error fetching locations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch locations',
      details: error.message 
    });
  }
});

// 3. ลบประวัติตำแหน่งตาม ID
app.delete('/api/locations/:id', async (req, res) => {
  try {
    const deletedLocation = await Location.findByIdAndDelete(req.params.id);
    if (!deletedLocation) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

// เพิ่ม endpoint สำหรับตรวจสอบ API key
app.get('/api/map-config', (req, res) => {
  const apiKey = process.env.REACT_APP_LONGDO_MAP_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Map API key not configured' });
  }
  res.json({ 
    status: 'ok',
    mapApiConfigured: true
  });
});

// เพิ่ม route สำหรับตรวจสอบการเชื่อมต่อ
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// เพิ่ม API Endpoints สำหรับ Geospatial Queries

// 4. ค้นหาตำแหน่งที่อยู่ในรัศมีที่กำหนด (Near)
app.get('/api/locations/near', async (req, res) => {
  try {
    const { lng, lat, maxDistance = 1000, minDistance = 0 } = req.query;
    
    // ตรวจสอบพารามิเตอร์
    if (!lng || !lat || isNaN(Number(lng)) || isNaN(Number(lat))) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Longitude (lng) and latitude (lat) are required and must be valid numbers'
      });
    }
    
    console.log(`🔍 Searching locations near [${lng}, ${lat}] within ${maxDistance} meters`);
    
    const locations = await Location.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)]
          },
          $minDistance: Number(minDistance),
          $maxDistance: Number(maxDistance)
        }
      }
    });
    
    console.log(`✅ Found ${locations.length} locations near the specified point`);
    res.json({
      count: locations.length,
      center: { lng, lat },
      maxDistance,
      minDistance,
      data: locations
    });
  } catch (error) {
    console.error('❌ Error in near query:', error);
    res.status(500).json({
      error: 'Failed to execute near query',
      details: error.message
    });
  }
});

// 5. ค้นหาตำแหน่งที่อยู่ในพื้นที่สี่เหลี่ยม (Within)
app.get('/api/locations/within', async (req, res) => {
  try {
    const { swLng, swLat, neLng, neLat } = req.query;
    
    // ตรวจสอบพารามิเตอร์
    if (!swLng || !swLat || !neLng || !neLat || 
        isNaN(Number(swLng)) || isNaN(Number(swLat)) || 
        isNaN(Number(neLng)) || isNaN(Number(neLat))) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Southwest and northeast coordinates are required and must be valid numbers'
      });
    }
    
    console.log(`🔍 Searching locations within box: SW[${swLng}, ${swLat}], NE[${neLng}, ${neLat}]`);
    
    const locations = await Location.find({
      location: {
        $geoWithin: {
          $box: [
            [Number(swLng), Number(swLat)], // Southwest corner
            [Number(neLng), Number(neLat)]  // Northeast corner
          ]
        }
      }
    });
    
    console.log(`✅ Found ${locations.length} locations within the specified box`);
    res.json({
      count: locations.length,
      bounds: {
        southwest: { lng: swLng, lat: swLat },
        northeast: { lng: neLng, lat: neLat }
      },
      data: locations
    });
  } catch (error) {
    console.error('❌ Error in within query:', error);
    res.status(500).json({
      error: 'Failed to execute within query',
      details: error.message
    });
  }
});

// 6. ค้นหาตำแหน่งที่อยู่ในพื้นที่หลายเหลี่ยม (Polygon)
app.post('/api/locations/within-polygon', async (req, res) => {
  try {
    const { polygon } = req.body;
    
    // ตรวจสอบพารามิเตอร์
    if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
      return res.status(400).json({
        error: 'Invalid polygon',
        message: 'Polygon must be an array of at least 3 coordinates (format: [[lng1, lat1], [lng2, lat2], ...])' 
      });
    }
    
    console.log(`🔍 Searching locations within polygon with ${polygon.length} points`);
    
    // หมายเหตุ: polygon ต้องปิด (จุดแรกและจุดสุดท้ายต้องเป็นจุดเดียวกัน)
    let polygonCoordinates = [...polygon];
    if (JSON.stringify(polygonCoordinates[0]) !== JSON.stringify(polygonCoordinates[polygonCoordinates.length - 1])) {
      polygonCoordinates.push(polygonCoordinates[0]);
    }
    
    const locations = await Location.find({
      location: {
        $geoWithin: {
          $geometry: {
            type: 'Polygon',
            coordinates: [polygonCoordinates]
          }
        }
      }
    });
    
    console.log(`✅ Found ${locations.length} locations within the polygon`);
    res.json({
      count: locations.length,
      polygon: polygonCoordinates,
      data: locations
    });
  } catch (error) {
    console.error('❌ Error in polygon query:', error);
    res.status(500).json({
      error: 'Failed to execute polygon query',
      details: error.message
    });
  }
});

// 7. API สำหรับเพิ่ม Point of Interest (POI)
app.post('/api/poi', async (req, res) => {
  try {
    const { name, description, latitude, longitude, category, details } = req.body;
    
    // ตรวจสอบพารามิเตอร์
    if (!name || !latitude || !longitude || isNaN(Number(latitude)) || isNaN(Number(longitude))) {
      return res.status(400).json({
        error: 'Invalid POI data',
        message: 'Name, latitude, and longitude are required and coordinates must be valid numbers'
      });
    }
    
    // ตรวจสอบว่าชื่อ POI ซ้ำกับที่มีอยู่แล้วหรือไม่
    const existingPOI = await POI.findOne({ name });
    if (existingPOI) {
      return res.status(400).json({
        error: 'Duplicate POI',
        message: `A POI with the name "${name}" already exists`
      });
    }
    
    const newPOI = new POI({
      name,
      description: description || '',
      location: {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)]
      },
      category: category || 'other',
      details: details || {}
    });
    
    const savedPOI = await newPOI.save();
    console.log('✅ POI saved:', savedPOI);
    
    res.status(201).json(savedPOI);
  } catch (error) {
    console.error('❌ Error saving POI:', error);
    res.status(500).json({
      error: 'Failed to save POI',
      details: error.message
    });
  }
});

// 8. API สำหรับดึงข้อมูล POI ทั้งหมด
app.get('/api/poi', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    
    if (category) {
      query.category = category;
    }
    
    const pois = await POI.find(query).sort({ name: 1 });
    console.log(`✅ Found ${pois.length} POIs`);
    
    res.json({
      count: pois.length,
      data: pois
    });
  } catch (error) {
    console.error('❌ Error fetching POIs:', error);
    res.status(500).json({
      error: 'Failed to fetch POIs',
      details: error.message
    });
  }
});

// 9. API สำหรับค้นหา POI ที่อยู่ใกล้เคียงพิกัดปัจจุบัน
app.get('/api/poi/near', async (req, res) => {
  try {
    const { lng, lat, maxDistance = 500, limit = 5 } = req.query;
    
    // ตรวจสอบพารามิเตอร์
    if (!lng || !lat || isNaN(Number(lng)) || isNaN(Number(lat))) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Longitude (lng) and latitude (lat) are required and must be valid numbers'
      });
    }
    
    console.log(`🔍 Searching POIs near [${lng}, ${lat}] within ${maxDistance} meters`);
    
    const nearbyPOIs = await POI.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)]
          },
          $maxDistance: Number(maxDistance)
        }
      }
    }).limit(Number(limit));
    
    // คำนวณระยะทางสำหรับแต่ละ POI
    const poisWithDistance = nearbyPOIs.map(poi => {
      // คำนวณระยะห่างแบบคร่าวๆ ด้วย haversine formula
      const [poiLng, poiLat] = poi.location.coordinates;
      const distance = calculateDistance(Number(lat), Number(lng), poiLat, poiLng);
      
      return {
        ...poi.toObject(),
        distance: {
          meters: Math.round(distance * 1000),
          kilometers: distance.toFixed(2)
        }
      };
    });
    
    console.log(`✅ Found ${poisWithDistance.length} POIs near the specified point`);
    res.json({
      count: poisWithDistance.length,
      center: { lng, lat },
      maxDistance,
      data: poisWithDistance
    });
  } catch (error) {
    console.error('❌ Error in near POI query:', error);
    res.status(500).json({
      error: 'Failed to execute near POI query',
      details: error.message
    });
  }
});

// 10. API สำหรับคำนวณพิกัดปัจจุบันไปยังสถานที่ที่กำลังจะถึงถัดไป
app.get('/api/poi/next-destination', async (req, res) => {
  try {
    const { lng, lat, direction, speed = 0, maxResults = 3 } = req.query;
    
    // ตรวจสอบพารามิเตอร์
    if (!lng || !lat || isNaN(Number(lng)) || isNaN(Number(lat))) {
      return res.status(400).json({
        error: 'Invalid parameters',
        message: 'Longitude (lng) and latitude (lat) are required and must be valid numbers'
      });
    }
    
    console.log(`🔍 Finding next destination from [${lng}, ${lat}]`);
    
    let query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)]
          },
          $maxDistance: 2000 // ค้นหาในรัศมี 2 กิโลเมตร
        }
      }
    };
    
    // ถ้ามีข้อมูลทิศทาง ให้ค้นหาเฉพาะ POI ที่อยู่ในทิศทางที่กำลังมุ่งไป
    if (direction && !isNaN(Number(direction))) {
      // ต้องมีการคำนวณเพิ่มเติมเกี่ยวกับทิศทาง (ไม่ได้ทำในตัวอย่างนี้)
      console.log(`Using direction: ${direction} degrees`);
    }
    
    const nearbyPOIs = await POI.find(query).limit(Number(maxResults));
    
    // คำนวณเวลาที่คาดว่าจะไปถึงแต่ละสถานที่ โดยใช้ความเร็วปัจจุบัน
    const currentSpeed = Number(speed) > 0 ? Number(speed) : 30; // ความเร็วเริ่มต้น 30 กม./ชม. ถ้าไม่ได้ระบุ
    
    const poisWithETA = nearbyPOIs.map(poi => {
      const [poiLng, poiLat] = poi.location.coordinates;
      const distanceKm = calculateDistance(Number(lat), Number(lng), poiLat, poiLng);
      
      // คำนวณเวลาที่คาดว่าจะไปถึง (ETA - Estimated Time of Arrival)
      // สูตร: เวลา (ชั่วโมง) = ระยะทาง (กม.) / ความเร็ว (กม./ชม.)
      const timeHours = distanceKm / currentSpeed;
      const timeMinutes = Math.round(timeHours * 60);
      
      return {
        ...poi.toObject(),
        distance: {
          meters: Math.round(distanceKm * 1000),
          kilometers: distanceKm.toFixed(2)
        },
        eta: {
          minutes: timeMinutes,
          seconds: Math.round(timeHours * 3600),
          formatted: timeMinutes <= 1 
            ? 'ไม่ถึง 1 นาที' 
            : `ประมาณ ${timeMinutes} นาที`
        }
      };
    });
    
    // เรียงลำดับตามระยะทาง
    poisWithETA.sort((a, b) => a.distance.meters - b.distance.meters);
    
    console.log(`✅ Found ${poisWithETA.length} potential next destinations`);
    res.json({
      count: poisWithETA.length,
      currentLocation: { lng, lat },
      currentSpeed: `${currentSpeed} km/h`,
      data: poisWithETA
    });
  } catch (error) {
    console.error('❌ Error in next destination query:', error);
    res.status(500).json({
      error: 'Failed to find next destination',
      details: error.message
    });
  }
});

// ฟังก์ชั่นคำนวณระยะทางระหว่างสองพิกัด (Haversine formula)
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
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Start server after DB connection
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

startServer(); 