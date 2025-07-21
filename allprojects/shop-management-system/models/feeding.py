from datetime import datetime
from models import db

class Feeding(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    food_type = db.Column(db.String(100), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    cost = db.Column(db.Float, nullable=False)
    barn_id = db.Column(db.Integer, db.ForeignKey('barn.id'), nullable=True)
    feed_formula_id = db.Column(db.Integer, db.ForeignKey('feed_formula.id'), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Feeding {self.date}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.strftime('%Y-%m-%d'),
            'food_type': self.food_type,
            'amount': self.amount,
            'cost': self.cost,
            'barn_id': self.barn_id,
            'feed_formula_id': self.feed_formula_id,
            'notes': self.notes,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }

class FeedFormula(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    protein_percentage = db.Column(db.Float, nullable=False)
    ingredients = db.Column(db.Text, nullable=False)  # JSON string
    target_chicken_type = db.Column(db.String(100), nullable=False)  # ไก่ไข่, ไก่เนื้อ, etc.
    cost_per_kg = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # ความสัมพันธ์
    feedings = db.relationship('Feeding', backref='feed_formula', lazy=True)
    
    def __repr__(self):
        return f'<FeedFormula {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'protein_percentage': self.protein_percentage,
            'ingredients': self.ingredients,
            'target_chicken_type': self.target_chicken_type,
            'cost_per_kg': self.cost_per_kg,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } 