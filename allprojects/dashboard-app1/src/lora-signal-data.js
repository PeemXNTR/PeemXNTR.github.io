// ข้อมูลจำลองสัญญาณ LoRa ตั้งแต่ 13:00 น. ถึง 14:00 น.
// สร้างเมื่อวันที่: ${new Date().toLocaleDateString('th-TH')}

// พิกัดของจุดรับสัญญาณ LoRa (ตึกวิทยาศาสตร์ ชั้น 11)
const loraReceiverCoordinates = {
  latitude: 9.085311643852359,
  longitude: 99.36704889656512,
  height: 11 * 3 // ความสูงประมาณ 3 เมตรต่อชั้น = 33 เมตร
};

// ข้อมูลสถานที่ในมหาวิทยาลัย
const universityLocations = [
  {
    name: "อาคารคณะวิทยาศาสตร์",
    description: "อาคารคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085240,
    longitude: 99.366871,
    category: "building"
  },
  {
    name: "อาคารคณะครุศาสตร์",
    description: "อาคารคณะครุศาสตร์ สำนักงานและห้องเรียน",
    latitude: 9.081990, 
    longitude: 99.366113,
    category: "building"
  },
  {
    name: "โรงอาหาร",
    description: "โรงอาหารหลัก มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085362,
    longitude: 99.361512,
    category: "restaurant"
  },
  {
    name: "หอสมุด",
    description: "หอสมุดกลาง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083931,
    longitude: 99.360773,
    category: "building"
  },
  {
    name: "สนามกีฬา",
    description: "สนามกีฬากลาง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.080869, 
    longitude: 99.364796,
    category: "landmark"
  },
  {
    name: "อาคารบริหาร",
    description: "อาคารบริหารและสำนักงานอธิการบดี",
    latitude: 9.077440,
    longitude: 99.362325,
    category: "office"
  },
  {
    name: "ที่จอดรถหน้ามหาวิทยาลัย",
    description: "ลานจอดรถหลักบริเวณหน้ามหาวิทยาลัย",
    latitude: 9.079487,
    longitude: 99.364749,
    category: "parking"
  },
  {
    name: "วงเวียนหน้ามอ",
    description: "วงเวียนหน้ามหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.078808,
    longitude: 99.363979,
    category: "landmark"
  },
  {
    name: "อาคารเฉลิมพระเกียรติ 80 พรรษา",
    description: "อาคารเฉลิมพระเกียรติ 80 พรรษา มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.082469,
    longitude: 99.365329,
    category: "building"
  },
  {
    name: "สํานักงานจัดการทรัพย์สิน ม.ราชภัฏสุราษฏร์ธานี",
    description: "สำนักงานจัดการทรัพย์สินของมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.079872,
    longitude: 99.364332,
    category: "office"
  },
  // เพิ่มอีก 20 สถานที่จากข้อมูลที่มี
  {
    name: "ตึกคณะตึกพยาบาล",
    description: "อาคารคณะพยาบาลศาสตร์ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.086410,
    longitude: 99.365631,
    category: "building"
  },
  {
    name: "คณะมนุษยศาสตร์และสังคมศาสตร์",
    description: "อาคารคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083924,
    longitude: 99.364532,
    category: "building"
  },
  {
    name: "ลานกิจกรรม",
    description: "ลานกิจกรรมสำหรับจัดกิจกรรมต่างๆ ของมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.084229,
    longitude: 99.363965,
    category: "landmark"
  },
  {
    name: "ตึกทีปังกอนรัศมีโชติ",
    description: "อาคารทีปังกอนรัศมีโชติ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085477,
    longitude: 99.365524,
    category: "building"
  },
  {
    name: "ตึกเทคโนโลยีการประมง",
    description: "อาคารเทคโนโลยีการประมง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.086865,
    longitude: 99.367103,
    category: "building"
  },
  {
    name: "ตึกสุนทรียศาสตร์ sru",
    description: "อาคารสุนทรียศาสตร์ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083067,
    longitude: 99.368262,
    category: "building"
  },
  {
    name: "อาคารวิทยาศาสตร์สุขภาพ",
    description: "อาคารวิทยาศาสตร์สุขภาพ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.082293,
    longitude: 99.366561,
    category: "building"
  },
  {
    name: "ตลาดนัด ม.ราชภัฏสุราษฏร์ธานี",
    description: "ตลาดนัดภายในมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.081807,
    longitude: 99.365391,
    category: "landmark"
  },
  {
    name: "เคาน์เตอร์ไปรษณีย์ สาขามหาวิทยาลัยราชภัฎสุราษฎ์ธานี",
    description: "เคาน์เตอร์ไปรษณีย์สาขาย่อยในมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.084802,
    longitude: 99.367844,
    category: "office"
  },
  {
    name: "สถาบันวิจัยและพัฒนา",
    description: "สถาบันวิจัยและพัฒนา มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.087539,
    longitude: 99.368781,
    category: "office"
  },
  {
    name: "วิทยาลัยนานาชาติการท่องเที่ยว มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    description: "วิทยาลัยนานาชาติการท่องเที่ยว มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.080516,
    longitude: 99.362875,
    category: "building"
  },
  {
    name: "SRU Car Care",
    description: "ศูนย์บริการดูแลรถยนต์ในมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.086212,
    longitude: 99.369195,
    category: "building"
  },
  {
    name: "อาคารปฏิบัติการเทคโนโลยีการจัดการอุตสาหกรรม",
    description: "อาคารปฏิบัติการเทคโนโลยีการจัดการอุตสาหกรรม มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.079871,
    longitude: 99.363584,
    category: "building"
  },
  {
    name: "Choux B Do สาขาเมืองสุราษฎร์ธานี",
    description: "ร้านอาหารและเครื่องดื่ม Choux B Do สาขาเมืองสุราษฎร์ธานี",
    latitude: 9.078785,
    longitude: 99.366996,
    category: "restaurant"
  },
  {
    name: "ศูนย์การเรียนรู้การจัดการขยะแบบครบวงจร",
    description: "ศูนย์การเรียนรู้การจัดการขยะแบบครบวงจร มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.088241,
    longitude: 99.367549,
    category: "building"
  },
  {
    name: "แปลงฝึก สาขานวัตกรรมทางการเกษตร",
    description: "แปลงฝึกปฏิบัติสาขานวัตกรรมทางการเกษตร มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.081405,
    longitude: 99.362312,
    category: "landmark"
  },
  {
    name: "ลานจอดรถบัณฑิต มรส. บัตรเหลือง",
    description: "ลานจอดรถสำหรับบัณฑิต มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.082665,
    longitude: 99.363781,
    category: "parking"
  },
  {
    name: "คณะวิทยาการจัดการ",
    description: "อาคารคณะวิทยาการจัดการ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083067,
    longitude: 99.368262,
    category: "building"
  },
 
  {
    name: "หอประชุม",
    description: "หอประชุม มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.091242285486329,
    longitude: 99.36757773366124,
    category: "building"
  },

];

