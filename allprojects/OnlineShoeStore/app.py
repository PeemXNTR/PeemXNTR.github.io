from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key'

# ตั้งค่าฐานข้อมูล
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'shoes.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ตั้งค่าการอัปโหลดไฟล์
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# สร้างโฟลเดอร์สำหรับเก็บรูปภาพถ้ายังไม่มี
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

db = SQLAlchemy(app)

# แทนที่ @app.before_first_request
with app.app_context():
    db.create_all()  # สร้างตารางในฐานข้อมูลก่อน

@app.context_processor
def inject_categories():
    try:
        main_categories = ShoeCategory.query.filter_by(parent_id=None).all()
        subcategories = ShoeCategory.query.filter(ShoeCategory.parent_id != None).all()
    except:
        # ถ้ายังไม่มีตาราง ShoeCategory ให้ส่งค่าว่างกลับไป
        main_categories = []
        subcategories = []
    return {
        'main_categories': main_categories,
        'subcategories': subcategories
    }

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    profile_image = db.Column(db.String(200), default='https://cdn-icons-png.flaticon.com/512/1077/1077114.png')
    is_admin = db.Column(db.Boolean, default=False)
    orders = db.relationship('Order', backref='user', lazy=True)
    cart_items = db.relationship('CartItem', backref='user', lazy=True)

class ShoeCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('shoe_category.id'), nullable=True)
    subcategories = db.relationship('ShoeCategory', backref=db.backref('parent', remote_side=[id]), lazy=True)
    shoes = db.relationship('Shoe', backref='shoe_category', lazy=True)

class Shoe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(200))
    stock = db.Column(db.Integer, default=0)
    category = db.Column(db.String(50))
    category_id = db.Column(db.Integer, db.ForeignKey('shoe_category.id'), nullable=True)
    sizes = db.relationship('ShoeSize', backref='shoe', lazy=True)
    reviews = db.relationship('Review', backref='shoe', lazy=True)

