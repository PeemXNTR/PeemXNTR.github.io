import React, { useEffect, useState, useRef } from 'react';

const LongdoMap = ({ latitude, longitude, locationHistory = [] }) => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [autoFollow, setAutoFollow] = useState(true);
  const mapRef = useRef(null);
  const lastCoordsRef = useRef({ lat: null, lon: null });
  const apiLoadedRef = useRef(false);
  
  // ไอคอนสำหรับตำแหน่งปัจจุบัน (รถยนต์)
  const carIcon = "https://cdn-icons-png.flaticon.com/512/3097/3097144.png";
  // ไอคอนเดิม (สำรอง)
  const customPinIcon = "https://demo.lamar.in.th/uploads/1740492075764.png";

  // โหลด Longdo Map API
  useEffect(() => {
    const loadLongdoMap = () => {
      console.log('API Key:', process.env.REACT_APP_LONGDO_MAP_KEY);
      if (typeof window !== 'undefined' && !window.longdo && !apiLoadedRef.current) {
        apiLoadedRef.current = true;
        
        return new Promise((resolve, reject) => {
          window.longdoMapCallback = () => {
            console.log('Longdo Map API loaded successfully');
            resolve();
          };
          
          try {
            // ตรวจสอบก่อนว่ามีสคริปต์นี้อยู่แล้วหรือไม่
            const existingScript = document.querySelector(`script[src*="api.longdo.com/map"]`);
            if (existingScript) {
              console.log('Longdo Map script already exists');
              setTimeout(resolve, 1000); // ให้เวลา API โหลดเสร็จ
              return;
            }
            
            const script = document.createElement('script');
            script.src = `https://api.longdo.com/map/?key=${process.env.REACT_APP_LONGDO_MAP_KEY}`;
            script.async = true;
            script.defer = true;
            script.id = 'longdo-map-script';
            script.onerror = (error) => {
              console.error('Error loading Longdo Map API:', error);
              reject(error);
            };
            document.head.appendChild(script);
          } catch (error) {
            console.error('Error creating/appending script:', error);
            reject(error);
          }
        });
      }
      return Promise.resolve();
    };

    const initializeMap = async () => {
      try {
        await loadLongdoMap();
        
        // ตรวจสอบว่า ref และ API พร้อมใช้งาน
        if (!mapRef.current) {
          console.warn('Map container not found in DOM');
          return;
        }
        
        if (!window.longdo) {
          console.warn('Longdo Map API not loaded yet');
          return;
        }
        
        if (!map) {
          // ตรวจสอบว่า DOM node ยังอยู่ในเอกสาร
          if (!document.body.contains(mapRef.current)) {
            console.warn('Map container is not in document anymore');
            return;
          }
          
          const mapInstance = new window.longdo.Map({
            placeholder: mapRef.current,
            zoom: 15,
            location: { 
              lat: parseFloat(latitude) || 9.083524, 
              lon: parseFloat(longitude) || 99.364293 
            }
          });
          setMap(mapInstance);
          console.log('Map initialized with location:', {
            lat: parseFloat(latitude) || 9.083524,
            lon: parseFloat(longitude) || 99.364293
          });
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();
    
    return () => {
      // ทำความสะอาดเมื่อ component ถูกถอดออก
      if (typeof window !== 'undefined') {
        if (window.longdoMapCallback) {
          delete window.longdoMapCallback;
        }
        // ลบ script tag ถ้ามี
        const scriptTag = document.querySelector('script[src*="api.longdo.com/map"]');
        if (scriptTag) {
          scriptTag.remove();
        }
      }
    };
  }, []);

  // อัพเดทตำแหน่ง
  useEffect(() => {
    if (!map || !latitude || !longitude) return;

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    
    // ตรวจสอบว่าพิกัดมีการเปลี่ยนแปลงหรือไม่
    const coordsChanged = lat !== lastCoordsRef.current.lat || lon !== lastCoordsRef.current.lon;
    
    if (coordsChanged) {
      try {
        // ลบ marker เก่าและสร้าง marker ใหม่
        const currentMarkers = [...markers];
        currentMarkers.forEach(m => {
          if (m.isCurrentPosition && map.Overlays) {
            map.Overlays.remove(m.marker);
          }
        });
        
        // สร้าง marker ใหม่
        const markerOptions = {
          title: 'ตำแหน่งปัจจุบัน',
          detail: `อัพเดทล่าสุด: ${new Date().toLocaleTimeString()}`,
          popup: { detail: true, title: true }
        };
        
        // ใช้ไอคอนรถยนต์สำหรับตำแหน่งปัจจุบัน
        markerOptions.icon = {
          url: carIcon,
          offset: { x: 16, y: 16 },
          size: { width: 32, height: 32 }
        };
        
        const carMarker = new window.longdo.Marker({ lon, lat }, markerOptions);
        
        if (map.Overlays) {
          map.Overlays.add(carMarker);
          setMarkers(prev => [...prev.filter(m => !m.isCurrentPosition), { marker: carMarker, isCurrentPosition: true }]);
        }

        // เลื่อนแผนที่ตามรถเฉพาะเมื่ออยู่ในโหมดติดตามอัตโนมัติ
        if (autoFollow) {
          map.location({ lon, lat }, true);
        }

        // อัพเดต reference ของพิกัดล่าสุด
        lastCoordsRef.current = { lat, lon };
        
        console.log(`Updated position: ${lat}, ${lon}`);
      } catch (error) {
        console.error("Error updating position:", error);
      }
    }
  }, [map, latitude, longitude, markers, autoFollow]);

  // ฟังก์ชันสำหรับเลื่อนไปยังตำแหน่งปัจจุบัน
  const moveToCurrentPosition = () => {
    if (map && latitude && longitude) {
      map.location({ lon: parseFloat(longitude), lat: parseFloat(latitude) }, true);
      map.zoom(16, true);
      setAutoFollow(true);
    }
  };

  // ฟังก์ชันสลับโหมดติดตามอัตโนมัติ
  const toggleAutoFollow = () => {
    setAutoFollow(prev => !prev);
  };

  // ใส่อีเวนต์ listener เพื่อปิดโหมดติดตามอัตโนมัติเมื่อผู้ใช้เลื่อนแผนที่เอง
  useEffect(() => {
    if (map && window.longdo) {
      const handleMapInteraction = () => {
        if (autoFollow) {
          setAutoFollow(false);
        }
      };
      
      try {
        // เพิ่ม event listener สำหรับการเลื่อนแผนที่
        map.Event.bind('dragstart', handleMapInteraction);
        
        return () => {
          // นำ event listener ออกเมื่อ component unmount
          map.Event.unbind('dragstart', handleMapInteraction);
        };
      } catch (error) {
        console.error("Error binding map event:", error);
      }
    }
  }, [map, autoFollow]);

  return (
    <div>
      <div 
        ref={mapRef} 
        id="longdo-map" 
        style={{ width: '100%', height: '400px', borderRadius: '8px' }}>
      </div>
      
      <div className="map-controls" style={{ 
        marginTop: '10px', 
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <button 
          onClick={moveToCurrentPosition}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            backgroundColor: '#4C6FFF',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px'
          }}
        >
          <span style={{ marginRight: '5px' }}>&#x1F50E;</span> 
          ไปยังตำแหน่งปัจจุบัน
        </button>
        
        <button 
          onClick={toggleAutoFollow}
          style={{
            padding: '8px 12px',
            borderRadius: '4px',
            backgroundColor: autoFollow ? '#4CAF50' : '#9E9E9E',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            fontSize: '14px'
          }}
        >
          {autoFollow ? '✓ ติดตามอัตโนมัติ' : '× ติดตามอัตโนมัติ'}
        </button>
      </div>
      
      <div className="map-info-container" style={{ marginTop: '10px' }}>
        <div className="map-legend">
          <div className="map-legend-item">
            <span style={{ 
              display: 'inline-block', 
              width: '20px', 
              height: '20px', 
              marginRight: '8px',
              background: `url(${carIcon}) no-repeat`,
              backgroundSize: 'contain'
            }}></span>
            <span>ตำแหน่งปัจจุบัน (รถยนต์)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LongdoMap;