// ฟังก์ชันคำนวณระยะทางระหว่างสองพิกัด (Haversine formula) และคำนึงถึงความสูง
const calculateDistance = (lat1, lon1, lat2, lon2, height1 = 0, height2 = 0) => {
  const R = 6371e3; // รัศมีของโลกในเมตร
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // ระยะทางตามผิวโลก
  const horizontalDistance = R * c;
  
  // คำนวณระยะทางแบบ 3 มิติ คำนึงถึงความสูง
  const heightDifference = Math.abs(height1 - height2);
  const distance = Math.sqrt(Math.pow(horizontalDistance, 2) + Math.pow(heightDifference, 2));

  return Math.round(distance);
};

// ฟังก์ชันคำนวณความแรงสัญญาณ LoRa จากระยะทาง (โมเดลปรับปรุง)
const calculateSignalStrength = (distanceMeters, heightAdvantage = false) => {
  // ค่าพื้นฐานสำหรับโมเดล free-space path loss แบบปรับปรุง
  const baseSignalStrength = -30; // dBm ที่ระยะ 1 เมตร (ปรับให้แรงขึ้นเนื่องจากอยู่สูง)
  
  // ปรับค่าการลดทอนสัญญาณตามความสูง
  // สัญญาณลดทอนน้อยลงเมื่อมีความได้เปรียบเรื่องความสูง
  const pathLossExponent = heightAdvantage ? 2.5 : 2.8; 
  
  // คำนวณความแรงสัญญาณจากระยะทาง
  const signalStrength = baseSignalStrength - 10 * pathLossExponent * Math.log10(Math.max(1, distanceMeters));
  
  // ปรับแต่งความแรงสัญญาณเล็กน้อย (สุ่ม ±2 dBm)
  const randomVariation = (Math.random() * 4 - 2);
  
  return Math.round(signalStrength + randomVariation);
};