class ShoeSize(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shoe_id = db.Column(db.Integer, db.ForeignKey('shoe.id'), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    stock = db.Column(db.Integer, default=0)

class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    shoe_id = db.Column(db.Integer, db.ForeignKey('shoe.id'), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, default=1)
    shoe = db.relationship('Shoe', backref=db.backref('cart_items', lazy=True))

    @property
    def subtotal(self):
        return self.shoe.price * self.quantity

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    order_date = db.Column(db.DateTime, default=datetime.utcnow)
    shipping_address = db.Column(db.Text, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)
    order_items = db.relationship('OrderItem', backref='order', lazy=True)

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    shoe_id = db.Column(db.Integer, db.ForeignKey('shoe.id'), nullable=False)
    size = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    shoe = db.relationship('Shoe', backref=db.backref('order_items', lazy=True))

class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    shoe_id = db.Column(db.Integer, db.ForeignKey('shoe.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text)
    date = db.Column(db.DateTime, default=datetime.utcnow)

def init_db():
    try:
        # สร้างผู้ดูแลระบบ
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(
                username='admin',
                email='admin@example.com',
                password_hash=generate_password_hash('admin123'),
                is_admin=True
            )
            db.session.add(admin)
            db.session.commit()
            print("เพิ่มผู้ดูแลระบบเรียบร้อยแล้ว")
        
        # เพิ่มหมวดหมู่เริ่มต้น
        init_categories()
        
        # เพิ่มสินค้าตัวอย่าง
        if Shoe.query.count() == 0:
            # ดึงหมวดหมู่จากฐานข้อมูล
            running_category = ShoeCategory.query.filter_by(name='รองเท้าวิ่ง').first()
            
            # รองเท้าตัวอย่าง 1
            shoe1 = Shoe(
                name='Nike Air Max 270',
                price=4500,
                description='รองเท้าวิ่งที่มีระบบรองรับแรงกระแทกสูง เหมาะสำหรับการวิ่งระยะไกล',
                image_url='https://static.nike.com/a/images/c_limit,w_592,f_auto/t_product_v1/i1-665455a5-45de-40fb-945f-c1852b82400d/air-max-270-mens-shoes-KkLcGR.png',
                category='รองเท้าวิ่ง',
                category_id=running_category.id if running_category else None
            )
            db.session.add(shoe1)
            db.session.flush()
            
            # เพิ่มไซส์และสต็อก
            for size in range(39, 45):
                shoe_size = ShoeSize(
                    shoe_id=shoe1.id,
                    size=size,
                    stock=10
                )
                db.session.add(shoe_size)
            
            # รองเท้าตัวอย่าง 2
            shoe2 = Shoe(
                name='Adidas Ultraboost',
                price=5200,
                description='รองเท้าวิ่งที่มีความยืดหยุ่นสูง ให้ความรู้สึกนุ่มสบายขณะสวมใส่',
                image_url='https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/fbaf991a78bc4896a3e9ad7800abcec6_9366/Ultraboost_22_Shoes_Black_GZ0127_01_standard.jpg',
                category='รองเท้าวิ่ง',
                category_id=running_category.id if running_category else None
            )
            db.session.add(shoe2)
            db.session.flush()
            
            # เพิ่มไซส์และสต็อก
            for size in range(39, 45):
                shoe_size = ShoeSize(
                    shoe_id=shoe2.id,
                    size=size,
                    stock=8
                )
                db.session.add(shoe_size)
            
            db.session.commit()
            print("เพิ่มสินค้าตัวอย่างเรียบร้อยแล้ว")
    except Exception as e:
        db.session.rollback()
        print(f"เกิดข้อผิดพลาดในการเพิ่มข้อมูลเริ่มต้น: {e}")

def init_categories():
    try:
        # ตรวจสอบว่ามีหมวดหมู่หลักอยู่แล้วหรือไม่
        if ShoeCategory.query.count() == 0:
            # หมวดหมู่หลัก
            running = ShoeCategory(name='รองเท้าวิ่ง')
            casual = ShoeCategory(name='รองเท้าลำลอง')
            sport = ShoeCategory(name='รองเท้ากีฬา')
            fashion = ShoeCategory(name='รองเท้าแฟชั่น')
            
            db.session.add_all([running, casual, sport, fashion])
            db.session.flush()
            
            # หมวดหมู่ย่อยของรองเท้าวิ่ง
            road_running = ShoeCategory(name='รองเท้าวิ่งถนน', parent_id=running.id)
            trail_running = ShoeCategory(name='รองเท้าวิ่งเทรล', parent_id=running.id)
            
            # หมวดหมู่ย่อยของรองเท้ากีฬา
            football = ShoeCategory(name='รองเท้าฟุตบอล', parent_id=sport.id)
            basketball = ShoeCategory(name='รองเท้าบาสเกตบอล', parent_id=sport.id)
            tennis = ShoeCategory(name='รองเท้าเทนนิส', parent_id=sport.id)
            
            # หมวดหมู่ย่อยของรองเท้าแฟชั่น
            sneakers = ShoeCategory(name='รองเท้าผ้าใบ', parent_id=fashion.id)
            boots = ShoeCategory(name='รองเท้าบูท', parent_id=fashion.id)
            
            # หมวดหมู่ย่อยของรองเท้าลำลอง
            slip_on = ShoeCategory(name='รองเท้าสลิปออน', parent_id=casual.id)
            loafers = ShoeCategory(name='รองเท้าโลฟเฟอร์', parent_id=casual.id)
            
            db.session.add_all([road_running, trail_running, football, basketball, tennis, sneakers, boots, slip_on, loafers])
            
            db.session.commit()
            print("เพิ่มหมวดหมู่เรียบร้อยแล้ว")
    except Exception as e:
        db.session.rollback()
        print(f"เกิดข้อผิดพลาดในการเพิ่มหมวดหมู่: {e}")

@app.route('/')
def index():
    shoes = Shoe.query.all()
    main_categories = ShoeCategory.query.filter_by(parent_id=None).all()
    user = None
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
    return render_template('index.html', shoes=shoes, main_categories=main_categories, user=user)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        if User.query.filter_by(username=username).first():
            flash('ชื่อผู้ใช้นี้มีอยู่แล้ว')
            return redirect(url_for('register'))
            
        user = User(
            username=username,
            email=email,
            password_hash=generate_password_hash(password)
        )
        db.session.add(user)
        db.session.commit()
        flash('ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
        
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['profile_image'] = user.profile_image
            flash(f'ยินดีต้อนรับ {user.username}')
            return redirect(url_for('index'))
            
        flash('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('ออกจากระบบสำเร็จ')
    return redirect(url_for('index'))

@app.route('/shoe/<int:id>')
def shoe_detail(id):
    shoe = Shoe.query.get_or_404(id)
    reviews = Review.query.filter_by(shoe_id=id).all()
    return render_template('shoe_detail.html', shoe=shoe, reviews=reviews)

@app.route('/cart')
def cart():
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
    
    cart_items = CartItem.query.filter_by(user_id=session['user_id']).all()
    total = sum(item.subtotal for item in cart_items)
    return render_template('cart.html', cart_items=cart_items, total=total)

@app.route('/add_to_cart/<int:shoe_id>', methods=['POST'])
def add_to_cart(shoe_id):
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
    
    if 'size' not in request.form:
        flash('กรุณาเลือกขนาดรองเท้า')
        return redirect(url_for('shoe_detail', id=shoe_id))
    
    try:
        size = int(request.form['size'])
        quantity = int(request.form.get('quantity', 1))
        
        if quantity < 1:
            flash('จำนวนสินค้าต้องมากกว่า 0')
            return redirect(url_for('shoe_detail', id=shoe_id))
        
        shoe_size = ShoeSize.query.filter_by(shoe_id=shoe_id, size=size).first()
        if not shoe_size:
            flash('ขนาดรองเท้าที่เลือกไม่มีในระบบ')
            return redirect(url_for('shoe_detail', id=shoe_id))
        
        if shoe_size.stock < quantity:
            flash(f'สินค้าคงเหลือไม่เพียงพอ (เหลือ {shoe_size.stock} คู่)')
            return redirect(url_for('shoe_detail', id=shoe_id))
        
        # ตรวจสอบว่ามีสินค้าชิ้นนี้ในตะกร้าแล้วหรือไม่
        existing_item = CartItem.query.filter_by(
            user_id=session['user_id'],
            shoe_id=shoe_id,
            size=size
        ).first()
        
        if existing_item:
            if existing_item.quantity + quantity > shoe_size.stock:
                flash(f'ไม่สามารถเพิ่มจำนวนได้ เนื่องจากสินค้าคงเหลือไม่เพียงพอ')
                return redirect(url_for('cart'))
            existing_item.quantity += quantity
            flash('อัพเดตจำนวนสินค้าในตะกร้าเรียบร้อย')
        else:
            cart_item = CartItem(
                user_id=session['user_id'],
                shoe_id=shoe_id,
                size=size,
                quantity=quantity
            )
            db.session.add(cart_item)
            flash('เพิ่มสินค้าลงตะกร้าเรียบร้อย')
        
        db.session.commit()
        return redirect(url_for('cart'))
        
    except ValueError:
        flash('ข้อมูลไม่ถูกต้อง')
        return redirect(url_for('shoe_detail', id=shoe_id))

@app.route('/checkout', methods=['GET', 'POST'])
def checkout():
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
    
    # ดึงข้อมูลตะกร้าสินค้า
    cart_items = CartItem.query.filter_by(user_id=session['user_id']).all()
    total = sum(item.subtotal for item in cart_items)
        
    if request.method == 'POST':
        if not cart_items:
            flash('ไม่มีสินค้าในตะกร้า')
            return redirect(url_for('cart'))
            
        # ใช้ .get() เพื่อป้องกัน BadRequestKeyError
        shipping_address = request.form.get('shipping_address', '')
        payment_method = request.form.get('payment_method', 'unknown')
        
        # ตรวจสอบความถูกต้องของข้อมูล
        if not shipping_address:
            flash('กรุณาระบุที่อยู่จัดส่ง')
            return render_template('checkout.html', cart_items=cart_items, total=total)
        
        # สร้างคำสั่งซื้อ
        order = Order(
            user_id=session['user_id'],
            total_price=total,
            shipping_address=shipping_address,
            payment_method=payment_method
        )
        db.session.add(order)
        db.session.flush()  # เพื่อให้ได้ order.id
        
        # เพิ่มรายการสินค้าในคำสั่งซื้อ
        for cart_item in cart_items:
            order_item = OrderItem(
                order_id=order.id,
                shoe_id=cart_item.shoe_id,
                size=cart_item.size,
                quantity=cart_item.quantity,
                price=cart_item.shoe.price
            )
            db.session.add(order_item)
            
            # อัพเดทสต็อก
            shoe_size = ShoeSize.query.filter_by(shoe_id=cart_item.shoe_id, size=cart_item.size).first()
            if shoe_size:
                shoe_size.stock -= cart_item.quantity
            
            # ลบจากตะกร้า
            db.session.delete(cart_item)
            
        try:
            db.session.commit()
            flash('สั่งซื้อสินค้าสำเร็จ ขอบคุณสำหรับการสั่งซื้อ')
            
            # ใช้ redirect_to เพื่อกำหนดหน้าที่จะไปหลังสั่งซื้อ
            redirect_to = request.form.get('redirect_to', 'index')
            
            # ถ้าต้องการใช้ order_confirmation ในอนาคต สามารถเพิ่มเงื่อนไขได้
            # if redirect_to == 'order_confirmation':
            #    return redirect(url_for('order_confirmation', order_id=order.id))
            
            return redirect(url_for(redirect_to))
        except Exception as e:
            db.session.rollback()
            flash(f'เกิดข้อผิดพลาด: {str(e)}')
            return render_template('checkout.html', cart_items=cart_items, total=total)
        
    # สำหรับคำขอ GET หรือกรณีที่ POST แล้วมีปัญหา
    return render_template('checkout.html', cart_items=cart_items, total=total)

@app.route('/review/<int:shoe_id>', methods=['POST'])
def add_review(shoe_id):
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
        
    rating = int(request.form['rating'])
    comment = request.form['comment']
    
    review = Review(
        shoe_id=shoe_id,
        user_id=session['user_id'],
        rating=rating,
        comment=comment
    )
    db.session.add(review)
    db.session.commit()
    
    flash('เพิ่มรีวิวสำเร็จ')
    return redirect(url_for('shoe_detail', id=shoe_id))

@app.route('/search')
def search():
    query = request.args.get('q', '')
    category_id = request.args.get('category_id', '')
    subcategory_id = request.args.get('subcategory_id', '')
    
    shoes = Shoe.query
    if query:
        shoes = shoes.filter(Shoe.name.ilike(f'%{query}%'))
    
    if subcategory_id:
        shoes = shoes.filter(Shoe.category_id == subcategory_id)
    elif category_id:
        # ถ้าเลือกหมวดหมู่หลัก ให้แสดงสินค้าในหมวดหมู่หลักและหมวดหมู่ย่อยทั้งหมด
        subcategories = ShoeCategory.query.filter_by(parent_id=category_id).all()
        subcategory_ids = [int(category_id)] + [sub.id for sub in subcategories]
        shoes = shoes.filter(Shoe.category_id.in_(subcategory_ids))
        
    shoes = shoes.all()
    
    # ดึงข้อมูลหมวดหมู่ทั้งหมด
    main_categories = ShoeCategory.query.filter_by(parent_id=None).all()
    
    # ถ้ามีการเลือกหมวดหมู่หลัก ให้ดึงหมวดหมู่ย่อย
    subcategories = []
    if category_id:
        subcategories = ShoeCategory.query.filter_by(parent_id=category_id).all()
    
    return render_template('search.html', 
                          shoes=shoes, 
                          query=query, 
                          main_categories=main_categories,
                          subcategories=subcategories,
                          selected_category_id=category_id,
                          selected_subcategory_id=subcategory_id)

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
        
    user = User.query.get(session['user_id'])
    
    if request.method == 'POST':
        # อัปเดตข้อมูลผู้ใช้
        user.username = request.form['username']
        
        # จัดการอัปโหลดรูปภาพ
        if 'profile_image' in request.files:
            file = request.files['profile_image']
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
                unique_filename = f"{user.id}_{filename}"
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                user.profile_image = f"/static/uploads/{unique_filename}"
                session['profile_image'] = user.profile_image
        
        db.session.commit()
        session['username'] = user.username
        flash('อัปเดตโปรไฟล์สำเร็จ')
        return redirect(url_for('profile'))
        
    return render_template('profile.html', user=user)

@app.route('/orders')
def orders():
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบเพื่อดูประวัติการสั่งซื้อ')
        return redirect(url_for('login'))
        
    orders = Order.query.filter_by(user_id=session['user_id']).order_by(Order.order_date.desc()).all()
    
    return render_template('orders.html', orders=orders)

@app.route('/order/<int:order_id>')
def order_detail(order_id):
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
        
    order = Order.query.get_or_404(order_id)
    if order.user_id != session['user_id'] and not is_admin():
        flash('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
        return redirect(url_for('index'))
        
    return render_template('order_detail.html', order=order)

@app.route('/receipt/<int:order_id>')
def generate_receipt(order_id):
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
        
    order = Order.query.get_or_404(order_id)
    if order.user_id != session['user_id'] and not is_admin():
        flash('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
        return redirect(url_for('index'))
        
    return render_template('receipt.html', order=order)

@app.route('/order_confirmation/<int:order_id>')
def order_confirmation(order_id):
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
        
    order = Order.query.get_or_404(order_id)
    if order.user_id != session['user_id']:
        flash('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
        return redirect(url_for('index'))
        
    return render_template('order_confirmation.html', order=order)

@app.route('/update_cart_item/<int:item_id>', methods=['POST'])
def update_cart_item(item_id):
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
    
    cart_item = CartItem.query.get_or_404(item_id)
    if cart_item.user_id != session['user_id']:
        flash('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
        return redirect(url_for('cart'))
    
    action = request.form.get('action')
    shoe_size = ShoeSize.query.filter_by(shoe_id=cart_item.shoe_id, size=cart_item.size).first()
    
    if action == 'increase':
        if shoe_size and shoe_size.stock > cart_item.quantity:
            cart_item.quantity += 1
            flash('อัพเดตจำนวนสินค้าเรียบร้อย')
        else:
            flash('สินค้าคงเหลือไม่เพียงพอ')
    elif action == 'decrease':
        if cart_item.quantity > 1:
            cart_item.quantity -= 1
            flash('อัพเดตจำนวนสินค้าเรียบร้อย')
        else:
            db.session.delete(cart_item)
            flash('ลบสินค้าออกจากตะกร้าเรียบร้อย')
    
    db.session.commit()
    return redirect(url_for('cart'))

@app.route('/remove_from_cart/<int:item_id>', methods=['POST'])
def remove_from_cart(item_id):
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบ')
        return redirect(url_for('login'))
    
    cart_item = CartItem.query.get_or_404(item_id)
    if cart_item.user_id != session['user_id']:
        flash('ไม่มีสิทธิ์เข้าถึงข้อมูลนี้')
        return redirect(url_for('cart'))
    
    db.session.delete(cart_item)
    db.session.commit()
    flash('ลบสินค้าออกจากตะกร้าสำเร็จ')
    return redirect(url_for('cart'))

def is_admin():
    if 'user_id' not in session:
        return False
    user = User.query.get(session['user_id'])
    return user and user.is_admin

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('กรุณาเข้าสู่ระบบ')
            return redirect(url_for('login'))
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            flash('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/admin')
@admin_required
def admin_dashboard():
    total_shoes = Shoe.query.count()
    total_orders = Order.query.count()
    total_users = User.query.count()
    latest_shoes = Shoe.query.order_by(Shoe.id.desc()).limit(5).all()
    
    return render_template('admin_dashboard.html',
                         total_shoes=total_shoes,
                         total_orders=total_orders,
                         total_users=total_users,
                         latest_shoes=latest_shoes)

@app.route('/admin/shoes')
@admin_required
def admin_shoes():
    shoes = Shoe.query.all()
    return render_template('admin_shoes.html', shoes=shoes)

@app.route('/admin/shoe/add', methods=['GET', 'POST'])
@admin_required
def admin_add_shoe():
    if request.method == 'POST':
        name = request.form['name']
        price = float(request.form['price'])
        description = request.form['description']
        category_id = request.form.get('category_id')
        
        # สร้างสินค้าใหม่
        shoe = Shoe(
            name=name,
            price=price,
            description=description,
            category_id=category_id
        )
        
        # จัดการรูปภาพ
        if 'image' in request.files:
            file = request.files['image']
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                shoe.image_url = f"/static/uploads/{filename}"
        
        db.session.add(shoe)
        db.session.flush()  # เพื่อให้ได้ ID ของรองเท้า
        
        # จัดการสต็อกตามไซส์
        for size in range(36, 45):
            stock = int(request.form.get(f'size_{size}', 0))
            if stock > 0:
                shoe_size = ShoeSize(
                    shoe_id=shoe.id,
                    size=size,
                    stock=stock
                )
                db.session.add(shoe_size)
        
        db.session.commit()
        flash('เพิ่มสินค้าสำเร็จ')
        return redirect(url_for('admin_shoes'))
    
    # ดึงข้อมูลหมวดหมู่ทั้งหมด
    categories = ShoeCategory.query.all()
    return render_template('admin_shoe_form.html', categories=categories)

@app.route('/admin/shoe/edit/<int:id>', methods=['GET', 'POST'])
@admin_required
def admin_edit_shoe(id):
    shoe = Shoe.query.get_or_404(id)
    
    if request.method == 'POST':
        shoe.name = request.form['name']
        shoe.price = float(request.form['price'])
        shoe.description = request.form['description']
        shoe.category_id = request.form.get('category_id')
        
        # จัดการรูปภาพ
        if 'image' in request.files and request.files['image'].filename:
            file = request.files['image']
            if allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
                shoe.image_url = f"/static/uploads/{filename}"
        
        # อัปเดตสต็อกตามไซส์
        for size in range(36, 45):
            stock = int(request.form.get(f'size_{size}', 0))
            shoe_size = ShoeSize.query.filter_by(shoe_id=shoe.id, size=size).first()
            
            if shoe_size:
                shoe_size.stock = stock
            elif stock > 0:
                shoe_size = ShoeSize(
                    shoe_id=shoe.id,
                    size=size,
                    stock=stock
                )
                db.session.add(shoe_size)
        
        db.session.commit()
        flash('แก้ไขสินค้าสำเร็จ')
        return redirect(url_for('admin_shoes'))
    
    # ดึงข้อมูลหมวดหมู่ทั้งหมด
    categories = ShoeCategory.query.all()
    return render_template('admin_shoe_form.html', shoe=shoe, categories=categories)

@app.route('/admin/shoe/delete/<int:id>', methods=['POST'])
@admin_required
def admin_delete_shoe(id):
    shoe = Shoe.query.get_or_404(id)
    
    # ลบไฟล์รูปภาพ
    if shoe.image_url and shoe.image_url.startswith('/static/uploads/'):
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], os.path.basename(shoe.image_url))
        if os.path.exists(image_path):
            os.remove(image_path)
    
    # ลบข้อมูลที่เกี่ยวข้อง
    ShoeSize.query.filter_by(shoe_id=id).delete()
    CartItem.query.filter_by(shoe_id=id).delete()
    Review.query.filter_by(shoe_id=id).delete()
    
    db.session.delete(shoe)
    db.session.commit()
    
    flash('ลบสินค้าสำเร็จ')
    return redirect(url_for('admin_shoes'))

@app.route('/admin/orders')
@admin_required
def admin_orders():
    orders = Order.query.order_by(Order.order_date.desc()).all()
    return render_template('admin_orders.html', orders=orders)

@app.route('/admin/orders/pending')
@admin_required
def admin_pending_orders():
    orders = Order.query.filter_by(status='pending').order_by(Order.order_date.desc()).all()
    return render_template('admin_orders.html', orders=orders, pending_only=True)

@app.route('/admin/order/<int:id>/status', methods=['POST'])
@admin_required
def admin_update_order_status(id):
    order = Order.query.get_or_404(id)
    status = request.form.get('status')
    if status in ['pending', 'processing', 'shipped', 'delivered', 'cancelled']:
        order.status = status
        db.session.commit()
        flash('อัปเดตสถานะออเดอร์สำเร็จ')
    return redirect(url_for('admin_orders'))

@app.route('/api/subcategories/<int:category_id>')
def get_subcategories(category_id):
    subcategories = ShoeCategory.query.filter_by(parent_id=category_id).all()
    return jsonify([{'id': sub.id, 'name': sub.name} for sub in subcategories])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # สร้างตารางในฐานข้อมูลก่อน
        init_db()  # แล้วจึงเรียกใช้ init_db() เพื่อเพิ่มข้อมูลเริ่มต้น
    app.run(debug=True) 