from datetime import datetime
from models import db

class Sale(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    product_type = db.Column(db.String(100), nullable=False)  # ไข่, ไก่, มูลไก่, อื่นๆ
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(50), nullable=False)  # ฟอง, กิโลกรัม, ตัว
    price_per_unit = db.Column(db.Float, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('customer.id'), nullable=True)
    payment_status = db.Column(db.String(50), nullable=False, default='ชำระแล้ว')  # ชำระแล้ว, ค้างชำระ
    payment_method = db.Column(db.String(50), nullable=True)  # เงินสด, โอน, เช็ค
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # เปลี่ยนเป็นไม่กำหนด backref เพื่อป้องกันการซ้ำซ้อน
    customer = db.relationship('Customer', foreign_keys=[customer_id])
    
    def __repr__(self):
        return f'<Sale {self.date}: {self.total_amount}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'product_type': self.product_type,
            'quantity': self.quantity,
            'unit': self.unit,
            'price_per_unit': self.price_per_unit,
            'total_amount': self.total_amount,
            'customer_id': self.customer_id,
            'customer_name': self.customer.name if self.customer else '-',
            'payment_status': self.payment_status,
            'payment_method': self.payment_method,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 