// ฟังก์ชันประเมินคุณภาพสัญญาณจากความแรงสัญญาณ
const evaluateSignalQuality = (signalStrength) => {
  let signalQuality, signalDescription;
  
  if (signalStrength >= -70) {
    signalQuality = 'ดีมาก';
    signalDescription = 'สัญญาณคุณภาพดีเยี่ยม การรับส่งข้อมูลเสถียร';
  } else if (signalStrength >= -85) {
    signalQuality = 'ดี';
    signalDescription = 'สัญญาณคุณภาพดี การรับส่งข้อมูลปกติ';
  } else if (signalStrength >= -100) {
    signalQuality = 'ปานกลาง';
    signalDescription = 'สัญญาณปานกลาง อาจมีการสูญหายของข้อมูลบ้าง';
  } else if (signalStrength >= -110) {
    signalQuality = 'อ่อน';
    signalDescription = 'สัญญาณอ่อน เกิดการสูญหายของข้อมูลบ่อยครั้ง';
  } else {
    signalQuality = 'แย่';
    signalDescription = 'สัญญาณแย่มาก ไม่สามารถรับส่งข้อมูลได้อย่างมีประสิทธิภาพ';
  }
  
  return { signalQuality, signalDescription };
};

// ฟังก์ชันสร้างข้อมูลจำลองสัญญาณ LoRa
const loraSignalData = () => {
  // สร้างวันปัจจุบัน
  const today = new Date();
  const startTime = new Date(today);
  startTime.setHours(13, 0, 0, 0); // ตั้งเวลาเริ่มต้นที่ 13:00:00
  
  // คำนวณข้อมูลสัญญาณสำหรับทุกสถานที่
  const locationsWithSignal = universityLocations.map((location, index) => {
    // กำหนดความสูงของอาคาร (สมมติว่าอาคารมีความสูงต่างกัน)
    const locationHeight = location.category === "building" ? 
      Math.floor(Math.random() * 6) * 3 : // อาคาร 1-5 ชั้น (3 เมตรต่อชั้น)
      2; // สถานที่ทั่วไปสูงประมาณ 2 เมตร
    
    // คำนวณระยะทางจากจุดรับสัญญาณ โดยคำนึงถึงความสูง
    const distanceMeters = calculateDistance(
      loraReceiverCoordinates.latitude, loraReceiverCoordinates.longitude,
      location.latitude, location.longitude,
      loraReceiverCoordinates.height, locationHeight
    );
    
    // ตรวจสอบว่ามีความได้เปรียบเรื่องความสูงหรือไม่
    // (จุดรับสัญญาณอยู่สูงกว่าจุดส่งมาก)
    const heightAdvantage = loraReceiverCoordinates.height > locationHeight + 10;
    
    // คำนวณความแรงสัญญาณ โดยคำนึงถึงความได้เปรียบเรื่องความสูง
    const signalStrength = calculateSignalStrength(distanceMeters, heightAdvantage);
    
    // ประเมินคุณภาพสัญญาณ
    const { signalQuality, signalDescription } = evaluateSignalQuality(signalStrength);
    
    // กำหนดเวลาสำหรับแต่ละสถานที่
    const timePoint = new Date(startTime);
    const minutesToAdd = index % 31; // กระจายเวลาเป็นทุก 2 นาที (30 สถานที่ในช่วง 60 นาที)
    timePoint.setMinutes(timePoint.getMinutes() + minutesToAdd * 2);
    
    // สร้างข้อมูลเพิ่มเติม
    const additionalInfo = {
      snr: parseFloat((Math.random() * 12 - 2).toFixed(1)), // Signal-to-Noise Ratio (-2 to 10 dB)
      frequency: 915 + parseFloat((Math.random() * 0.2).toFixed(1)), // ความถี่ MHz
      bandwidth: [125, 250, 500][Math.floor(Math.random() * 3)], // กว้างแบนด์ kHz
      packetLoss: parseFloat((Math.random() * 25 * (1 - (signalStrength + 120) / 80)).toFixed(1)) // การสูญหายของแพ็คเก็ต %
    };
    
    return {
      id: `lora-${timePoint.getTime()}`,
      locationId: index + 1,
      locationName: location.name,
      timestamp: timePoint.toLocaleTimeString('th-TH'),
      timestampISO: timePoint.toISOString(),
      latitude: location.latitude,
      longitude: location.longitude,
      signalStrength, // dBm
      signalQuality,
      signalDescription,
      distanceMeters,
      heightAdvantage,
      ...additionalInfo
    };
  });
  
  // เรียงลำดับตามเวลา
  return locationsWithSignal.sort((a, b) => {
    return new Date(a.timestampISO) - new Date(b.timestampISO);
  });
};

