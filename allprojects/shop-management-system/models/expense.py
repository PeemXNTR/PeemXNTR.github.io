from datetime import datetime
from models import db

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    category = db.Column(db.String(100), nullable=False)  # อาหาร, ยา, อุปกรณ์, ค่าจ้าง, อื่นๆ
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    payment_method = db.Column(db.String(50), nullable=True)  # เงินสด, โอน, เช็ค
    receipt_image = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Expense {self.date}: {self.amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'category': self.category,
            'amount': self.amount,
            'description': self.description,
            'payment_method': self.payment_method,
            'receipt_image': self.receipt_image,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 