import unittest
from datetime import datetime, date
import os
import sys
import tempfile

# เพิ่ม path ของโปรเจค
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from app import app
from models import db
from models.chicken import Chicken
from models.feeding import Feeding, FeedFormula
from models.egg import EggCollection, EggProduction
from models.barn import Barn
from models.user import User
from models.customer import Customer

class ModelsTestCase(unittest.TestCase):

    def setUp(self):
        # ตั้งค่าแอพพลิเคชัน Flask สำหรับการทดสอบ
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        # สร้างคอนเท็กซ์ของแอพพลิเคชัน
        self.app_context = app.app_context()
        self.app_context.push()
        
        # สร้างโครงสร้างฐานข้อมูล
        db.create_all()
        
    def tearDown(self):
        # ลบฐานข้อมูล
        db.session.remove()
        db.drop_all()
        
        # ปิดคอนเท็กซ์ของแอพพลิเคชัน
        self.app_context.pop()
    
    def test_chicken_model(self):
        # ทดสอบการสร้างและบันทึกข้อมูลไก่
        chicken = Chicken(
            name='ไก่ทดสอบ',
            breed='ไก่ไข่สายพันธุ์ทดสอบ',
            age=5,
            weight=1.5,
            health_status='ปกติ',
            egg_production_rate=0.9
        )
        
        db.session.add(chicken)
        db.session.commit()
        
        # ดึงข้อมูลจากฐานข้อมูล
        saved_chicken = Chicken.query.filter_by(name='ไก่ทดสอบ').first()
        
        # ตรวจสอบว่าข้อมูลถูกบันทึกอย่างถูกต้อง
        self.assertIsNotNone(saved_chicken)
        self.assertEqual(saved_chicken.name, 'ไก่ทดสอบ')
        self.assertEqual(saved_chicken.breed, 'ไก่ไข่สายพันธุ์ทดสอบ')
        self.assertEqual(saved_chicken.age, 5)
        self.assertEqual(saved_chicken.weight, 1.5)
        self.assertEqual(saved_chicken.health_status, 'ปกติ')
        self.assertEqual(saved_chicken.egg_production_rate, 0.9)
    
    def test_barn_model(self):
        # ทดสอบการสร้างและบันทึกข้อมูลโรงเรือน
        barn = Barn(
            name='โรงเรือนทดสอบ',
            capacity=100,
            description='โรงเรือนสำหรับการทดสอบ',
            status='ใช้งาน',
            environment='{"temperature": 25, "humidity": 65}'
        )
        
        db.session.add(barn)
        db.session.commit()
        
        # ดึงข้อมูลจากฐานข้อมูล
        saved_barn = Barn.query.filter_by(name='โรงเรือนทดสอบ').first()
        
        # ตรวจสอบว่าข้อมูลถูกบันทึกอย่างถูกต้อง
        self.assertIsNotNone(saved_barn)
        self.assertEqual(saved_barn.name, 'โรงเรือนทดสอบ')
        self.assertEqual(saved_barn.capacity, 100)
    
    def test_user_password(self):
        # ทดสอบการตั้งค่ารหัสผ่านและการตรวจสอบรหัสผ่าน
        user = User(
            username='user_test',
            email='test@example.com',
            full_name='ผู้ใช้ทดสอบ',
            role='user'
        )
        
        user.set_password('password123')
        
        # ตรวจสอบว่ารหัสผ่านถูกเข้ารหัสอย่างถูกต้อง
        self.assertNotEqual(user.password_hash, 'password123')
        
        # ตรวจสอบว่าสามารถตรวจสอบรหัสผ่านได้อย่างถูกต้อง
        self.assertTrue(user.check_password('password123'))
        self.assertFalse(user.check_password('wrongpassword'))

if __name__ == '__main__':
    unittest.main() 