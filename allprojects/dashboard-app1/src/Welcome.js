import React from 'react';
import './Welcome.css';

const Welcome = () => {
  return (
    <div className="welcome-container">
      <header className="welcome-header">
        <h1>Smart Vehicle Control</h1>
        <p>ระบบตรวจสอบตำแหน่งรถและสัญญาณ LoRa</p>
      </header>
      
      <div className="main-links">
        <button onClick={() => window.location.href='/dashboard'} className="main-button">
          หน้าแผงควบคุมหลัก <span className="arrow">→</span>
        </button>
        <button onClick={() => window.location.href='/lora-signal'} className="main-button lora-button">
          ข้อมูลสัญญาณ LoRa <span className="arrow">→</span>
        </button>
      </div>
      
      <h2 className="section-title">คุณสมบัติเด่น</h2>
      <div className="features">
        <div className="feature animate-pop" style={{"--delay": "0.1s"}}>
          <span>📍</span>
          <h3>ติดตามตำแหน่ง</h3>
          <p>ดูตำแหน่งยานพาหนะแบบเรียลไทม์ด้วยเทคโนโลยี GPS ความแม่นยำสูง แสดงผลบนแผนที่ขั้นสูง บันทึกประวัติเส้นทางย้อนหลังได้</p>
        </div>
        
        <div className="feature animate-pop" style={{"--delay": "0.2s"}}>
          <span>📊</span>
          <h3>ข้อมูลการใช้งาน</h3>
          <p>วิเคราะห์ความเร็ว ระยะทาง เวลาการใช้งาน พฤติกรรมการขับขี่ และประสิทธิภาพของยานพาหนะ</p>
        </div>
        
        <div className="feature animate-pop" style={{"--delay": "0.3s"}}>
          <span>📡</span>
          <h3>สัญญาณ LoRa</h3>
          <p>ตรวจสอบความแรงสัญญาณ LoRa ในหน่วย dB พร้อมวิเคราะห์คุณภาพสัญญาณและส่งออกข้อมูลเป็น Excel</p>
        </div>

        <div className="feature animate-pop" style={{"--delay": "0.4s"}}>
          <span>🔔</span>
          <h3>การแจ้งเตือนอัจฉริยะ</h3>
          <p>รับการแจ้งเตือน เมื่อมีคนกดเรียกรถ</p>
        </div>
        
        <div className="feature animate-pop" style={{"--delay": "0.6s"}}>
          <span>📱</span>
          <h3>แอปพลิเคชันที่ใช้งานง่าย</h3>
          <p>ควบคุมทุกอย่างผ่านแอปพลิเคชันที่ออกแบบให้ใช้งานง่าย รองรับทั้ง iOS และ Android สามารถจัดการยานพาหนะได้หลายคันพร้อมกัน และแบ่งปันการเข้าถึงให้ผู้ใช้หลายคน</p>
        </div>
      </div>

      <div className="how-it-works">
        <h2 className="section-title">วิธีการทำงาน</h2>
        <div className="workflow-diagram">
          <div className="workflow-item">
            <div className="workflow-icon">📡</div>
            <p>อุปกรณ์ติดตั้งในยานพาหนะส่งข้อมูลไปยังระบบคลาวด์</p>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-item">
            <div className="workflow-icon">☁️</div>
            <p>ระบบคลาวด์ประมวลผลข้อมูลแบบเรียลไทม์</p>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-item">
            <div className="workflow-icon">📱</div>
            <p>แสดงผลและควบคุมได้ทันทีผ่านแอปพลิเคชัน</p>
          </div>
        </div>
      </div>

      <div className="start">
        <h2 className="section-title">เริ่มต้นใช้งานใน 3 ขั้นตอนง่ายๆ</h2>
        <div className="steps">
          <div className="step">
            <span>1</span>
            <p>เลือกยานพาหนะที่ต้องการควบคุมหรือติดตาม</p>
          </div>
          <div className="step">
            <span>2</span>
            <p>ดูข้อมูลเรียลไทม์และสถิติการใช้งาน</p>
          </div>
          <div className="step">
            <span>3</span>
            <p>ควบคุมอุปกรณ์และตั้งค่าการแจ้งเตือน</p>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>© {new Date().getFullYear()} CWNK. All rights reserved.</p>
        <p className="credit">Developed by CWNK Team</p>
        <div className="contact-info">
          <p>📧 6404305001347@student.sru.ac.th</p>
        </div>
      </footer>
    </div>
  );
};

export default Welcome; 