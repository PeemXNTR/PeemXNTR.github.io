import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import * as XLSX from 'xlsx';

const LoraSignalDisplay = () => {
  const [signalData, setSignalData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [manualCoordinates, setManualCoordinates] = useState({
    latitude: 9.084893,
    longitude: 99.366140,
    locationName: ''
  });

  // ดึงข้อมูลสัญญาณ LoRa จาก API
  const fetchLoraSignals = async () => {
    setIsLoading(true);
    try {
      // เพิ่ม timestamp เพื่อป้องกันการแคช
      const timestamp = new Date().getTime();
      
      // เรียกใช้ API ข้อมูลตำแหน่ง
      const response = await fetch(`http://localhost:5000/api/locations?_t=${timestamp}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Location data fetched:', result);
      
      if (result && result.data && Array.isArray(result.data)) {
        // นำข้อมูลที่ได้รับมาแปลงเป็นรูปแบบที่ต้องการ
        const transformedData = result.data.map(item => {
          // ดึงชื่อสถานที่จากฟังก์ชั่น getLocationName
          const locationName = getLocationName(item);
          
          // คำนวณระยะทางจากจุดรับสัญญาณ (ตึกวิทยาศาสตร์ ชั้น 11)
          let distanceMeters = 0;
          if (item.location && item.location.coordinates && Array.isArray(item.location.coordinates) && 
              item.location.coordinates.length >= 2) {
            // ตำแหน่งรับสัญญาณคือตึกวิทยาศาสตร์ ชั้น 11
            const receiverLat = 9.085311643852359;
            const receiverLng = 99.36704889656512;
            
            // พิกัดใน MongoDB จัดเก็บในรูปแบบ [longitude, latitude]
            const senderLng = item.location.coordinates[0];
            const senderLat = item.location.coordinates[1];
            
            // คำนวณระยะทางด้วย Haversine formula
            const R = 6371000; // รัศมีโลกในเมตร
            const dLat = (senderLat - receiverLat) * Math.PI / 180;
            const dLng = (senderLng - receiverLng) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(receiverLat * Math.PI / 180) * Math.cos(senderLat * Math.PI / 180) * 
              Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            distanceMeters = R * c; // ระยะทางในเมตร
          }
          
          // คำนวณความแรงสัญญาณจากระยะทาง (simulation)
          let signalStrength = -100;
          if (distanceMeters > 0) {
            // สมมติว่าสัญญาณลดลง 20 dBm ทุกๆ 10 เท่าของระยะทาง (log scale)
            signalStrength = -40 - 20 * Math.log10(distanceMeters / 10);
            if (signalStrength < -100) signalStrength = -100;
            if (signalStrength > -30) signalStrength = -30;
          }
          
          // ประเมินคุณภาพสัญญาณจากความแรง
          let signalQuality = "แย่";
          if (signalStrength > -60) signalQuality = "ดีมาก";
          else if (signalStrength > -70) signalQuality = "ดี";
          else if (signalStrength > -80) signalQuality = "ปานกลาง";
          else if (signalStrength > -90) signalQuality = "อ่อน";
          
          // คำอธิบายคุณภาพสัญญาณเพิ่มเติม
          let signalDescription = "";
          if (signalQuality === "ดีมาก") signalDescription = "สัญญาณชัดเจน ไม่มีการขาดหาย";
          else if (signalQuality === "ดี") signalDescription = "สัญญาณค่อนข้างดี บางครั้งอาจมีการขาดหาย";
          else if (signalQuality === "ปานกลาง") signalDescription = "สัญญาณพอใช้ได้ มีการขาดหายบ่อยครั้ง";
          else if (signalQuality === "อ่อน") signalDescription = "สัญญาณอ่อน ไม่เสถียร";
          else signalDescription = "สัญญาณแย่มาก อาจติดต่อไม่ได้";
          
          // สร้างข้อมูลสำหรับตาราง
          return {
            timestamp: item.timestamp || new Date().toISOString(),
            locationName: locationName,
            location: item.location,
            distanceMeters: distanceMeters.toFixed(2),
            signalStrength: signalStrength.toFixed(2),
            signalQuality: signalQuality,
            signalDescription: signalDescription
          };
        });
        
        // เรียงลำดับตามสัญญาณที่ดีที่สุด (จากมากไปน้อย)
        transformedData.sort((a, b) => parseFloat(b.signalStrength) - parseFloat(a.signalStrength));
        
        setSignalData(transformedData);
        
        // คำนวณการวิเคราะห์เบื้องต้นหากมีข้อมูล
        if (transformedData.length > 0) {
          const analysisResult = analyzeSignals(transformedData);
          setAnalysis(analysisResult);
        } else {
          setExportMessage('ไม่พบข้อมูลสัญญาณใหม่');
        }
      } else {
        console.log('ไม่มีข้อมูลตำแหน่งหรือข้อมูลมีรูปแบบไม่ถูกต้อง', result);
        setExportMessage('ไม่มีข้อมูลในฐานข้อมูล');
      }
    } catch (error) {
      console.error('Error fetching signals data:', error);
      setExportMessage(`เกิดข้อผิดพลาด: ${error.message} - กรุณาตรวจสอบว่า backend server ทำงานอยู่ที่พอร์ต 5000 หรือไม่`);
    } finally {
      setIsLoading(false);
    }
  };

  // วิเคราะห์ข้อมูลสัญญาณ LoRa
  const analyzeLoraSignals = async () => {
    setIsLoading(true);
    try {
      // เพิ่ม timestamp เพื่อป้องกันการแคช
      const timestamp = new Date().getTime();
      
      // เปลี่ยน URL เพื่อใช้ API เดียวกับที่ใช้ใน fetchLoraSignals
      const response = await fetch(`http://localhost:5000/api/analyze-signals?_t=${timestamp}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`ได้รับข้อมูลไม่ถูกต้อง: ${contentType}`);
      }
      
      const result = await response.json();
      console.log('Analysis result:', result);
      
      // ถ้า API ตอบกลับข้อมูลที่วิเคราะห์แล้ว ให้ใช้ข้อมูลนั้น
      if (result && result.success && result.data) {
        setSignalData(result.data || []);
        setAnalysis(result.analysis || null);
        setExportMessage('วิเคราะห์ข้อมูลสำเร็จ');
      } 
      // ถ้า API ไม่มีข้อมูลวิเคราะห์ ให้วิเคราะห์เองจากข้อมูลที่มีอยู่
      else if (signalData && signalData.length > 0) {
        const analysisResult = analyzeSignals(signalData);
        setAnalysis(analysisResult);
        setExportMessage('วิเคราะห์ข้อมูลที่มีอยู่สำเร็จ');
      }
      else {
        setExportMessage(`ไม่มีข้อมูลให้วิเคราะห์`);
      }
    } catch (error) {
      console.error('Error analyzing LoRa signals:', error);
      
      // ถ้าเรียก API ล้มเหลว ให้พยายามวิเคราะห์จากข้อมูลที่มีอยู่
      if (signalData && signalData.length > 0) {
        try {
          const analysisResult = analyzeSignals(signalData);
          setAnalysis(analysisResult);
          setExportMessage('วิเคราะห์ข้อมูลจากฐานข้อมูลเดิมสำเร็จ');
        } catch (localError) {
          console.error('Error with local analysis:', localError);
          setExportMessage(`เกิดข้อผิดพลาด: ${error.message}`);
        }
      } else {
        setExportMessage(`เกิดข้อผิดพลาด: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันสำหรับวิเคราะห์ข้อมูลสัญญาณ LoRa
  const analyzeSignals = (data) => {
    const totalSignals = Array.isArray(data) ? data.length : 0;
    if (totalSignals === 0) return null;
    
    try {
      // คำนวณค่าเฉลี่ยความแรงสัญญาณ
      const avgSignalStrength = data.reduce((sum, item) => {
        const signalStrength = Number(item.signalStrength);
        return sum + (isNaN(signalStrength) ? 0 : signalStrength);
      }, 0) / totalSignals;
      
      // นับจำนวนคุณภาพสัญญาณแต่ละระดับ
      const qualityCount = {
        ดีมาก: 0,
        ดี: 0,
        ปานกลาง: 0,
        อ่อน: 0,
        แย่: 0
      };
      
      data.forEach(item => {
        const quality = item.signalQuality || 'ปานกลาง';
        if (qualityCount[quality] !== undefined) {
          qualityCount[quality]++;
        }
      });
      
      // คำนวณค่าเฉลี่ยระยะทาง
      const avgDistance = data.reduce((sum, item) => {
        const distance = Number(item.distanceMeters);
        return sum + (isNaN(distance) ? 0 : distance);
      }, 0) / totalSignals;
      
      // รวบรวมข้อมูลตามสถานที่
      const locationGroups = {};
      data.forEach(item => {
        const locationName = getLocationName(item) || 'ไม่ทราบสถานที่';
        
        if (!locationGroups[locationName]) {
          locationGroups[locationName] = {
            count: 0,
            totalSignalStrength: 0,
            totalDistance: 0,
            qualities: {
              ดีมาก: 0,
              ดี: 0,
              ปานกลาง: 0,
              อ่อน: 0,
              แย่: 0
            }
          };
        }
        
        locationGroups[locationName].count++;
        
        const signalStrength = Number(item.signalStrength);
        locationGroups[locationName].totalSignalStrength += isNaN(signalStrength) ? 0 : signalStrength;
        
        const distance = Number(item.distanceMeters);
        locationGroups[locationName].totalDistance += isNaN(distance) ? 0 : distance;
        
        const quality = item.signalQuality || 'ปานกลาง';
        if (locationGroups[locationName].qualities[quality] !== undefined) {
          locationGroups[locationName].qualities[quality]++;
        }
      });
      
      // คำนวณค่าเฉลี่ยสำหรับแต่ละสถานที่
      const locations = Object.keys(locationGroups).map(name => {
        const group = locationGroups[name];
        return {
          name,
          count: group.count,
          avgSignalStrength: group.totalSignalStrength / group.count,
          avgDistance: group.totalDistance / group.count,
          qualities: group.qualities
        };
      });
      
      // เรียงลำดับสถานที่ตามจำนวนข้อมูล
      locations.sort((a, b) => b.count - a.count);
      
      return {
        totalSignals,
        avgSignalStrength,
        qualityCount,
        avgDistance,
        locations: locations.slice(0, 10) // เอาแค่ 10 อันดับแรก
      };
    } catch (error) {
      console.error('Error in analyzeSignals:', error);
      return {
        totalSignals,
        avgSignalStrength: 0,
        qualityCount: {ดีมาก: 0, ดี: 0, ปานกลาง: 0, อ่อน: 0, แย่: 0},
        avgDistance: 0,
        locations: [],
        error: error.message
      };
    }
  };

  // โหลดข้อมูลเมื่อเปิดหน้า
  useEffect(() => {
    fetchLoraSignals();
  }, []);

  // ส่งออกข้อมูลเป็น Excel
  const exportToExcel = () => {
    setExportLoading(true);
    try {
      // เตรียมข้อมูลสำหรับ Excel
      const worksheetData = signalData.map((item, index) => {
        let dateStr = '-', timeStr = '-';
        
        try {
          if (item.timestamp) {
            const date = new Date(item.timestamp);
            if (!isNaN(date.getTime())) {
              dateStr = date.toLocaleDateString('th-TH');
              timeStr = date.toLocaleTimeString('th-TH');
            }
          }
        } catch (e) {
          console.error('Error parsing timestamp:', e);
        }
        
        // ตรวจสอบค่า locationName
        const locationName = (() => {
          try {
            return item.locationName || getLocationName(item) || '-';
          } catch (e) {
            console.error('Error getting location name:', e);
            return '-';
          }
        })();
        
        // ตรวจสอบและแปลงค่าอื่นๆ
        const signalStrength = (() => {
          try {
            const val = Number(item.signalStrength);
            return isNaN(val) ? '-' : val.toFixed(1);
          } catch (e) {
            return '-';
          }
        })();
        
        const distanceMeters = (() => {
          try {
            const val = Number(item.distanceMeters);
            return isNaN(val) ? '-' : val.toFixed(0);
          } catch (e) {
            return '-';
          }
        })();
        
        return {
          'ลำดับ': index + 1,
          'วันที่': dateStr,
          'เวลา': timeStr,
          'สถานที่': locationName,
          'ความแรงสัญญาณ (dBm)': signalStrength,
          'คุณภาพสัญญาณ': item.signalQuality || '-',
          'คำอธิบาย': item.signalDescription || '-',
          'ระยะทาง (เมตร)': distanceMeters
        };
      });
      
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'ข้อมูลสัญญาณ LoRa');
      
      // ส่งออกไฟล์
      const fileName = `lora-signal-data-${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      setExportMessage(`ส่งออกข้อมูลสำเร็จ: ${fileName}`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportMessage(`ส่งออกข้อมูลล้มเหลว: ${error.message}`);
    } finally {
      setExportLoading(false);
    }
  };

  // ฟังก์ชันสำหรับสีของคุณภาพสัญญาณ
  const getSignalQualityColor = (quality) => {
    switch (quality) {
      case 'ดีมาก': return '#28a745';
      case 'ดี': return '#5cb85c';
      case 'ปานกลาง': return '#ffc107';
      case 'อ่อน': return '#ff9800';
      case 'แย่': return '#dc3545';
      default: return '#6c757d';
    }
  };

  // เพิ่มฟังก์ชันบันทึกพิกัดลงฐานข้อมูล
  const saveCoordinates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/save-coordinates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: manualCoordinates.latitude,
          longitude: manualCoordinates.longitude,
          name: manualCoordinates.locationName,
          category: 'อาคารเรียน'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (result.success) {
        setExportMessage('บันทึกพิกัดสำเร็จ');
        // วิเคราะห์ข้อมูลใหม่หลังจากบันทึกพิกัด
        analyzeLoraSignals();
        // รีเซ็ตชื่อสถานที่
        setManualCoordinates({...manualCoordinates, locationName: ''});
      } else {
        setExportMessage(`บันทึกพิกัดล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving coordinates:', error);
      setExportMessage(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันสำหรับการแสดงชื่อสถานที่
  const getLocationName = (item) => {
    if (!item) return '-';
    
    // 1. ถ้ามีข้อมูล nearestPOI ให้ใช้ชื่อจากนั้น
    if (item.nearestPOI && item.nearestPOI.name) {
      return item.nearestPOI.name;
    }
    
    // 2. ถ้ามีชื่อสถานที่ใน locationName ที่ไม่ใช่พิกัด ให้ใช้ชื่อนั้น
    if (item.locationName && (!item.locationName.includes('พิกัด'))) {
      return item.locationName;
    }
    
    // 3. ถ้ามีชื่อใน additionalInfo
    if (item.additionalInfo && item.additionalInfo.name && 
        !item.additionalInfo.name.startsWith('พิกัด ')) {
      return item.additionalInfo.name;
    }

    // 4. ถ้ามี buildingName หรือข้อมูล category
    if (item.additionalInfo) {
      if (item.additionalInfo.buildingName) {
        return item.additionalInfo.buildingName;
      }
      if (item.additionalInfo.category === 'building') {
        return 'อาคารเรียน';
      }
    }

    // 5. ตรวจสอบว่ามีข้อมูลพิกัด - เทียบกับฐานข้อมูลสถานที่
    if (item.location && item.location.coordinates && Array.isArray(item.location.coordinates) && 
        item.location.coordinates.length >= 2) {
      
      // ระวัง: พิกัดใน MongoDB จัดเก็บในรูปแบบ [longitude, latitude]
      const lng = item.location.coordinates[0];
      const lat = item.location.coordinates[1];
      
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
        return 'พิกัดไม่ถูกต้อง';
      }
      
      // ข้อมูลสถานที่จาก add-locations.js
      const knownLocations = [
        { name: "อาคารคณะวิทยาศาสตร์", lat: 9.085161175082991, lng: 99.36680712084552 },
        { name: "อาคารคณะครุศาสตร์", lat: 9.081924936641594, lng: 99.36614710125723 },
        { name: "โรงอาหาร", lat: 9.085422144376798, lng: 99.36151359799585 },
        { name: "หอสมุด", lat: 9.083974775846071, lng: 99.36067355365874 },
        { name: "สนามกีฬา", lat: 9.080826775139359, lng: 99.3648378021075 },
        { name: "อาคารบริหาร", lat: 9.077477135520846, lng: 99.362408737303 },
        { name: "ที่จอดรถหน้ามหาวิทยาลัย", lat: 9.07940, lng: 99.36470 },
        { name: "อาคารเรียนรวม 1", lat: 9.07640, lng: 99.36250 },
        { name: "วงเวียนหน้ามอ", lat: 9.080019, lng: 99.363782 },
        { name: "อาคารเฉลิมพระเกียรติ 80 พรรษา", lat: 9.078802, lng: 99.362825 },
        { name: "สํานักงานจัดการทรัพย์สิน", lat: 9.079612, lng: 99.363887 },
        { name: "ตึกคณะพยาบาล", lat: 9.080661, lng: 99.363973 },
        { name: "คณะมนุษยศาสตร์และสังคมศาสตร์", lat: 9.082669, lng: 99.364251 },
        { name: "ลานกิจกรรม", lat: 9.083283, lng: 99.364461 },
        { name: "ตึกทีปังกอนรัศมีโชติ", lat: 9.083262, lng: 99.366150 },
        { name: "ตึกเทคโนโลยีการประมง", lat: 9.083069, lng: 99.366110 },
        { name: "ตึกสุนทรียศาสตร์", lat: 9.088062, lng: 99.363297 },
        { name: "อาคารวิทยาศาสตร์สุขภาพ", lat: 9.085271, lng: 99.363621 },
        { name: "ตลาดนัด", lat: 9.083774526467632, lng: 99.36186169383151 },
        { name: "เคาน์เตอร์ไปรษณีย์", lat: 9.082463481806721, lng: 99.36215137240207 },
        { name: "สถาบันวิจัยและพัฒนา", lat: 9.081888739499783, lng: 99.3626341700132 },
        { name: "วิทยาลัยนานาชาติการท่องเที่ยว", lat: 9.081915225337232, lng: 99.36407451623151 },
        { name: "SRU Car Care", lat: 9.081009408475765, lng: 99.36578040116493 },
        { name: "อาคารปฏิบัติการเทคโนโลยีอุตสาหกรรม", lat: 9.081453047130365, lng: 99.36587360792352 },
        { name: "Choux B Do", lat: 9.081680590833841, lng: 99.36630309657659 },
        { name: "ศูนย์การเรียนรู้การจัดการขยะ", lat: 9.085692566090945, lng: 99.36143593411308 },
        { name: "แปลงฝึกนวัตกรรมการเกษตร", lat: 9.085952124490847, lng: 99.36163575868449 },
        { name: "ลานจอดรถบัณฑิต", lat: 9.08689858260727, lng: 99.36235523548349 },
        { name: "คณะวิทยาการจัดการ", lat: 9.085945104371051, lng: 99.36311698289738 }
      ];

      // ฟังก์ชันคำนวณระยะห่างระหว่างพิกัดโดยใช้ Haversine formula
      const haversineDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371000; // ค่ารัศมีโลก (เมตร)
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
          Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // ระยะทางในเมตร
      };

      // หาสถานที่ที่มีพิกัดใกล้เคียงมากที่สุดและคำนวณระยะทางแบบ Haversine
      let closestLocation = null;
      let minDistance = Number.MAX_VALUE;
      
      for (const location of knownLocations) {
        const distance = haversineDistance(lat, lng, location.lat, location.lng);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestLocation = location;
        }
      }
      
      // ถ้าพิกัดห่างจากจุดที่รู้จักไม่เกิน 100 เมตร
      if (closestLocation && minDistance < 100) {
        console.log(`Found location: ${closestLocation.name} at distance ${minDistance.toFixed(2)} meters`);
        return closestLocation.name;
      }
      
      // ถ้าไม่ตรงกับพิกัดที่กำหนด แต่อยู่ในขอบเขตมหาวิทยาลัย
      if (lat > 9.075 && lat < 9.090 && lng > 99.35 && lng < 99.38) {
        return "พื้นที่ภายในมหาวิทยาลัยราชภัฏสุราษฎร์ธานี";
      }

      // กรณีทั่วไป ให้แสดงเป็นชื่อสถานที่
      return `สถานที่ทดสอบ (${lat.toFixed(6)}, ${lng.toFixed(6)})`;
    }
    
    // กรณีไม่มีข้อมูลพิกัด
    return 'ไม่มีข้อมูลสถานที่';
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>ข้อมูลสัญญาณ LoRa</h1>
        <p>ข้อมูลสัญญาณ LoRa จากตำแหน่งในฐานข้อมูล MongoDB</p>
        
        {/* เพิ่มส่วนข้อมูลจุดรับสัญญาณและสถานที่ทดลอง */}
        <div className="signal-info-section" style={{ 
          background: 'white', 
          padding: '15px', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginTop: '15px',
          marginBottom: '20px'
        }}>
          <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>ข้อมูลการทดลอง</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <h4 style={{ color: '#007bff' }}>จุดรับสัญญาณ (Receiver)</h4>
              <p><strong>ตึกวิทยาศาสตร์ (ชั้น 11)</strong> มหาวิทยาลัยราชภัฏสุราษฎร์ธานี</p>
              <p>พิกัด: 9.085311643852359, 99.36704889656512</p>
            </div>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <h4 style={{ color: '#007bff' }}>สถานที่ทดลอง (จุดส่งสัญญาณ)</h4>
              <p>อาคารและสถานที่ต่างๆ ภายในมหาวิทยาลัย จำนวน {signalData.length} แห่ง</p>
              <p>เช่น: อาคารคณะวิทยาศาสตร์, อาคารคณะครุศาสตร์, โรงอาหาร, หอสมุด, สนามกีฬา</p>
              <p><small>*ความแรงสัญญาณคำนวณจากระยะทางระหว่างจุดรับสัญญาณและจุดส่งสัญญาณด้วยสูตร Haversine</small></p>
            </div>
          </div>
        </div>
      </div>

      {/* เพิ่มฟอร์มบันทึกพิกัด */}
      <div className="coordinates-form" style={{
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>บันทึกพิกัด</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div>
            <label htmlFor="locationName" style={{ display: 'block', marginBottom: '5px' }}>ชื่อสถานที่:</label>
            <input
              id="locationName"
              type="text"
              value={manualCoordinates.locationName}
              onChange={(e) => setManualCoordinates({...manualCoordinates, locationName: e.target.value})}
              placeholder="ระบุชื่อสถานที่ (ถ้ามี)"
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                width: '220px'
              }}
            />
          </div>
          <div>
            <label htmlFor="latitude" style={{ display: 'block', marginBottom: '5px' }}>Latitude:</label>
            <input
              id="latitude"
              type="number"
              step="0.000001"
              value={manualCoordinates.latitude}
              onChange={(e) => setManualCoordinates({...manualCoordinates, latitude: parseFloat(e.target.value)})}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                width: '180px'
              }}
            />
          </div>
          <div>
            <label htmlFor="longitude" style={{ display: 'block', marginBottom: '5px' }}>Longitude:</label>
            <input
              id="longitude"
              type="number"
              step="0.000001"
              value={manualCoordinates.longitude}
              onChange={(e) => setManualCoordinates({...manualCoordinates, longitude: parseFloat(e.target.value)})}
              style={{
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                width: '180px'
              }}
            />
          </div>
          <button
            onClick={saveCoordinates}
            disabled={isLoading}
            style={{
              padding: '10px 15px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              height: '38px'
            }}
          >
            บันทึกพิกัด
          </button>
        </div>
      </div>

      <div className="action-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={fetchLoraSignals} 
          disabled={isLoading}
          className="btn btn-primary"
          style={{
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <span className="btn-icon">🔄</span> ดึงข้อมูลล่าสุด
        </button>
        <button 
          onClick={analyzeLoraSignals} 
          disabled={isLoading}
          className="btn btn-success"
          style={{
            padding: '10px 15px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <span className="btn-icon">📊</span> วิเคราะห์ข้อมูล
        </button>
        <button 
          onClick={exportToExcel} 
          disabled={exportLoading || signalData.length === 0}
          className="btn btn-info"
          style={{
            padding: '10px 15px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          <span className="btn-icon">📥</span> ส่งออก Excel
        </button>
      </div>

      {isLoading && (
        <div className="loading" style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            margin: '0 auto',
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderLeft: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      )}

      {exportMessage && (
        <div className="alert" style={{
          padding: '10px 15px',
          marginBottom: '20px',
          backgroundColor: exportMessage.includes('สำเร็จ') ? '#d4edda' : '#f8d7da',
          color: exportMessage.includes('สำเร็จ') ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          {exportMessage}
        </div>
      )}

      {/* แสดงการวิเคราะห์ */}
      {analysis && (
        <div className="analysis-section" style={{
          marginBottom: '30px',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '10px' }}>สรุปการวิเคราะห์</h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: '1', minWidth: '200px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>ข้อมูลทั้งหมด</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{analysis.totalSignals} รายการ</p>
            </div>
            
            <div style={{ flex: '1', minWidth: '200px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>ความแรงสัญญาณเฉลี่ย</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{analysis.avgSignalStrength.toFixed(2)} dBm</p>
            </div>
            
            <div style={{ flex: '1', minWidth: '200px', backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>ระยะทางเฉลี่ย</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '0' }}>{analysis.avgDistance.toFixed(0)} เมตร</p>
            </div>
          </div>
          
          {/* แสดงการกระจายตัวของคุณภาพสัญญาณ */}
          <div style={{ marginBottom: '30px' }}>
            <h3>การกระจายตัวของคุณภาพสัญญาณ</h3>
            <div style={{ display: 'flex', height: '40px', borderRadius: '4px', overflow: 'hidden', marginTop: '10px' }}>
              {['ดีมาก', 'ดี', 'ปานกลาง', 'อ่อน', 'แย่'].map(quality => {
                const count = analysis.qualityCount[quality] || 0;
                const percentage = (count / analysis.totalSignals) * 100;
                return (
                  <div 
                    key={quality}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getSignalQualityColor(quality),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: percentage > 10 ? '14px' : '0'
                    }}
                  >
                    {percentage > 10 ? `${percentage.toFixed(1)}%` : ''}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '10px' }}>
              {['ดีมาก', 'ดี', 'ปานกลาง', 'อ่อน', 'แย่'].map(quality => (
                <div key={quality} style={{ display: 'flex', alignItems: 'center', marginRight: '20px', marginBottom: '5px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: getSignalQualityColor(quality), marginRight: '5px', borderRadius: '2px' }}></div>
                  <span>{quality}: {analysis.qualityCount[quality] || 0} รายการ ({((analysis.qualityCount[quality] || 0) / analysis.totalSignals * 100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* แสดงการวิเคราะห์ตามสถานที่ */}
          <div>
            <h3>การวิเคราะห์ตามสถานที่ (10 อันดับแรก)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'left' }}>สถานที่</th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>จำนวนข้อมูล</th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>ความแรงสัญญาณเฉลี่ย (dBm)</th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>ระยะทางเฉลี่ย (เมตร)</th>
                    <th style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>คุณภาพสัญญาณ</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.locations.map((location, index) => (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{location.name}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{location.count}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{location.avgSignalStrength.toFixed(2)}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6', textAlign: 'center' }}>{location.avgDistance.toFixed(0)}</td>
                      <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                        <div style={{ display: 'flex', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
                          {['ดีมาก', 'ดี', 'ปานกลาง', 'อ่อน', 'แย่'].map(quality => {
                            const count = location.qualities[quality] || 0;
                            const percentage = (count / location.count) * 100;
                            return (
                              <div 
                                key={quality}
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: getSignalQualityColor(quality),
                                  height: '100%'
                                }}
                              />
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* แสดงตารางข้อมูล */}
      <div className="data-table">
        <h2>ข้อมูลสัญญาณ LoRa</h2>
        {signalData.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>ลำดับ</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>วันที่/เวลา</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>สถานที่</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>ความแรงสัญญาณ (dBm)</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>คุณภาพสัญญาณ</th>
                  <th style={{ padding: '10px', border: '1px solid #dee2e6' }}>ระยะทาง (เมตร)</th>
                </tr>
              </thead>
              <tbody>
                {signalData.map((item, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{index + 1}</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      {new Date(item.timestamp).toLocaleDateString('th-TH')} {new Date(item.timestamp).toLocaleTimeString('th-TH')}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.locationName}</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.signalStrength}</td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: getSignalQualityColor(item.signalQuality),
                        color: 'white'
                      }}>
                        {item.signalQuality}
                      </span>
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #dee2e6' }}>{item.distanceMeters}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data" style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <p>ไม่พบข้อมูลสัญญาณ LoRa</p>
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoraSignalDisplay; 