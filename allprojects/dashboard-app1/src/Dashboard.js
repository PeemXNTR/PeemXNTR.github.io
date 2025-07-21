import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import LongdoMap from './LongdoMap';
import mqtt from 'mqtt';
import * as XLSX from 'xlsx';

const Dashboard = () => {
  const [mqttClient, setMqttClient] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('เชื่อมต่อ...');
  const [messages, setMessages] = useState([]);
  const [locationData, setLocationData] = useState({
    latitude: '',
    longitude: '',
    lastUpdate: '',
    rawMessage: '',
    additionalInfo: {}
  });
  const [locationHistory, setLocationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [lightState, setLightState] = useState(false);
  const [callVehicleState, setCallVehicleState] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [speedData, setSpeedData] = useState({
    currentSpeed: 0,
    maxSpeed: 0
  });
  const [fuelData, setFuelData] = useState({
    currentLevel: 0,
    maxCapacity: 0,
    consumption: 0
  });
  // เพิ่ม state สำหรับเก็บข้อมูลสถานที่ใกล้เคียง
  const [nearbyPOIs, setNearbyPOIs] = useState([]);
  const [nextDestination, setNextDestination] = useState(null);
  const [loadingPOIs, setLoadingPOIs] = useState(false);
  
  // เพิ่มตัวแปรเพื่อติดตามข้อความล่าสุดที่ได้รับและประมวลผลแล้ว
  const [lastProcessedMessageId, setLastProcessedMessageId] = useState('');

  // เพิ่มในส่วน state ของ Dashboard.js
  const [alertMessage, setAlertMessage] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);

  // เพิ่ม responsive listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleCallVehicle = () => {
    if (mqttClient) {
      const newState = !callVehicleState;
      const controlMessage = {
        X: newState ? "ON" : "OFF",
        messageId: `alert_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      mqttClient.publish('@msg/gps', JSON.stringify(controlMessage));
      setCallVehicleState(newState);
      
      if (newState) {
        setAlertMessage('ส่งคำสั่งเรียกรถแล้ว กำลังรอการตอบรับ...');
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 5000);
      }
    }
  };

  // ฟังก์ชันสำหรับดึงข้อมูลสถานที่ใกล้เคียง
  const fetchNearbyPOIs = async (latitude, longitude) => {
    if (!latitude || !longitude) return;
    
    setLoadingPOIs(true);
    try {
      const response = await fetch(`http://localhost:5000/api/poi/near?lat=${latitude}&lng=${longitude}&maxDistance=1000&limit=5`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Nearby POIs:', result);
      
      if (result.data && Array.isArray(result.data)) {
        setNearbyPOIs(result.data);
        
        // ถ้ามีสถานที่ใกล้เคียงอย่างน้อยหนึ่งแห่ง ให้ถือว่าเป็นสถานที่ที่กำลังจะถึงถัดไป
        if (result.data.length > 0) {
          setNextDestination(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching nearby POIs:', error);
    } finally {
      setLoadingPOIs(false);
    }
  };
  
  // ฟังก์ชันสำหรับดึงข้อมูลสถานที่ที่กำลังจะถึงถัดไป
  const fetchNextDestination = async (latitude, longitude, speed) => {
    if (!latitude || !longitude) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/poi/next-destination?lat=${latitude}&lng=${longitude}&speed=${speed || 0}&maxResults=3`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Next Destinations:', result);
      
      if (result.data && Array.isArray(result.data) && result.data.length > 0) {
        setNextDestination(result.data[0]); // สถานที่ที่ใกล้ที่สุดคือสถานที่ที่จะถึงถัดไป
        setNearbyPOIs(result.data); // เก็บสถานที่ทั้งหมดที่อยู่ใกล้เคียง
      }
    } catch (error) {
      console.error('Error fetching next destination:', error);
    }
  };

  const selectLocationFromHistory = (location) => {
    setSelectedLocation(location);
    // เมื่อเลือกตำแหน่งบนมือถือ ให้เลื่อนไปที่ map section
    if (isMobile) {
      document.querySelector('.map-section').scrollIntoView({ behavior: 'smooth' });
    }
  };

  const extractLocationData = (data) => {
    try {
      // กรณีที่ข้อมูลมาในรูปแบบ JSON เต็ม
      let latitude, longitude, speed, altitude, satellites, timestamp, heading, accuracy;
      
      // ตรวจสอบรูปแบบของ JSON ที่ได้รับ
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          console.warn("Cannot parse string data:", e);
        }
      }
      
      // สำหรับข้อมูลที่มาในรูปแบบที่เห็นในภาพหน้าจอ
      if (data.latitude !== undefined && data.longitude !== undefined) {
        latitude = data.latitude;
        longitude = data.longitude;
        speed = data.speed || 0;
        altitude = data.altitude || 0;
        satellites = data.satellites || 0;
        timestamp = data.timestamp || new Date().toLocaleTimeString();
        heading = data.heading || data.direction || data.dir || 0;
        accuracy = data.accuracy || data.acc || 0;
      } 
      // รูปแบบอื่นๆที่อาจเจอ
      else if (data.lat !== undefined && (data.lon !== undefined || data.lng !== undefined)) {
        latitude = data.lat;
        longitude = data.lon || data.lng;
        speed = data.spd || data.speed || 0;
        altitude = data.alt || data.altitude || 0;
        satellites = data.sat || data.satellites || 0;
        timestamp = data.time || data.timestamp || new Date().toLocaleTimeString();
        heading = data.heading || data.direction || data.dir || 0;
        accuracy = data.accuracy || data.acc || 0;
      }
      
      // เพิ่มเงื่อนไขตรวจสอบว่าพิกัดต้องไม่เป็นค่าว่างและไม่เป็น (0,0)
      if (latitude !== undefined && longitude !== undefined && 
          latitude !== null && longitude !== null && 
          !(latitude === 0 && longitude === 0)) {
        // แสดง log เพื่อตรวจสอบข้อมูล
        console.log("พิกัดที่ประมวลผลได้:", { latitude, longitude, speed, altitude, satellites });
        
        // เก็บข้อมูลเพิ่มเติมทั้งหมด
        const additionalInfo = { ...data };
        
        // เพิ่มข้อมูลสำคัญที่อาจซ่อนอยู่ในข้อมูลเพิ่มเติม
        if (data.gps) {
          if (!speed && data.gps.speed) speed = data.gps.speed;
          if (!altitude && data.gps.altitude) altitude = data.gps.altitude;
          if (!satellites && data.gps.satellites) satellites = data.gps.satellites;
          if (!heading && data.gps.heading) heading = data.gps.heading;
          if (!accuracy && data.gps.accuracy) accuracy = data.gps.accuracy;
        }
        
        // ลบข้อมูลหลักออกจาก additionalInfo
        delete additionalInfo.latitude;
        delete additionalInfo.longitude;
        delete additionalInfo.lat;
        delete additionalInfo.lng;
        delete additionalInfo.lon;
        delete additionalInfo.speed;
        delete additionalInfo.spd;
        delete additionalInfo.altitude;
        delete additionalInfo.alt;
        delete additionalInfo.satellites;
        delete additionalInfo.sat;
        delete additionalInfo.timestamp;
        delete additionalInfo.time;
        delete additionalInfo.heading;
        delete additionalInfo.direction;
        delete additionalInfo.dir;
        delete additionalInfo.accuracy;
        delete additionalInfo.acc;
        delete additionalInfo.battery;
        delete additionalInfo.batt;
        
        // เพิ่มข้อมูลที่จำเป็นอย่างชัดเจน
        additionalInfo.speed = speed;
        additionalInfo.altitude = altitude;
        additionalInfo.satellites = satellites;
        additionalInfo.heading = heading;
        additionalInfo.accuracy = accuracy;
        
        // อัพเดทค่าความเร็วถ้ามี
        if (speed !== undefined) {
          const currentSpeed = parseFloat(speed);
          if (!isNaN(currentSpeed)) {
            setSpeedData(prev => ({
              currentSpeed: currentSpeed,
              maxSpeed: Math.max(prev.maxSpeed, currentSpeed)
            }));
          }
        }
        
        return {
          latitude,
          longitude,
          timestamp: typeof timestamp === 'string' ? timestamp : new Date().toLocaleTimeString(),
          additionalInfo
        };
      } else {
        console.log("ข้อมูลพิกัดไม่ถูกต้องหรือเป็นค่า (0,0) ข้าม:", { latitude, longitude });
        return null;
      }
    } catch (error) {
      console.error('Error extracting location data:', error);
    }
    
    return null;
  };

  useEffect(() => {
    let client = null;
    let reconnectTimer = null;
    let connectionAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 10;
    const RECONNECT_DELAY_MS = 3000;
    
    const connectMQTT = () => {
      // ยกเลิก timer เดิมถ้ามี
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // ถ้ามีการเชื่อมต่ออยู่แล้ว ไม่ต้องเชื่อมต่อใหม่
      if (client && client.connected) {
        console.log('MQTT already connected, skipping reconnect');
        return;
      }
      
      // เช็คจำนวนครั้งที่พยายามเชื่อมต่อใหม่
      if (connectionAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.log(`เกินจำนวนครั้งที่กำหนด (${MAX_RECONNECT_ATTEMPTS} ครั้ง) หยุดการเชื่อมต่อชั่วคราว`);
        setConnectionStatus('การเชื่อมต่อล้มเหลว - ลองรีเฟรชหน้า');
        return;
      }
      
      connectionAttempts++;
      
      // แสดงสถานะเชื่อมต่อ
      setConnectionStatus(`กำลังเชื่อมต่อ... (${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      
      // กำหนดค่า MQTT options
      const mqttOptions = {
        clientId: 'd6203c4f-e207-44bf-86fb-1f60817e290c', // ใช้ Client ID ตามที่กำหนดในระบบ
        username: 'TLFnUd73QQUNNzT9SmZUVDprTvdaTyPX', // Token
        password: 'tEG4YtR3HG2XYk6fKdZJnbF3ADnxRq1Q', // Secret
        clean: true,
        reconnectPeriod: 0, // ปิดการ reconnect อัตโนมัติ เราจะจัดการเอง
        connectTimeout: 10000, // ลดเวลา timeout ลง
        keepalive: 30,
        protocolVersion: 4,
        rejectUnauthorized: false
      };
      
      try {
        // ถ้ามี client เดิมอยู่ ให้ทำลายทิ้ง
        if (client) {
          try {
            client.end(true);
          } catch (err) {
            console.warn("Error ending previous client:", err);
          }
        }
        
        console.log("กำลังเชื่อมต่อ MQTT broker...");
        client = mqtt.connect('wss://broker.netpie.io:443/mqtt', mqttOptions);
        
        client.on('connect', () => {
          console.log('Connected to MQTT broker');
          setConnectionStatus('เชื่อมต่อสำเร็จ');
          connectionAttempts = 0; // รีเซ็ตตัวนับ
          
          // คาดว่าเชื่อมต่อสำเร็จแล้ว ลอง subscribe
          try {
            client.subscribe('@msg/gps', { qos: 0 }, (err) => {
              if (err) {
                console.error('Subscribe error:', err);
              } else {
                console.log('Subscribed to @msg/gps');
              }
            });
          } catch (subErr) {
            console.error("Error during subscribe:", subErr);
          }
        });

        client.on('message', async (topic, message) => {
          console.log('Received message from', topic);
          
          try {
            let data;
            const rawMessage = message.toString();
            
            try {
              data = JSON.parse(rawMessage);
            } catch (parseErr) {
              console.error('Error parsing message:', parseErr, 'Raw message:', rawMessage);
              return;
            }
            
            // สร้าง message ID ถ้าไม่มี
            const messageId = data.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            // ตรวจสอบว่าเป็นข้อความที่เคยประมวลผลแล้วหรือไม่
            if (messageId === lastProcessedMessageId) {
              console.log('ข้อความซ้ำ ข้าม:', messageId);
              return;
            }
            
            // บันทึกข้อความที่ได้รับไว้ก่อน
            setMessages(prev => [...prev, {
              type: 'received',
              time: new Date().toLocaleTimeString(),
              topic: topic,
              content: rawMessage
            }]);
            
            // Handle simple X value for light control
            if (data.X !== undefined) {
              setLightState(data.X === "เปิด");
              setCallVehicleState(data.X === "เปิด");
            }
            
            // Handle location data if present
            const locationInfo = extractLocationData(data);
            if (locationInfo) {
              console.log("พบข้อมูลตำแหน่ง:", locationInfo);
              
              // อัปเดต message ID ล่าสุดที่ประมวลผล
              setLastProcessedMessageId(messageId);
              
              // บันทึกข้อมูลลง MongoDB ถ้ามีข้อมูลพิกัดที่ถูกต้อง
              try {
                await saveLocation(
                  locationInfo.latitude,
                  locationInfo.longitude,
                  locationInfo.additionalInfo
                );
              } catch (error) {
                console.warn('Failed to save location, but continuing:', error);
              }
              
              // อัพเดท state
              setLocationData({
                latitude: locationInfo.latitude,
                longitude: locationInfo.longitude,
                lastUpdate: locationInfo.timestamp,
                additionalInfo: locationInfo.additionalInfo,
                rawMessage: rawMessage
              });
              
              setLocationHistory(prev => [...prev, locationInfo]);
              
              // ส่งการตอบรับกลับ
              try {
                const ackMessage = {
                  messageId: data.messageId || `ack_${Date.now()}`,
                  received: true,
                  timestamp: new Date().toISOString()
                };
                client.publish('@msg/gps', JSON.stringify(ackMessage), { qos: 0 });
              } catch (pubErr) {
                console.error("Error publishing ACK:", pubErr);
              }
            }

            // Handle alert response from driver
            if (data.alertResponse !== undefined) {
              console.log("ได้รับการตอบรับจากคนขับ:", data);
              
              setAlertMessage(`คนขับตอบรับการแจ้งเตือนแล้ว: ${data.action || 'ปิดการแจ้งเตือน'}`);
              setAlertVisible(true);
              setTimeout(() => setAlertVisible(false), 5000);
              
              // ปรับสถานะปุ่มเรียกรถให้กลับเป็นปกติ
              setCallVehicleState(false);
            }
          } catch (error) {
            console.error('Error processing message:', error);
          }
        });

        client.on('error', (err) => {
          console.error('MQTT Error:', err);
          setConnectionStatus('การเชื่อมต่อล้มเหลว');
          
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectMQTT, RECONNECT_DELAY_MS);
        });
        
        client.on('close', () => {
          console.log('MQTT connection closed');
          setConnectionStatus('การเชื่อมต่อถูกปิด');
          
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectMQTT, RECONNECT_DELAY_MS);
        });
        
        client.on('offline', () => {
          console.log('MQTT client is offline');
          setConnectionStatus('ออฟไลน์');
          
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(connectMQTT, RECONNECT_DELAY_MS);
        });
        
        client.on('reconnect', () => {
          console.log('MQTT client attempting to reconnect');
          setConnectionStatus('กำลังเชื่อมต่อใหม่...');
        });
        
        client.on('disconnect', (packet) => {
          console.log('MQTT server requested disconnect', packet);
          setConnectionStatus('เซิร์ฟเวอร์ปลดการเชื่อมต่อ');
        });

        setMqttClient(client);
      } catch (connectErr) {
        console.error("Error creating MQTT client:", connectErr);
        setConnectionStatus('การเชื่อมต่อล้มเหลว (ข้อผิดพลาดร้ายแรง)');
        
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectMQTT, RECONNECT_DELAY_MS);
      }
    };
    
    // เริ่มการเชื่อมต่อ
    connectMQTT();

    return () => {
      if (client) {
        try {
          // ตั้งค่า flag เพื่อให้รู้ว่ากำลังปิดการเชื่อมต่ออย่างตั้งใจ
          client.options.shouldReconnect = false;
          
          // ยกเลิกการ subscribe
          if (client.connected) {
            client.unsubscribe('@msg/gps', (err) => {
              if (err) {
                console.error('Error unsubscribing:', err);
              } else {
                console.log('Unsubscribed from @msg/gps');
              }
            });
          }
          
          client.end(true);
          console.log('MQTT client closed by cleanup');
        } catch (err) {
          console.warn("Error ending MQTT client during cleanup:", err);
        }
      }
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, []);

  useEffect(() => {
    const extractLocationsFromMessages = () => {
      const locations = [];
      messages.forEach(msg => {
        try {
          const data = JSON.parse(msg.content);
          const locationInfo = extractLocationData(data);
          if (locationInfo) {
            locations.push({
              ...locationInfo,
              rawMessage: msg.content
            });
          }
        } catch (error) {
          // Skip messages that can't be parsed as JSON
        }
      });
      return locations;
    };

    const locations = extractLocationsFromMessages();
    if (locations.length > 0) {
      setLocationHistory(prev => Array.isArray(prev) ? [...prev, ...locations] : locations);
    }
  }, [messages]);

  // เพิ่ม state และ function สำหรับ mobile tabs
  const [activeTab, setActiveTab] = useState('map');
  
  const renderMobileTabButtons = () => {
    return (
      <div className="mobile-tabs">
      
        
      </div>
    );
  };

  // ฟังก์ชันดึงข้อมูลประวัติตำแหน่ง
  const fetchLocationHistory = async () => {
    try {
      console.log('Fetching location history...');
      const response = await fetch('http://localhost:5000/api/locations');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const { data } = await response.json();
      console.log('Location history received:', data);
      
      if (Array.isArray(data)) {
        setLocationHistory(data);
      } else {
        console.error('Invalid data format received:', data);
        setLocationHistory([]);
      }
    } catch (error) {
      console.error('Error fetching location history:', error);
      setLocationHistory([]);
    }
  };

  // ฟังก์ชันบันทึกตำแหน่ง
  const saveLocation = async (latitude, longitude, additionalInfo = {}) => {
    try {
      // เพิ่มเงื่อนไขตรวจสอบว่าพิกัดต้องไม่เป็นค่าว่างและไม่เป็น (0,0)
      if (latitude === undefined || longitude === undefined || 
          latitude === null || longitude === null || 
          (latitude === 0 && longitude === 0)) {
        console.log("ไม่บันทึกข้อมูลพิกัดที่ไม่ถูกต้องหรือเป็นค่า (0,0)");
        return;
      }
      
      console.log('Saving location:', { latitude, longitude, additionalInfo });
      
      const response = await fetch('http://localhost:5000/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude,
          longitude,
          name: additionalInfo.name || additionalInfo.buildingName || getLocationName({ latitude, longitude }),
          description: additionalInfo.description || "",
          category: additionalInfo.category || 'building',
          additionalInfo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error}`);
      }

      const result = await response.json();
      console.log('Location saved successfully:', result);
      
      await fetchLocationHistory();
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  // เรียกดึงข้อมูลเมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    fetchLocationHistory();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (locationData.latitude && locationData.longitude) {
        fetchLocationHistory();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [locationData]);

  // ตัวอย่างไอคอนรถ SVG
  const CarIcon = () => (
    <svg className="header-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.29 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM6.5 16C5.67 16 5 15.33 5 14.5C5 13.67 5.67 13 6.5 13C7.33 13 8 13.67 8 14.5C8 15.33 7.33 16 6.5 16ZM17.5 16C16.67 16 16 15.33 16 14.5C16 13.67 16.67 13 17.5 13C18.33 13 19 13.67 19 14.5C19 15.33 18.33 16 17.5 16ZM5 11L6.5 6.5H17.5L19 11H5Z" fill="#4C6FFF"/>
    </svg>
  );

  // ไอคอนสำหรับแสดงสถานที่
  const LocationPinIcon = () => (
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF4C4C">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  );
  
  // ไอคอนสำหรับแสดงเวลาที่จะถึง (ETA)
  const ClockIcon = () => (
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4C6FFF">
      <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
    </svg>
  );
  
  // ไอคอนสำหรับแสดงระยะทาง
  const DistanceIcon = () => (
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4CAF50">
      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
    </svg>
  );

  // คอมโพเนนต์แสดงข้อมูลสถานที่ใกล้เคียงและสถานที่ที่กำลังจะถึงถัดไป
  const NextDestinationCard = () => {
    if (!nextDestination) {
      return (
        <div className="dashboard-card next-destination-card">
          <div className="card-header">
            <div className="header-icon">
              <LocationPinIcon />
            </div>
            <h3>สถานที่ใกล้เคียง</h3>
          </div>
          <div className="card-body">
            <div className="no-data">
              <p>ไม่พบสถานที่ใกล้เคียง</p>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="dashboard-card next-destination-card">
        <div className="card-header">
          <div className="header-icon">
            <LocationPinIcon />
          </div>
          <h3>กำลังมุ่งหน้าไปยัง</h3>
        </div>
        <div className="card-body">
          <div className="destination-info">
            <h4>{nextDestination.name}</h4>
            {nextDestination.description && (
              <p className="destination-description">{nextDestination.description}</p>
            )}
            
            <div className="destination-details">
              <div className="detail-row">
                <DistanceIcon />
                <span>ระยะทาง: {nextDestination.distance?.kilometers || '0'} กม.</span>
              </div>
              <div className="detail-row">
                <ClockIcon />
                <span>ถึงในอีก: {nextDestination.eta?.formatted || 'ไม่ทราบ'}</span>
              </div>
              {nextDestination.category && (
                <div className="detail-row">
                  <span>ประเภท: {formatCategory(nextDestination.category)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // คอมโพเนนต์แสดงรายการสถานที่ใกล้เคียงทั้งหมด
  const NearbyPOIsCard = () => {
    if (nearbyPOIs.length <= 1) {
      return null; // ถ้ามีแค่สถานที่เดียว (หรือไม่มี) ไม่ต้องแสดงรายการ
    }
    
    // แสดงเฉพาะสถานที่ตั้งแต่ลำดับที่ 2 เป็นต้นไป (เพราะลำดับแรกแสดงใน NextDestinationCard แล้ว)
    const otherPOIs = nearbyPOIs.slice(1);
    
    return (
      <div className="dashboard-card nearby-pois-card">
        <div className="card-header">
          <h3>สถานที่ใกล้เคียงอื่นๆ</h3>
        </div>
        <div className="card-body">
          <div className="pois-list">
            {otherPOIs.map((poi, index) => (
              <div key={index} className="poi-item">
                <div className="poi-header">
                  <div className="poi-icon">🏢</div>
                  <div className="poi-name">{poi.name}</div>
                </div>
                <div className="poi-details">
                  <div className="poi-distance">
                    <span className="detail-icon">📏</span>
                    <span>ระยะห่าง: {poi.distance?.kilometers || '0'} กม.</span>
                  </div>
                  {poi.eta && (
                    <div className="poi-eta">
                      <span className="detail-icon">⏱️</span>
                      <span>ถึงในอีก: {poi.eta.formatted}</span>
                    </div>
                  )}
                  {poi.category && (
                    <div className="poi-category">
                      <span className="detail-icon">📋</span>
                      <span>ประเภท: {formatCategory(poi.category)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // ฟังก์ชันแปลงประเภทสถานที่เป็นภาษาไทย
  const formatCategory = (category) => {
    const categories = {
      'building': 'อาคาร',
      'landmark': 'สถานที่สำคัญ',
      'restaurant': 'ร้านอาหาร',
      'office': 'สำนักงาน',
      'parking': 'ที่จอดรถ',
      'other': 'อื่นๆ'
    };
    
    return categories[category] || category;
  };

  // เรียกดึงข้อมูลสถานที่ใกล้เคียงเมื่อตำแหน่งปัจจุบันมีการเปลี่ยนแปลง
  useEffect(() => {
    if (locationData.latitude && locationData.longitude) {
      fetchNearbyPOIs(locationData.latitude, locationData.longitude);
      
      // ดึงข้อมูลสถานที่ที่กำลังจะถึงถัดไป โดยส่งความเร็วปัจจุบันไปด้วย
      const currentSpeed = speedData.currentSpeed || 
        (locationData.additionalInfo && 
          (locationData.additionalInfo.speed || 
           locationData.additionalInfo.spd || 0));
      
      fetchNextDestination(
        locationData.latitude, 
        locationData.longitude, 
        currentSpeed
      );

      // เพิ่มการโหลดข้อมูลประวัติตำแหน่งด้วย
      fetchLocationHistory();
    }
  }, [locationData.latitude, locationData.longitude]);

  // ฟังก์ชันคำนวณระยะห่างระหว่างพิกัดภูมิศาสตร์ด้วย Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
      return Number.MAX_SAFE_INTEGER; // ระยะห่างมากที่สุดถ้าไม่มีพิกัด
    }
    const R = 6371; // รัศมีของโลกในหน่วยกิโลเมตร
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // ระยะทางในหน่วยกิโลเมตร
  };

  // เพิ่มฟังก์ชันสำหรับหาชื่อตึกที่ใกล้ที่สุดกับพิกัด
  const findNearestBuilding = (latitude, longitude, locationHistory, nearbyPOIs) => {
    // ตรวจสอบว่าพิกัดมีค่าที่ถูกต้อง
    if (latitude === undefined || longitude === undefined || 
        latitude === null || longitude === null) {
      return "ไม่มีข้อมูลตำแหน่ง";
    }
    
    // เพิ่มเงื่อนไขเฉพาะสำหรับพิกัด 9.085141, 99.366776
    if (Math.abs(latitude - 9.085141) < 0.0001 && Math.abs(longitude - 99.366776) < 0.0001) {
      console.log("พบพิกัดที่ต้องการเฉพาะ:", latitude, longitude);
      return "อาคารคณะวิทยาศาสตร์"; // กำหนดให้เป็นอาคารคณะวิทยาศาสตร์โดยตรง
    }
    
    // ถ้ามีข้อมูล nearbyPOIs ให้ใช้ข้อมูลนี้ก่อน
    if (nearbyPOIs && nearbyPOIs.length > 0) {
      // คำนวณระยะทางระหว่างพิกัดและตึกแต่ละหลัง
      const buildingsWithDistance = nearbyPOIs.map(poi => {
        const poiLatitude = poi.latitude || 0;
        const poiLongitude = poi.longitude || 0;
        
        // คำนวณระยะทางด้วย Haversine formula
        const distance = calculateDistance(latitude, longitude, poiLatitude, poiLongitude);
        return {
          ...poi,
          distance
        };
      });
      
      // เรียงลำดับจากใกล้ไปไกล
      buildingsWithDistance.sort((a, b) => a.distance - b.distance);
      
      // บันทึกข้อมูลการคำนวณระยะทางสำหรับตรวจสอบ
      if (buildingsWithDistance.length > 0) {
        console.log(`ตึกที่ใกล้ที่สุด: ${buildingsWithDistance[0].name}, ระยะทาง: ${buildingsWithDistance[0].distance} กม.`);
      }
      
      // ถ้าระยะทางไม่เกิน threshold ให้ถือว่าอยู่ที่ตึกนั้น
      const threshold = 0.2; // ประมาณ 200 เมตร
      if (buildingsWithDistance.length > 0 && buildingsWithDistance[0].distance < threshold) {
        return buildingsWithDistance[0].name;
      }
    }
    
    // แปลงเป็นเลขทศนิยม 6 ตำแหน่งอย่างปลอดภัย
    const latFixed = typeof latitude === 'number' ? latitude.toFixed(6) : String(latitude);
    const longFixed = typeof longitude === 'number' ? longitude.toFixed(6) : String(longitude);
    
    // ถ้าไม่พบตึกที่ใกล้เคียง ให้แสดงเป็น "พิกัดไม่ทราบชื่อ"
    return `พิกัดที่ ${latFixed}, ${longFixed}`;
  };

  // ฟังก์ชันหาชื่อตึกที่รถผ่าน
  const getLocationName = (location) => {
    // ตรวจสอบความถูกต้องของข้อมูล location
    if (!location || typeof location !== 'object') {
      return "ไม่มีข้อมูลตำแหน่ง";
    }
    
    // ใช้ชื่อจากข้อมูลที่มีในฐานข้อมูล MongoDB ถ้ามี
    if (location.name) {
      return location.name;
    }
    
    // ตรวจสอบว่ามี locationName หรือไม่
    if (location.locationName) {
      return location.locationName;
    }
    
    // ตรวจสอบว่ามี additionalInfo.name หรือไม่
    if (location.additionalInfo && location.additionalInfo.name) {
      return location.additionalInfo.name;
    }
    
    // ตรวจสอบว่ามีค่า latitude และ longitude หรือไม่
    let latitude, longitude;
    
    if (location.latitude !== undefined && location.longitude !== undefined) {
      latitude = location.latitude;
      longitude = location.longitude;
    } else if (location.location && location.location.coordinates && location.location.coordinates.length >= 2) {
      // ดึงพิกัดจาก MongoDB format ที่เก็บในรูปแบบ GeoJSON
      longitude = location.location.coordinates[0];
      latitude = location.location.coordinates[1];
    }
    
    if (latitude !== undefined && longitude !== undefined &&
        latitude !== null && longitude !== null) {
      
      // เพิ่มเงื่อนไขเฉพาะสำหรับพิกัด 9.085141, 99.366776
      if (Math.abs(latitude - 9.085141) < 0.0001 && Math.abs(longitude - 99.366776) < 0.0001) {
        return "อาคารคณะวิทยาศาสตร์";
      }
      
      // ถ้ามีข้อมูล nearbyPOIs ให้ใช้ข้อมูลนี้
      if (nearbyPOIs && nearbyPOIs.length > 0) {
        return findNearestBuilding(latitude, longitude, locationHistory, nearbyPOIs);
      }
      
      // ถ้าไม่มี nearbyPOIs ให้ใช้ข้อมูลตึกจำลอง
      const buildingsWithDistance = sampleBuildings.map(building => {
        // ใช้ฟังก์ชัน Haversine แทนการคำนวณแบบเดิม
        const distance = calculateDistance(
          latitude, 
          longitude, 
          building.latitude || 0, 
          building.longitude || 0
        );
        return {
          ...building,
          distance
        };
      });
      
      buildingsWithDistance.sort((a, b) => a.distance - b.distance);
      
      // บันทึกข้อมูลการคำนวณระยะทางสำหรับตรวจสอบ
      if (buildingsWithDistance.length > 0) {
        console.log(`getLocationName: ตึกที่ใกล้ที่สุด: ${buildingsWithDistance[0].name}, ระยะทาง: ${buildingsWithDistance[0].distance} กม.`);
      }
      
      // ถ้าระยะทางไม่เกิน threshold ให้ถือว่าอยู่ที่ตึกนั้น
      const threshold = 0.2; // เพิ่มค่าเป็น 200 เมตร (0.2 กิโลเมตร)
      if (buildingsWithDistance.length > 0 && buildingsWithDistance[0].distance < threshold) {
        return buildingsWithDistance[0].name;
      }
      
      // แปลงเป็นเลขทศนิยม 6 ตำแหน่งอย่างปลอดภัย
      const latFixed = typeof latitude === 'number' ? latitude.toFixed(6) : String(latitude);
      const longFixed = typeof longitude === 'number' ? longitude.toFixed(6) : String(longitude);
      
      // แสดงพิกัดถ้าไม่พบตึกที่ใกล้เคียง
      return `พิกัดที่ ${latFixed}, ${longFixed}`;
    }
    
    // ถ้าไม่พบข้อมูลพิกัดใดๆ เลย
    return "ไม่มีข้อมูลพิกัด";
  };

  // ฟังก์ชันสำหรับสร้างข้อมูลตึกจำลองเพื่อใช้งานในกรณีที่ไม่มีข้อมูลจริง
  const getBuildings = () => {
    return [
      // ข้อมูลสถานที่จริงจาก add-locations.js
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
  };

  // ใช้ข้อมูลตึกจำลองถ้าไม่มีข้อมูลจริง
  const sampleBuildings = getBuildings();

  // ฟังก์ชันสำหรับส่งออกข้อมูลเป็นไฟล์ Excel
  const exportToExcel = () => {
    if (!locationHistory || locationHistory.length === 0) {
      setAlertMessage('ไม่มีข้อมูลประวัติการเดินทางที่จะส่งออก');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    // เตรียมข้อมูลสำหรับส่งออก
    const exportData = locationHistory.map((location, index) => {
      // แปลงรูปแบบพิกัดเป็นทศนิยม 6 ตำแหน่ง
      let latitude = '-', longitude = '-';
      
      // ตรวจสอบให้แน่ใจว่าค่าพิกัดไม่เป็น undefined ก่อนเรียกใช้ toFixed()
      if (location && location.latitude !== undefined && location.latitude !== null) {
        latitude = typeof location.latitude === 'number' ? location.latitude.toFixed(6) : String(location.latitude);
      }
      
      if (location && location.longitude !== undefined && location.longitude !== null) {
        longitude = typeof location.longitude === 'number' ? location.longitude.toFixed(6) : String(location.longitude);
      }
      
      // ดึงข้อมูลเพิ่มเติมจาก additionalInfo
      const additionalInfo = location.additionalInfo || {};
      
      // ดึงข้อมูลจากหลายแหล่งให้ครบถ้วน
      const speed = additionalInfo.speed || additionalInfo.spd || '-';
      const altitude = additionalInfo.altitude || additionalInfo.alt || '-';
      const satellites = additionalInfo.satellites || additionalInfo.sat || '-';
      const heading = additionalInfo.heading || additionalInfo.direction || additionalInfo.dir || '-';
      const accuracy = additionalInfo.accuracy || additionalInfo.acc || '-';

      // ตรวจสอบเพิ่มเติมว่ามีข้อมูลใน additionalInfo.gps หรือไม่
      const gpsInfo = additionalInfo.gps || {};
      const speedFromGPS = gpsInfo.speed || '-';
      const altitudeFromGPS = gpsInfo.altitude || '-';
      const satellitesFromGPS = gpsInfo.satellites || '-';
      const headingFromGPS = gpsInfo.heading || '-';
      const accuracyFromGPS = gpsInfo.accuracy || '-';
      
      // ใช้ข้อมูลที่ดีที่สุดที่มี
      const finalSpeed = speed !== '-' ? speed : speedFromGPS;
      const finalAltitude = altitude !== '-' ? altitude : altitudeFromGPS;
      const finalSatellites = satellites !== '-' ? satellites : satellitesFromGPS;
      const finalHeading = heading !== '-' ? heading : headingFromGPS;
      const finalAccuracy = accuracy !== '-' ? accuracy : accuracyFromGPS;
      
      // แปลงค่าเป็นตัวเลขที่มีความหมาย - เพิ่มการตรวจสอบ undefined และ null
      let formattedSpeed = finalSpeed;
      if (finalSpeed !== '-' && finalSpeed !== undefined && finalSpeed !== null && !isNaN(parseFloat(finalSpeed))) {
        formattedSpeed = parseFloat(finalSpeed).toFixed(1);
      }
      
      let formattedAltitude = finalAltitude;
      if (finalAltitude !== '-' && finalAltitude !== undefined && finalAltitude !== null && !isNaN(parseFloat(finalAltitude))) {
        formattedAltitude = parseFloat(finalAltitude).toFixed(1);
      }
      
      let formattedHeading = finalHeading;
      if (finalHeading !== '-' && finalHeading !== undefined && finalHeading !== null && !isNaN(parseFloat(finalHeading))) {
        formattedHeading = parseFloat(finalHeading).toFixed(1);
      }
      
      let formattedAccuracy = finalAccuracy;
      if (finalAccuracy !== '-' && finalAccuracy !== undefined && finalAccuracy !== null && !isNaN(parseFloat(finalAccuracy))) {
        formattedAccuracy = parseFloat(finalAccuracy).toFixed(1);
      }
      
      // สร้างข้อมูลเวลาที่อ่านง่ายในรูปแบบ HH:MM:SS DD-MM-YYYY
      let timestamp = '';
      try {
        if (location.timestamp) {
          // ถ้าเป็น ISO string ให้แปลงเป็นรูปแบบที่อ่านง่าย
          if (typeof location.timestamp === 'string' && location.timestamp.includes('T')) {
            const date = new Date(location.timestamp);
            timestamp = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')} ${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
          } else {
            timestamp = location.timestamp;
          }
        } else {
          const now = new Date();
          timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        }
      } catch (e) {
        timestamp = location.timestamp || '-';
      }
      
      // ปรับปรุงฟังก์ชัน getLocationName ให้ปลอดภัยจากข้อผิดพลาด
      const locationName = (() => {
        try {
          return getLocationName(location);
        } catch (e) {
          console.error('Error getting location name:', e);
          return '-';
        }
      })();
      
      // รวมข้อมูลทั้งหมดสำหรับส่งออก - ใช้ headers ภาษาไทย
      return {
        'ลำดับ': index + 1,
        'เวลา': timestamp,
        'สถานที่': locationName,
        'ละติจูด': latitude || '-',
        'ลองจิจูด': longitude || '-',
        'ความเร็ว (กม./ชม.)': formattedSpeed,
        'ความสูง (ม.)': formattedAltitude,
        'ดาวเทียม': finalSatellites,
        'ทิศทาง (°)': formattedHeading,
        'ความแม่นยำ (ม.)': formattedAccuracy
      };
    });
    
    // สร้าง Workbook และ Worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ประวัติตำแหน่ง');

    // ปรับความกว้างของคอลัมน์
    const colWidths = [
      { wch: 5 },    // ลำดับ
      { wch: 20 },   // เวลา
      { wch: 35 },   // สถานที่
      { wch: 15 },   // ละติจูด
      { wch: 15 },   // ลองจิจูด
      { wch: 15 },   // ความเร็ว
      { wch: 15 },   // ความสูง
      { wch: 15 },   // ดาวเทียม
      { wch: 15 },   // ทิศทาง
      { wch: 15 }    // ความแม่นยำ
    ];
    worksheet['!cols'] = colWidths;

    // สร้างชื่อไฟล์ที่มีวันที่และเวลาปัจจุบัน
    const now = new Date();
    const dateTimeStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `ประวัติตำแหน่ง_${dateTimeStr}.xlsx`;
    
    // บันทึกและดาวน์โหลดไฟล์
    XLSX.writeFile(workbook, fileName);

    // แสดงข้อความแจ้งเตือน
    setAlertMessage('ส่งออกข้อมูลเป็น Excel สำเร็จ');
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
  };



  // ฟังก์ชันสำหรับสร้างข้อมูลจำลองสำหรับการทดสอบ
  const generateSampleData = () => {
    if (!setLocationHistory) {
      setAlertMessage('ไม่สามารถสร้างข้อมูลจำลองได้');
      setAlertVisible(true);
      setTimeout(() => setAlertVisible(false), 3000);
      return;
    }

    // เตรียมวันที่ปัจจุบัน
    const today = new Date();
    today.setHours(13, 0, 0, 0); // เริ่มจากเวลา 13:00 น.
    
    const buildings = getBuildings();
    
    // สร้างข้อมูลจำลองสำหรับแต่ละอาคาร
    const sampleLocations = [];
    
    // กำหนดจำนวนตัวอย่างข้อมูลที่ต้องการสร้าง
    const numberOfSamples = buildings.length > 30 ? 30 : buildings.length;
    
    // ช่วงระยะเวลาทั้งหมด 2 ชั่วโมง (13:00 - 15:00) ในหน่วยมิลลิวินาที
    const totalTimeSpan = 2 * 60 * 60 * 1000;
    
    // ระยะห่างของแต่ละตัวอย่างข้อมูลในหน่วยมิลลิวินาที
    const interval = totalTimeSpan / numberOfSamples;
    
    // สุ่มเลือกอาคารและสร้างข้อมูลตำแหน่ง
    for (let i = 0; i < numberOfSamples; i++) {
      const building = buildings[i % buildings.length];
      
      // คำนวณเวลาสำหรับตัวอย่างนี้
      const sampleTime = new Date(today.getTime() + i * interval);
      
      // สร้างค่าพิกัด (เพิ่มค่าสุ่มเล็กน้อยเพื่อให้มีความแตกต่าง)
      const randomOffset = 0.0002; // ประมาณ 20 เมตร
      const latitude = building.latitude + (Math.random() - 0.5) * randomOffset;
      const longitude = building.longitude + (Math.random() - 0.5) * randomOffset;
      
      // สร้างข้อมูลเพิ่มเติม
      const speed = Math.floor(Math.random() * 60); // 0-60 กม./ชม.
      const altitude = 10 + Math.floor(Math.random() * 30); // 10-40 เมตร
      const satellites = 4 + Math.floor(Math.random() * 12); // 4-16 ดาวเทียม
      const heading = Math.floor(Math.random() * 360); // 0-359 องศา
      const accuracy = 1 + Math.floor(Math.random() * 10); // 1-10 เมตร
      
      // สร้างข้อมูลตำแหน่งในรูปแบบเดียวกับข้อมูลจริง
      const location = {
        latitude,
        longitude,
        timestamp: sampleTime.toISOString(),
        additionalInfo: {
          speed,
          altitude,
          satellites,
          heading,
          accuracy,
          buildingName: building.name,
          category: building.category
        }
      };
      
      sampleLocations.push(location);
    }
    
    // เรียงลำดับข้อมูลตามเวลา
    sampleLocations.sort((a, b) => {
      return new Date(a.timestamp) - new Date(b.timestamp);
    });
    
    // อัพเดท state ด้วยข้อมูลจำลอง
    setLocationHistory(sampleLocations);
    setAlertMessage(`สร้างข้อมูลจำลอง ${sampleLocations.length} รายการ สำหรับเวลา 13:00 - 15:00 น. สำเร็จ`);
    setAlertVisible(true);
    setTimeout(() => setAlertVisible(false), 3000);
    
    return sampleLocations;
  };

  // เพิ่ม useEffect เพื่อกำหนดให้แสดงประวัติตลอดเวลา
  useEffect(() => {
    setShowHistory(true);
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <img 
            src="/sru-logo.png" 
            alt="มหาวิทยาลัยราชภัฏสุราษฎร์ธานี" 
            className="university-logo" 
          />
          <h1><CarIcon /> ระบบตรวจสอบตำแหน่งรถ</h1>
        </div>
        <div className="connection-status">
          {connectionStatus}
        </div>
      </header>

      <div className="status-cards">
        <div className="status-group speed-cards">
          <div className="status-card">
            <span className="card-icon speed-icon">⏱️</span>
            <span className="status-value">{Math.round(speedData.currentSpeed)}</span>
            <span className="status-unit">กม./ชม.</span>
            <span className="status-label">ความเร็วปัจจุบัน</span>
          </div>
          <div className="status-card">
            <span className="card-icon max-speed-icon">🏎️</span>
            <span className="status-value">{Math.round(speedData.maxSpeed)}</span>
            <span className="status-unit">กม./ชม.</span>
            <span className="status-label">ความเร็วสูงสุด</span>
          </div>
        </div>
        
        {/* สถานที่ที่กำลังจะถึงถัดไป */}
        {nextDestination && (
          <div className="destination-info-card">
            <h3>กำลังมุ่งหน้าไปยัง</h3>
            <div className="destination-name">{nextDestination.name}</div>
            <div className="destination-details">
              <div className="detail-item">
                <span className="detail-icon">🗺️</span>
                <span className="detail-value">{nextDestination.distance?.kilometers || '0'} กม.</span>
              </div>
              <div className="detail-item">
                <span className="detail-icon">⏱️</span>
                <span className="detail-value">{nextDestination.eta?.formatted || 'ไม่ทราบ'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <main className="dashboard-content">
        <section className="map-section">
          <div className="map-wrapper">
            <LongdoMap 
              latitude={selectedLocation ? selectedLocation.latitude : locationData.latitude} 
              longitude={selectedLocation ? selectedLocation.longitude : locationData.longitude}
              locationHistory={locationHistory}
              nearbyPOIs={nearbyPOIs}
            />
          </div>
        </section>

        <section className="location-info">
          <h2><span className="section-icon">📍</span> พิกัดล่าสุด</h2>
          <div className="location-details">
            <div className="info-item">
              <span className="label">Latitude:</span>
              <span className="value">{selectedLocation ? selectedLocation.latitude : (locationData.latitude || '-')}</span>
            </div>
            <div className="info-item">
              <span className="label">Longitude:</span>
              <span className="value">{selectedLocation ? selectedLocation.longitude : (locationData.longitude || '-')}</span>
            </div>
            <div className="info-item">
              <span className="label">อัพเดทล่าสุด:</span>
              <span className="value">{selectedLocation ? selectedLocation.timestamp : (locationData.lastUpdate || '-')}</span>
            </div>
            
            {/* ส่วนควบคุม */}
            <div className="control-section">
              {/* ปิดปุ่มแจ้งเตือนไปที่รถไว้ชั่วคราว
              <button
                onClick={toggleCallVehicle}
                className={`control-btn minimal ${callVehicleState ? 'active' : ''}`}
              >
                <span className="btn-icon notification-icon">🔔</span>
                {callVehicleState ? 'ยกเลิกแจ้งเตือน' : 'แจ้งเตือนไปที่รถ'}
              </button>
              */}
            </div>
            
            {/* รายละเอียดเพิ่มเติม */}
            {(selectedLocation?.additionalInfo || locationData.additionalInfo) && 
              Object.entries(selectedLocation?.additionalInfo || locationData.additionalInfo)
              .filter(([key]) => !['speed', 'altitude', 'satellites', 'timestamp'].includes(key.toLowerCase()))
              .map(([key, value]) => (
                <div key={key} className="info-item">
                  <span className="label">{key}:</span>
                  <span className="value">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                </div>
              ))
            }
            
            <div className="button-group">
              {/* <button 
                onClick={() => setShowHistory(!showHistory)}
                className="history-btn"
              >
                <span className="btn-icon history-icon">🕒</span> {showHistory ? 'ซ่อนประวัติ' : 'ดูประวัติ'}
              </button> */}
              {Array.isArray(locationHistory) && locationHistory.length > 0 && (
                <>
                  <button 
                    onClick={exportToExcel}
                    className="export-btn excel-btn"
                  >
                    <span className="btn-icon excel-icon">📊</span> ส่งออก Excel
                  </button>
                  {/* ปิดปุ่มสร้างข้อมูลตัวอย่างไว้ชั่วคราว 
                  <button 
                    onClick={generateSampleData}
                    className="export-btn sample-btn"
                    style={{
                      marginTop: '10px',
                      backgroundColor: '#34A853',
                      color: 'white'
                    }}
                  >
                    <span className="btn-icon sample-icon">🔄</span> สร้างข้อมูลตัวอย่าง 13:00-15:00
                  </button>
                  */}
                </>
              )}
            </div>
          </div>

          {/* ส่วนประวัติการเดินทาง */}
          {false && (
            <div className="location-history">
              {/* <h3><span className="section-icon">📜</span> ประวัติตำแหน่ง</h3> */}
              <div className="history-list">
                {Array.isArray(locationHistory) && locationHistory.length > 0 ? (
                  [...locationHistory].reverse().map((location, index) => (
                    <div key={index} className="history-item">
                      <span className="history-time">{location.timestamp}</span>
                      <span className="history-building-name">
                        {getLocationName(location)}
                      </span>
                      <div className="history-item-row">
                        <div className="history-buttons">
                          <button 
                            onClick={() => selectLocationFromHistory(location)}
                            className="select-location-btn"
                          >
                            <span className="btn-icon location-icon">🔍</span> แสดงบนแผนที่
                          </button>
                        </div>
                        {location.additionalInfo && Object.keys(location.additionalInfo).length > 0 && (
                          <div className="history-additional-info">
                            <details>
                              <summary>ข้อมูลเพิ่มเติม</summary>
                              <div className="additional-info-content">
                                <div className="additional-info-item">
                                  <span className="additional-info-key">พิกัด:</span>
                                  <span className="additional-info-value">
                                    {location.latitude}, {location.longitude}
                                  </span>
                                </div>
                                {Object.entries(location.additionalInfo).map(([key, value]) => (
                                  <div key={key} className="additional-info-item">
                                    <span className="additional-info-key">{key}:</span>
                                    <span className="additional-info-value">
                                      {typeof value === 'object' ? JSON.stringify(value) : value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-history">ไม่มีประวัติตำแหน่ง</div>
                )}
              </div>

              {/* เพิ่มปุ่มส่งออกข้อมูล */}
              {Array.isArray(locationHistory) && locationHistory.length > 0 && (
                <div className="export-buttons">
                  <button 
                    onClick={exportToExcel}
                    className="export-btn excel-btn"
                  >
                    <span className="btn-icon excel-icon">📊</span> ส่งออก Excel
                  </button>
                  {/* ปิดปุ่มสร้างข้อมูลตัวอย่างไว้ชั่วคราว
                  <button 
                    onClick={generateSampleData}
                    className="export-btn sample-btn"
                    style={{
                      marginTop: '10px',
                      backgroundColor: '#34A853',
                      color: 'white'
                    }}
                  >
                    <span className="btn-icon sample-icon">🔄</span> สร้างข้อมูลตัวอย่าง 13:00-15:00
                  </button>
                  */}
                </div>
              )}
            </div>
          )}
          
          {/* ส่วนแสดงสถานที่ใกล้เคียง */}
          <div className="nearby-locations">
            <h3><span className="section-icon">🏢</span> สถานที่ใกล้เคียง</h3>
            
            {loadingPOIs ? (
              <div className="loading-pois">กำลังโหลดข้อมูลสถานที่...</div>
            ) : nearbyPOIs.length > 0 ? (
              <div className="poi-list">
                {nearbyPOIs.map((poi, index) => (
                  <div key={index} className="poi-item">
                    <div className="poi-header">
                      <div className="poi-icon">🏢</div>
                      <div className="poi-name">{poi.name}</div>
                    </div>
                    <div className="poi-details">
                      <div className="poi-distance">
                        <span className="detail-icon">📏</span>
                        <span>ระยะห่าง: {poi.distance?.kilometers || '0'} กม.</span>
                      </div>
                      {poi.eta && (
                        <div className="poi-eta">
                          <span className="detail-icon">⏱️</span>
                          <span>ถึงในอีก: {poi.eta.formatted}</span>
                        </div>
                      )}
                      {poi.category && (
                        <div className="poi-category">
                          <span className="detail-icon">📋</span>
                          <span>ประเภท: {formatCategory(poi.category)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-pois">ไม่พบสถานที่ใกล้เคียง</div>
            )}
          </div>
        </section>
      </main>

      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} CWNK. All rights reserved.</p>
          <p className="credit">Developed by CWNK Team</p>
        </div>
      </footer>

      {alertVisible && (
        <div className="alert-message">
          <div className="alert-content">
            <span className="alert-icon">🔔</span>
            <span className="alert-text">{alertMessage}</span>
            <button className="alert-close" onClick={() => setAlertVisible(false)}>×</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;