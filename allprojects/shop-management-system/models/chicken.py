from datetime import datetime
from models import db

class Chicken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    breed = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    weight = db.Column(db.Float, nullable=False)
    health_status = db.Column(db.String(50), nullable=False)
    egg_production_rate = db.Column(db.Float, nullable=False)
    barn_id = db.Column(db.Integer, db.ForeignKey('barn.id'), nullable=True)
    qr_code = db.Column(db.String(255), nullable=True)
    image = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ความสัมพันธ์
    health_records = db.relationship('HealthRecord', backref='chicken', lazy=True, cascade="all, delete-orphan")
    vaccinations = db.relationship('Vaccination', backref='chicken', lazy=True, cascade="all, delete-orphan")
    egg_productions = db.relationship('EggProduction', backref='chicken', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Chicken {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'breed': self.breed,
            'age': self.age,
            'weight': self.weight,
            'health_status': self.health_status,
            'egg_production_rate': self.egg_production_rate,
            'qr_code': self.qr_code,
            'image': self.image,
            'notes': self.notes,
            'barn_id': self.barn_id,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 