// การแปลความหมายคุณภาพสัญญาณ LoRa
const signalQualityGuide = {
  excellent: {
    range: '> -70 dBm',
    description: 'สัญญาณคุณภาพดีเยี่ยม เหมาะกับการส่งข้อมูลได้อย่างเสถียร'
  },
  good: {
    range: '-70 ถึง -85 dBm',
    description: 'สัญญาณคุณภาพดี เหมาะสำหรับการสื่อสารทั่วไป'
  },
  moderate: {
    range: '-85 ถึง -100 dBm',
    description: 'สัญญาณปานกลาง อาจมีการสูญหายของข้อมูลบ้าง ควรพิจารณาเพิ่มความแรงสัญญาณ'
  },
  weak: {
    range: '-100 ถึง -110 dBm',
    description: 'สัญญาณอ่อน เกิดการสูญหายของข้อมูลบ่อยครั้ง ควรปรับปรุงตำแหน่งอุปกรณ์'
  },
  poor: {
    range: '< -110 dBm',
    description: 'สัญญาณแย่มาก การสื่อสารไม่เสถียร ไม่แนะนำให้ใช้ในงานที่ต้องการความเสถียร'
  }
};

// การวิเคราะห์สัญญาณ LoRa
const analyzeLoraSignal = (data) => {
  if (!data || data.length === 0) return null;
  
  // คำนวณค่าเฉลี่ย
  const signalStrengths = data.map(item => item.signalStrength);
  const avgSignalStrength = signalStrengths.reduce((sum, val) => sum + val, 0) / signalStrengths.length;
  
  // หาค่าต่ำสุดและสูงสุด
  const minSignalStrength = Math.min(...signalStrengths);
  const maxSignalStrength = Math.max(...signalStrengths);
  
  // นับจำนวนของแต่ละคุณภาพสัญญาณ
  const qualityCounts = data.reduce((counts, item) => {
    counts[item.signalQuality] = (counts[item.signalQuality] || 0) + 1;
    return counts;
  }, {});
  
  // หาสัญญาณที่มีคุณภาพมากที่สุด
  const mostCommonQuality = Object.entries(qualityCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  return {
    averageSignalStrength: avgSignalStrength.toFixed(2),
    minSignalStrength,
    maxSignalStrength,
    qualityCounts,
    mostCommonQuality,
    dataPoints: data.length,
    timeRange: {
      start: data[0].timestamp,
      end: data[data.length - 1].timestamp
    }
  };
};

// ฟังก์ชันส่งออกข้อมูลเป็น Excel
const exportToExcel = (data) => {
  try {
    // ต้องติดตั้ง xlsx ก่อนใช้ฟังก์ชันนี้
    // npm install xlsx
    const XLSX = require('xlsx');
    
    // เตรียมข้อมูลในรูปแบบที่เหมาะสมสำหรับ Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
      'ลำดับ': item.locationId,
      'เวลา': item.timestamp,
      'สถานที่': item.locationName,
      'ละติจูด': item.latitude,
      'ลองจิจูด': item.longitude,
      'ความแรง (dBm)': item.signalStrength,
      'คุณภาพสัญญาณ': item.signalQuality,
      'ระยะทาง (ม.)': item.distanceMeters,
      'SNR (dB)': item.snr,
      'ความถี่ (MHz)': item.frequency,
      'แบนด์วิดธ์ (kHz)': item.bandwidth,
      'แพ็คเกตสูญหาย (%)': item.packetLoss
    })));
    
    // ตั้งค่าความกว้างของคอลัมน์
    const colWidths = [
      { wch: 5 },   // ลำดับ
      { wch: 12 },  // เวลา
      { wch: 35 },  // สถานที่
      { wch: 10 },  // ละติจูด
      { wch: 10 },  // ลองจิจูด
      { wch: 12 },  // ความแรงสัญญาณ
      { wch: 15 },  // คุณภาพสัญญาณ
      { wch: 15 },  // ระยะทาง
      { wch: 10 },  // SNR
      { wch: 12 },  // ความถี่
      { wch: 15 },  // แบนด์วิดธ์
      { wch: 15 }   // แพ็คเกตสูญหาย
    ];
    worksheet['!cols'] = colWidths;
    
    // เพิ่ม worksheet ลงใน workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ข้อมูลสัญญาณ LoRa');
    
    // สร้างไฟล์ Excel
    const fileName = `lora-signal-data-${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    return {
      success: true,
      fileName: fileName
    };
  } catch (error) {
    console.error('การส่งออกเป็น Excel ล้มเหลว:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export { loraSignalData, signalQualityGuide, analyzeLoraSignal, exportToExcel }; 