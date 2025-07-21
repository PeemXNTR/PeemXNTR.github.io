// สคริปต์เพิ่มและอัพเดทข้อมูลสถานที่สำคัญในมหาวิทยาลัย
const axios = require('axios');

// รายการสถานที่ที่ต้องการเพิ่มหรือแก้ไข
const locations = [
  {
    name: "อาคารคณะวิทยาศาสตร์",
    description: "อาคารคณะวิทยาศาสตร์และเทคโนโลยี มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085161175082991,
    longitude: 99.36680712084552,
    category: "building"
  },
  {
    name: "อาคารคณะครุศาสตร์",
    description: "อาคารคณะครุศาสตร์ สำนักงานและห้องเรียน",
    latitude: 9.081924936641594, 
    longitude: 99.36614710125723,
    category: "building"
  },
  {
    name: "โรงอาหาร",
    description: "โรงอาหารหลัก มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085422144376798,
    longitude: 99.36151359799585,
    category: "restaurant"
  },
  {
    name: "หอสมุด",
    description: "หอสมุดกลาง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083974775846071,
    longitude: 99.36067355365874,
    category: "building"
  },
  {
    name: "สนามกีฬา",
    description: "สนามกีฬากลาง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.080826775139359, 
    longitude: 99.3648378021075,
    category: "landmark"
  },
  {
    name: "อาคารบริหาร",
    description: "อาคารบริหารและสำนักงานอธิการบดี",
    latitude: 9.077477135520846,
    longitude: 99.362408737303,
    category: "office"
  },
  // เพิ่มข้อมูลใหม่
  {
    name: "ที่จอดรถหน้ามหาวิทยาลัย",
    description: "ลานจอดรถหลักบริเวณหน้ามหาวิทยาลัย",
    latitude: 9.07940,
    longitude: 99.36470,
    category: "parking"
  },
  {
    name: "อาคารเรียนรวม 1",
    description: "อาคารเรียนรวมสำหรับนักศึกษา",
    latitude: 9.07640,
    longitude: 99.36250,
    category: "building"
  },
  // เพิ่มจุดใหม่
  {
    name: "วงเวียนหน้ามอ",
    description: "วงเวียนหน้ามหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.080019,
    longitude: 99.363782,
    category: "landmark"
  },
  {
    name: "อาคารเฉลิมพระเกียรติ 80 พรรษา",
    description: "อาคารเฉลิมพระเกียรติ 80 พรรษา มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.078802,
    longitude: 99.362825,
    category: "building"
  },
  {
    name: "สํานักงานจัดการทรัพย์สิน ม.ราชภัฏสุราษฏร์ธานี",
    description: "สำนักงานจัดการทรัพย์สินของมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.079612,
    longitude: 99.363887,
    category: "office"
  },
  {
    name: "ตึกคณะตึกพยาบาล",
    description: "อาคารคณะพยาบาลศาสตร์ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.080661,
    longitude: 99.363973,
    category: "building"
  },
  {
    name: "คณะมนุษยศาสตร์และสังคมศาสตร์",
    description: "อาคารคณะมนุษยศาสตร์และสังคมศาสตร์ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.082669,
    longitude: 99.364251,
    category: "building"
  },
  {
    name: "ลานกิจกรรม",
    description: "ลานกิจกรรมสำหรับจัดกิจกรรมต่างๆ ของมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083283,
    longitude: 99.364461,
    category: "landmark"
  },
  {
    name: "ตึกทีปังกอนรัศมีโชติ",
    description: "อาคารทีปังกอนรัศมีโชติ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083262,
    longitude: 99.366150,
    category: "building"
  },
  {
    name: "ตึกเทคโนโลยีการประมง",
    description: "อาคารเทคโนโลยีการประมง มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083069,
    longitude: 99.366110,
    category: "building"
  },
  {
    name: "ตึกสุนทรียศาสตร์ sru",
    description: "อาคารสุนทรียศาสตร์ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.088062,
    longitude: 99.363297,
    category: "building"
  },
  {
    name: "อาคารวิทยาศาสตร์สุขภาพ",
    description: "อาคารวิทยาศาสตร์สุขภาพ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085271,
    longitude: 99.363621,
    category: "building"
  },
  {
    name: "ตลาดนัด ม.ราชภัฏสุราษฏร์ธานี",
    description: "ตลาดนัดภายในมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.083774526467632,
    longitude: 99.36186169383151,
    category: "landmark"
  },
  {
    name: "เคาน์เตอร์ไปรษณีย์ สาขามหาวิทยาลัยราชภัฎสุราษฎ์ธานี",
    description: "เคาน์เตอร์ไปรษณีย์สาขาย่อยในมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.082463481806721,
    longitude: 99.36215137240207,
    category: "office"
  },
  {
    name: "สถาบันวิจัยและพัฒนา",
    description: "สถาบันวิจัยและพัฒนา มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.081888739499783,
    longitude: 99.3626341700132,
    category: "office"
  },
  {
    name: "วิทยาลัยนานาชาติการท่องเที่ยว มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    description: "วิทยาลัยนานาชาติการท่องเที่ยว มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.081915225337232,
    longitude: 99.36407451623151,
    category: "building"
  },
  {
    name: "SRU Car Care",
    description: "ศูนย์บริการดูแลรถยนต์ในมหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.081009408475765,
    longitude: 99.36578040116493,
    category: "building"
  },
  {
    name: "อาคารปฏิบัติการเทคโนโลยีการจัดการอุตสาหกรรม",
    description: "อาคารปฏิบัติการเทคโนโลยีการจัดการอุตสาหกรรม มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.081453047130365,
    longitude: 99.36587360792352,
    category: "building"
  },
  {
    name: "Choux B Do สาขาเมืองสุราษฎร์ธานี",
    description: "ร้านอาหารและเครื่องดื่ม Choux B Do สาขาเมืองสุราษฎร์ธานี",
    latitude: 9.081680590833841,
    longitude: 99.36630309657659,
    category: "restaurant"
  },
  {
    name: "ศูนย์การเรียนรู้การจัดการขยะแบบครบวงจร สถานีจัดการขยะอินทรีย์ โครงการธนาคารขยะเพื่อชุมชนต้นแบบ",
    description: "ศูนย์การเรียนรู้การจัดการขยะแบบครบวงจร มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085692566090945,
    longitude: 99.36143593411308,
    category: "building"
  },
  {
    name: "แปลงฝึก สาขานวัตกรรมทางการเกษตร (Agricultural Innovations' Training Farm)",
    description: "แปลงฝึกปฏิบัติสาขานวัตกรรมทางการเกษตร มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085952124490847,
    longitude: 99.36163575868449,
    category: "landmark"
  },
  {
    name: "ลานจอดรถบัณฑิต มรส. บัตรเหลือง",
    description: "ลานจอดรถสำหรับบัณฑิต มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.08689858260727,
    longitude: 99.36235523548349,
    category: "parking"
  },
  {
    name: "คณะวิทยาการจัดการ",
    description: "อาคารคณะวิทยาการจัดการ มหาวิทยาลัยราชภัฏสุราษฎร์ธานี",
    latitude: 9.085945104371051,
    longitude: 99.36311698289738,
    category: "building"
  }
];

