from datetime import datetime
from models import db

class Barn(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='ใช้งาน')  # ใช้งาน, ปิดปรับปรุง, ไม่ใช้งาน
    environment = db.Column(db.Text, nullable=True)  # เก็บข้อมูลสภาพแวดล้อมในโรงเรือน JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ความสัมพันธ์
    chickens = db.relationship('Chicken', backref='barn', lazy=True)
    egg_collections = db.relationship('EggCollection', backref='barn', lazy=True)
    feedings = db.relationship('Feeding', backref='barn', lazy=True)
    
    def __repr__(self):
        return f'<Barn {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'capacity': self.capacity,
            'description': self.description,
            'status': self.status,
            'environment': self.environment,
            'chicken_count': len(self.chickens),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 