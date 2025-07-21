import unittest
import os
import sys
import tempfile
from flask import session

# เพิ่ม path ของโปรเจค
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from app import app
from models import db
from models.user import User

class RoutesTestCase(unittest.TestCase):

    def setUp(self):
        # ตั้งค่าแอพพลิเคชัน Flask สำหรับการทดสอบ
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        # สร้างคอนเท็กซ์ของแอพพลิเคชัน
        self.app_context = app.app_context()
        self.app_context.push()
        
        # สร้างโครงสร้างฐานข้อมูล
        db.create_all()
        
        # เพิ่มผู้ใช้ทดสอบ
        test_user = User(username='test_user', email='test@example.com', full_name='ผู้ใช้ทดสอบ', role='user')
        test_user.set_password('password123')
        db.session.add(test_user)
        
        test_admin = User(username='test_admin', email='admin@example.com', full_name='ผู้ดูแลระบบทดสอบ', role='admin')
        test_admin.set_password('password123')
        db.session.add(test_admin)
        
        db.session.commit()
        
        # สร้างไคลเอนต์ทดสอบ
        self.client = app.test_client()
        
    def tearDown(self):
        # ลบฐานข้อมูล
        db.session.remove()
        db.drop_all()
        
        # ปิดคอนเท็กซ์ของแอพพลิเคชัน
        self.app_context.pop()
    
    def login(self, username, password):
        # ฟังก์ชันสำหรับการล็อกอิน
        return self.client.post('/login', data=dict(
            username=username,
            password=password
        ), follow_redirects=True)
    
    def logout(self):
        # ฟังก์ชันสำหรับการออกจากระบบ
        return self.client.get('/logout', follow_redirects=True)
    
    def test_login_logout(self):
        # ทดสอบการล็อกอินและออกจากระบบ
        
        # ทดสอบการล็อกอินด้วยข้อมูลที่ถูกต้อง
        response = self.login('test_user', 'password123')
        self.assertEqual(response.status_code, 200)
        
        # ทดสอบการล็อกอินด้วยข้อมูลที่ไม่ถูกต้อง
        response = self.login('test_user', 'wrongpassword')
        self.assertEqual(response.status_code, 200)
        
        # ทดสอบการออกจากระบบ
        response = self.logout()
        self.assertEqual(response.status_code, 200)
    
    def test_index_page(self):
        # ทดสอบหน้าหลักเมื่อล็อกอินแล้ว
        self.login('test_user', 'password123')
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
    
    def test_admin_access(self):
        # ทดสอบการเข้าถึงหน้า Admin
        
        # ล็อกอินด้วยผู้ใช้ทั่วไป
        self.login('test_user', 'password123')
        response = self.client.get('/settings', follow_redirects=True)
        self.assertEqual(response.status_code, 200)
        
        # ล็อกอินด้วยผู้ดูแลระบบ
        self.login('test_admin', 'password123')
        response = self.client.get('/settings', follow_redirects=True)
        self.assertEqual(response.status_code, 200)

if __name__ == '__main__':
    unittest.main() 