// ฟังก์ชันสำหรับอัพเดทข้อมูลสถานที่
async function updateLocations() {
  console.log('เริ่มต้นการเพิ่มข้อมูลสถานที่ใหม่...');
  
  let successCount = 0;
  let errorCount = 0;
  
  // ดึงข้อมูลสถานที่ที่มีอยู่แล้วทั้งหมด
  try {
    const response = await axios.get(`http://localhost:5000/api/poi`);
    const existingPOIs = response.data.data || [];
    const existingNames = existingPOIs.map(poi => poi.name);
    
    console.log(`พบข้อมูลเดิม ${existingNames.length} รายการ`);
    
    // กรองเฉพาะสถานที่ที่ยังไม่มีในระบบ
    const newLocations = locations.filter(location => !existingNames.includes(location.name));
    console.log(`พบข้อมูลใหม่ที่ต้องเพิ่ม ${newLocations.length} รายการ`);
    
    // เพิ่มเฉพาะข้อมูลใหม่
    for (const location of newLocations) {
      try {
        console.log(`กำลังเพิ่ม: ${location.name}`);
        
        const response = await axios.post('http://localhost:5000/api/poi', {
          name: location.name,
          description: location.description,
          latitude: location.latitude,
          longitude: location.longitude,
          category: location.category
        });
        
        if (response.status === 201) {
          console.log(`✅ เพิ่ม ${location.name} สำเร็จ`);
          successCount++;
        } else {
          console.log(`❌ เพิ่ม ${location.name} ไม่สำเร็จ: ${response.statusText}`);
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ เกิดข้อผิดพลาดเมื่อเพิ่ม ${location.name}:`, error.response?.data || error.message);
        errorCount++;
      }
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error.response?.data || error.message);
    return;
  }
  
  console.log('\nสรุปผลการเพิ่มข้อมูล:');
  console.log(`- สำเร็จ: ${successCount} รายการ`);
  console.log(`- ไม่สำเร็จ: ${errorCount} รายการ`);
}

// เรียกใช้ฟังก์ชัน
updateLocations().catch(console.error); 