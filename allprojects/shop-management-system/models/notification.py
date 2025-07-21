from datetime import datetime
from models import db

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)  # สุขภาพ, อาหาร, ไข่, ทั่วไป
    is_read = db.Column(db.Boolean, default=False)
    url = db.Column(db.String(255), nullable=True)  # URL ที่เกี่ยวข้องกับการแจ้งเตือน
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Notification {self.id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'category': self.category,
            'is_read': self.is_read,
            'url': self.url,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }
        
    @classmethod
    def create_notification(cls, user_id, message, category, url=None):
        notification = cls(
            user_id=user_id,
            message=message,
            category=category,
            url=url
        )
        db.session.add(notification)
        db.session.commit()
        return notification 