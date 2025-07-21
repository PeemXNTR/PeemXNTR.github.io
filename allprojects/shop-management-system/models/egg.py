from datetime import datetime
from models import db

class EggCollection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    total_eggs = db.Column(db.Integer, nullable=False)
    broken_eggs = db.Column(db.Integer, nullable=False)
    barn_id = db.Column(db.Integer, db.ForeignKey('barn.id'), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<EggCollection {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'total_eggs': self.total_eggs,
            'broken_eggs': self.broken_eggs,
            'barn_id': self.barn_id,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class EggProduction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chicken_id = db.Column(db.Integer, db.ForeignKey('chicken.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    eggs_count = db.Column(db.Integer, nullable=False)
    egg_weight = db.Column(db.Float, nullable=True)  # น้ำหนักไข่เฉลี่ย (กรัม)
    egg_quality = db.Column(db.String(50), nullable=True)  # เกรด A, B, C
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<EggProduction {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'chicken_id': self.chicken_id,
            'date': self.date.strftime('%Y-%m-%d'),
            'eggs_count': self.eggs_count,
            'egg_weight': self.egg_weight,
            'egg_quality': self.egg_quality,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 