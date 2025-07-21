from datetime import datetime
from models import db

class HealthRecord(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chicken_id = db.Column(db.Integer, db.ForeignKey('chicken.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    symptoms = db.Column(db.Text, nullable=False)
    treatment = db.Column(db.Text, nullable=False)
    medicine = db.Column(db.String(255), nullable=True)
    vet_name = db.Column(db.String(100), nullable=True)
    status = db.Column(db.String(50), nullable=False, default='รักษา')  # รักษา, หายแล้ว
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<HealthRecord {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'chicken_id': self.chicken_id,
            'date': self.date.strftime('%Y-%m-%d'),
            'symptoms': self.symptoms,
            'treatment': self.treatment,
            'medicine': self.medicine,
            'vet_name': self.vet_name,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class Vaccination(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chicken_id = db.Column(db.Integer, db.ForeignKey('chicken.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    vaccine_name = db.Column(db.String(100), nullable=False)
    vaccine_batch = db.Column(db.String(100), nullable=True)
    next_dose_date = db.Column(db.Date, nullable=True)
    administered_by = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Vaccination {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'chicken_id': self.chicken_id,
            'date': self.date.strftime('%Y-%m-%d'),
            'vaccine_name': self.vaccine_name,
            'vaccine_batch': self.vaccine_batch,
            'next_dose_date': self.next_dose_date.strftime('%Y-%m-%d') if self.next_dose_date else None,
            'administered_by': self.administered_by,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 