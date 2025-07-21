from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date, timedelta
import os
import json
import uuid
import qrcode
from io import BytesIO
import base64
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import session
from dotenv import load_dotenv
import csv

# โหลดตั้งค่าจาก .env
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///farm.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'static/uploads')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16777216))

# สร้าง Jinja2 filter สำหรับจัดรูปแบบตัวเลข (ใส่คอมม่าทุกพันตัวเลข)
@app.template_filter('format_number')
def format_number(value):
    if value is None:
        return ""
    try:
        # แปลงค่าเป็นจำนวนเต็มหรือทศนิยม
        if isinstance(value, str):
            if '.' in value:
                value = float(value)
            else:
                value = int(value)
                
        # จัดรูปแบบตัวเลข
        if isinstance(value, int):
            return "{:,}".format(value)
        elif isinstance(value, float):
            return "{:,.2f}".format(value)
        else:
            return str(value)
    except (ValueError, TypeError):
        return str(value)

# สร้างโฟลเดอร์สำหรับอัปโหลดไฟล์และฐานข้อมูลหากไม่มีอยู่
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# สร้างโฟลเดอร์สำหรับไฟล์สำรองข้อมูล
os.makedirs('database', exist_ok=True)
os.makedirs('database/backups', exist_ok=True)

# เตรียม db และโหลดโมเดล
from models import db
db.init_app(app)

# นำเข้าโมเดลทั้งหมด
from models.chicken import Chicken
from models.feeding import Feeding, FeedFormula
from models.egg import EggCollection, EggProduction
from models.health import HealthRecord, Vaccination
from models.barn import Barn
from models.user import User
from models.notification import Notification
from models.sale import Sale
from models.expense import Expense
from models.customer import Customer

# สร้างฐานข้อมูลหากยังไม่มี
with app.app_context():
    db.create_all()
    
    # เพิ่มผู้ใช้เริ่มต้น (admin) หากยังไม่มี
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin = User(
            username='admin',
            email='admin@example.com',
            full_name='ผู้ดูแลระบบ',
            role='admin'
        )
        admin.set_password('admin123')
        db.session.add(admin)
        db.session.commit()
        print("สร้างผู้ใช้ admin เรียบร้อยแล้ว (รหัสผ่าน: admin123)")

# ฟังก์ชันตรวจสอบการล็อกอิน
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# ฟังก์ชันตรวจสอบสิทธิ์ Admin
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('กรุณาเข้าสู่ระบบก่อนใช้งาน', 'warning')
            return redirect(url_for('login'))
        
        user = User.query.get(session['user_id'])
        if user.role != 'admin':
            flash('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'danger')
            return redirect(url_for('dashboard'))
            
        return f(*args, **kwargs)
    return decorated_function

# เพิ่ม before_request เพื่อให้เริ่มต้นที่หน้า login
@app.before_request
def redirect_to_login():
    # รายการเส้นทางที่สามารถเข้าถึงได้โดยไม่ต้อง login
    exempt_routes = ['login', 'static']
    
    # ตรวจสอบว่าผู้ใช้ยังไม่ได้ล็อกอินและกำลังพยายามเข้าถึงเส้นทางที่ต้องล็อกอิน
    if 'user_id' not in session and request.endpoint not in exempt_routes:
        return redirect(url_for('login'))

# ฟังก์ชันสำหรับการสำรองข้อมูล
def backup_database(backup_type='csv'):
    backup_dir = 'database/backups'
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    if backup_type == 'csv':
        # สำรองข้อมูลเป็นไฟล์ CSV แยกตามตาราง
        tables = {
            'chickens': Chicken.query.all(),
            'feedings': Feeding.query.all(), 
            'egg_collections': EggCollection.query.all(),
            'barns': Barn.query.all(),
            'users': User.query.all(),
            'expenses': Expense.query.all(),
            'sales': Sale.query.all(),
            'customers': Customer.query.all()
        }
        
        backup_files = {}
        
        for table_name, data in tables.items():
            if not data:
                continue
                
            # แปลงข้อมูลเป็น dictionary
            records = [item.to_dict() for item in data]
            
            if records:
                filename = f"{backup_dir}/{table_name}_{timestamp}.csv"
                with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
                    writer = csv.DictWriter(f, fieldnames=records[0].keys())
                    writer.writeheader()
                    writer.writerows(records)
                backup_files[table_name] = filename
            
        return backup_files
    
    # สามารถเพิ่มรูปแบบการสำรองข้อมูลแบบอื่นได้ในอนาคต เช่น SQL dump

# เส้นทาง (routes) ของแอพพลิเคชัน
@app.route('/')
def index_redirect():
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    total_chickens = Chicken.query.count()
    total_eggs = db.session.query(db.func.sum(EggCollection.total_eggs)).scalar() or 0
    total_sales = db.session.query(db.func.sum(Sale.total_amount)).scalar() or 0
    total_expenses = db.session.query(db.func.sum(Expense.amount)).scalar() or 0
    profit = total_sales - total_expenses

    recent_eggs = EggCollection.query.order_by(EggCollection.date.desc()).limit(5).all()
    recent_sales = Sale.query.order_by(Sale.date.desc()).limit(5).all()
    recent_expenses = Expense.query.order_by(Expense.date.desc()).limit(5).all()
    
    # ข้อมูลสำหรับกราฟ
    eggs_data = {}
    sales_data = {}
    
    # ข้อมูลไข่รายวัน 7 วันล่าสุด
    last_7_days = [date.today() - timedelta(days=i) for i in range(6, -1, -1)]
    for day in last_7_days:
        egg_count = EggCollection.query.filter(EggCollection.date == day).with_entities(
            db.func.sum(EggCollection.total_eggs)).scalar() or 0
        eggs_data[day.strftime('%d/%m')] = egg_count
    
    # ข้อมูลยอดขายรายวัน 7 วันล่าสุด
    for day in last_7_days:
        sale_amount = Sale.query.filter(Sale.date == day).with_entities(
            db.func.sum(Sale.total_amount)).scalar() or 0
        sales_data[day.strftime('%d/%m')] = float(sale_amount)
    
    # แจ้งเตือนล่าสุด
    notifications = Notification.query.filter_by(is_read=False).order_by(Notification.created_at.desc()).limit(5).all()

    return render_template('index.html',
                         total_chickens=total_chickens,
                         total_eggs=total_eggs,
                         total_sales=total_sales,
                         total_expenses=total_expenses,
                         profit=profit,
                         recent_eggs=recent_eggs,
                         recent_sales=recent_sales,
                         recent_expenses=recent_expenses,
                         eggs_data=json.dumps(eggs_data),
                         sales_data=json.dumps(sales_data),
                         notifications=notifications)

@app.route('/chickens')
@login_required
def chickens():
    chickens = Chicken.query.all()
    return render_template('chickens.html', chickens=chickens)

@app.route('/add_chicken', methods=['GET', 'POST'])
@login_required
def add_chicken():
    if request.method == 'POST':
        chicken = Chicken(
            name=request.form['name'],
            breed=request.form['breed'],
            age=int(request.form['age']),
            weight=float(request.form['weight']),
            health_status=request.form['health_status'],
            egg_production_rate=float(request.form['egg_production_rate'])
        )
        db.session.add(chicken)
        db.session.commit()
        flash('เพิ่มข้อมูลไก่สำเร็จ!', 'success')
        return redirect(url_for('chickens'))
    return render_template('add_chicken.html')

@app.route('/edit_chicken/<int:chicken_id>', methods=['GET', 'POST'])
@login_required
def edit_chicken(chicken_id):
    chicken = Chicken.query.get_or_404(chicken_id)
    if request.method == 'POST':
        chicken.name = request.form['name']
        chicken.breed = request.form['breed']
        chicken.age = int(request.form['age'])
        chicken.weight = float(request.form['weight'])
        chicken.health_status = request.form['health_status']
        chicken.egg_production_rate = float(request.form['egg_production_rate'])
        db.session.commit()
        flash('แก้ไขข้อมูลไก่สำเร็จ!', 'success')
        return redirect(url_for('chickens'))
    return render_template('edit_chicken.html', chicken=chicken)

@app.route('/delete_chicken/<int:chicken_id>', methods=['POST'])
@login_required
def delete_chicken(chicken_id):
    chicken = Chicken.query.get_or_404(chicken_id)
    db.session.delete(chicken)
    db.session.commit()
    flash('ลบข้อมูลไก่สำเร็จ!', 'success')
    return redirect(url_for('chickens'))

@app.route('/feeding')
@login_required
def feeding():
    feedings = Feeding.query.order_by(Feeding.date.desc()).all()
    return render_template('feeding.html', feedings=feedings)

@app.route('/add_feeding', methods=['GET', 'POST'])
@login_required
def add_feeding():
    if request.method == 'POST':
        feeding = Feeding(
            date=datetime.strptime(request.form['date'], '%Y-%m-%d').date(),
            food_type=request.form['food_type'],
            amount=float(request.form['amount']),
            cost=float(request.form['cost'])
        )
        db.session.add(feeding)
        db.session.commit()
        flash('เพิ่มข้อมูลการให้อาหารสำเร็จ!', 'success')
        return redirect(url_for('feeding'))
    return render_template('add_feeding.html')

@app.route('/eggs')
@login_required
def eggs():
    egg_collections = EggCollection.query.order_by(EggCollection.date.desc()).all()
    return render_template('eggs.html', egg_collections=egg_collections)

@app.route('/add_eggs', methods=['GET', 'POST'])
@login_required
def add_eggs():
    if request.method == 'POST':
        egg_collection = EggCollection(
            date=datetime.strptime(request.form['date'], '%Y-%m-%d').date(),
            total_eggs=int(request.form['total_eggs']),
            broken_eggs=int(request.form['broken_eggs'])
        )
        db.session.add(egg_collection)
        db.session.commit()
        flash('เพิ่มข้อมูลการเก็บไข่สำเร็จ!', 'success')
        return redirect(url_for('eggs'))
    return render_template('add_eggs.html')

@app.route('/health')
@login_required
def health():
    health_records = HealthRecord.query.order_by(HealthRecord.date.desc()).all()
    return render_template('health.html', health_records=health_records)

@app.route('/add_health', methods=['GET', 'POST'])
@login_required
def add_health():
    if request.method == 'POST':
        health_record = HealthRecord(
            chicken_id=int(request.form['chicken_id']),
            date=datetime.strptime(request.form['date'], '%Y-%m-%d').date(),
            symptoms=request.form['symptoms'],
            treatment=request.form['treatment'],
            notes=request.form['notes']
        )
        db.session.add(health_record)
        db.session.commit()
        flash('เพิ่มข้อมูลสุขภาพไก่สำเร็จ!', 'success')
        return redirect(url_for('health'))
    chickens = Chicken.query.all()
    return render_template('add_health.html', chickens=chickens)

@app.route('/sales')
@login_required
def sales():
    sales = Sale.query.order_by(Sale.date.desc()).all()
    return render_template('sales.html', sales=sales)

@app.route('/add_sale', methods=['GET', 'POST'])
@login_required
def add_sale():
    if request.method == 'POST':
        try:
            quantity = int(request.form['quantity'])
            price_per_unit = float(request.form['price_per_egg'])
            
            # ตรวจสอบว่ามี customer_id ในฟอร์มหรือไม่
            if 'customer_id' in request.form and request.form['customer_id']:
                customer_id = int(request.form['customer_id'])
            else:
                # ถ้าไม่มี ให้แสดงข้อความแจ้งเตือนและกลับไปที่ฟอร์ม
                flash('กรุณาเลือกลูกค้า', 'danger')
                customers = Customer.query.all()
                return render_template('add_sale.html', customers=customers, today=date.today().strftime('%Y-%m-%d'))
            
            # ตรวจสอบว่ามีไข่เพียงพอหรือไม่
            total_eggs = db.session.query(db.func.sum(EggCollection.total_eggs)).scalar() or 0
            total_sold = db.session.query(db.func.sum(Sale.quantity)).filter(Sale.product_type == 'ไข่').scalar() or 0
            available_eggs = total_eggs - total_sold
            
            if quantity > available_eggs:
                flash(f'ไข่ในคลังไม่เพียงพอ! เหลืออยู่ {available_eggs:,} ฟอง', 'danger')
                customers = Customer.query.all()
                return render_template('add_sale.html', customers=customers, available_eggs=available_eggs, today=date.today().strftime('%Y-%m-%d'))
            
            sale = Sale(
                date=datetime.strptime(request.form['date'], '%Y-%m-%d').date(),
                product_type='ไข่',
                quantity=quantity,
                unit='ฟอง',
                price_per_unit=price_per_unit,
                total_amount=quantity * price_per_unit,
                customer_id=customer_id,
                payment_status='ชำระแล้ว',
                payment_method='เงินสด'
            )
            db.session.add(sale)
            db.session.commit()
            
            # คำนวณไข่คงเหลือหลังการขาย
            available_eggs -= quantity
            
            flash(f'เพิ่มข้อมูลการขายไข่สำเร็จ! (ไข่คงเหลือ: {available_eggs:,} ฟอง)', 'success')
            return redirect(url_for('sales'))
        except KeyError as e:
            # จัดการกรณีที่ไม่พบฟิลด์ในฟอร์ม
            flash(f'กรุณากรอกข้อมูลให้ครบถ้วน (ไม่พบข้อมูล {e})', 'danger')
            customers = Customer.query.all()
            return render_template('add_sale.html', customers=customers, today=date.today().strftime('%Y-%m-%d'))
        except ValueError as e:
            # จัดการกรณีที่แปลงค่าไม่ได้
            flash('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบและกรอกใหม่', 'danger')
            customers = Customer.query.all()
            return render_template('add_sale.html', customers=customers, today=date.today().strftime('%Y-%m-%d'))
            
    # คำนวณไข่คงเหลือในคลัง
    total_eggs = db.session.query(db.func.sum(EggCollection.total_eggs)).scalar() or 0
    total_sold = db.session.query(db.func.sum(Sale.quantity)).filter(Sale.product_type == 'ไข่').scalar() or 0
    available_eggs = total_eggs - total_sold
    
    customers = Customer.query.all()
    return render_template('add_sale.html', customers=customers, available_eggs=available_eggs, today=date.today().strftime('%Y-%m-%d'))

@app.route('/expenses')
@login_required
def expenses():
    expenses = Expense.query.order_by(Expense.date.desc()).all()
    return render_template('expenses.html', expenses=expenses)

@app.route('/add_expense', methods=['GET', 'POST'])
@login_required
def add_expense():
    if request.method == 'POST':
        expense = Expense(
            date=datetime.strptime(request.form['date'], '%Y-%m-%d').date(),
            category=request.form['category'],
            description=request.form['description'],
            amount=float(request.form['amount'])
        )
        db.session.add(expense)
        db.session.commit()
        flash('เพิ่มข้อมูลค่าใช้จ่ายสำเร็จ!', 'success')
        return redirect(url_for('expenses'))
    return render_template('add_expense.html')

@app.route('/customers')
@login_required
def customers():
    customers = Customer.query.all()
    return render_template('customers.html', customers=customers)

@app.route('/add_customer', methods=['GET', 'POST'])
@login_required
def add_customer():
    if request.method == 'POST':
        customer = Customer(
            name=request.form['name'],
            phone=request.form.get('phone', ''),
            email=request.form.get('email', ''),
            address=request.form.get('address', ''),
            customer_type=request.form.get('customer_type', 'ทั่วไป'),
            notes=request.form.get('notes', '')
        )
        db.session.add(customer)
        db.session.commit()
        flash('เพิ่มข้อมูลลูกค้าสำเร็จ!', 'success')
        return redirect(url_for('customers'))
    return render_template('add_customer.html')

@app.route('/edit_customer/<int:customer_id>', methods=['GET', 'POST'])
@login_required
def edit_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    if request.method == 'POST':
        customer.name = request.form['name']
        customer.phone = request.form.get('phone', '')
        customer.email = request.form.get('email', '')
        customer.address = request.form.get('address', '')
        customer.customer_type = request.form.get('customer_type', 'ทั่วไป')
        customer.notes = request.form.get('notes', '')
        db.session.commit()
        flash('อัปเดตข้อมูลลูกค้าสำเร็จ!', 'success')
        return redirect(url_for('customers'))
    return render_template('edit_customer.html', customer=customer)

@app.route('/delete_customer/<int:customer_id>', methods=['POST'])
@login_required
def delete_customer(customer_id):
    customer = Customer.query.get_or_404(customer_id)
    db.session.delete(customer)
    db.session.commit()
    flash('ลบข้อมูลลูกค้าสำเร็จ!', 'success')
    return redirect(url_for('customers'))

@app.route('/notifications')
@login_required
def notifications():
    # ดึงข้อมูลการแจ้งเตือนทั้งหมด
    all_notifications = Notification.query.order_by(Notification.created_at.desc()).all()
    
    # แบ่งประเภทการแจ้งเตือน
    unread_notifications = [n for n in all_notifications if not n.is_read]
    read_notifications = [n for n in all_notifications if n.is_read]
    
    # ข้อมูลแจ้งเตือนตามประเภท
    notifications_by_type = {
        'อาหาร': [n for n in all_notifications if n.type == 'อาหาร'],
        'สุขภาพ': [n for n in all_notifications if n.type == 'สุขภาพ'],
        'ไข่': [n for n in all_notifications if n.type == 'ไข่'],
        'วัคซีน': [n for n in all_notifications if n.type == 'วัคซีน'],
    }
    
    return render_template('notifications.html', 
                           all_notifications=all_notifications,
                           unread_notifications=unread_notifications,
                           read_notifications=read_notifications,
                           notifications_by_type=notifications_by_type)

@app.route('/notification/<int:notification_id>/mark_as_read', methods=['POST'])
@login_required
def mark_notification_as_read(notification_id):
    notification = Notification.query.get_or_404(notification_id)
    notification.is_read = True
    db.session.commit()
    return jsonify({'success': True})

@app.route('/notifications/mark_all_as_read', methods=['POST'])
@login_required
def mark_all_notifications_as_read():
    Notification.query.filter_by(is_read=False).update({Notification.is_read: True})
    db.session.commit()
    return jsonify({'success': True})

@app.route('/notification/<int:notification_id>/delete', methods=['POST'])
@login_required
def delete_notification(notification_id):
    notification = Notification.query.get_or_404(notification_id)
    db.session.delete(notification)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['user_role'] = user.role
            flash(f'ยินดีต้อนรับ {user.full_name}!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'danger')
    
    return render_template('login.html', now=datetime.now())

@app.route('/logout')
def logout():
    session.clear()
    flash('คุณได้ออกจากระบบเรียบร้อยแล้ว', 'success')
    return redirect(url_for('login'))

# API endpoints
@app.route('/api/chickens', methods=['GET'])
@login_required
def api_chickens():
    chickens = Chicken.query.all()
    return jsonify([chicken.to_dict() for chicken in chickens])

@app.route('/api/chicken/<int:chicken_id>', methods=['GET'])
@login_required
def api_chicken(chicken_id):
    chicken = Chicken.query.get_or_404(chicken_id)
    return jsonify(chicken.to_dict())

@app.route('/api/egg_collections', methods=['GET'])
@login_required
def api_egg_collections():
    collections = EggCollection.query.order_by(EggCollection.date.desc()).all()
    return jsonify([{
        'id': c.id,
        'date': c.date.strftime('%Y-%m-%d'),
        'total_eggs': c.total_eggs,
        'broken_eggs': c.broken_eggs,
        'barn_id': c.barn_id,
        'notes': c.notes
    } for c in collections])

@app.route('/api/barn/<int:barn_id>/chickens', methods=['GET'])
@login_required
def api_barn_chickens(barn_id):
    barn = Barn.query.get_or_404(barn_id)
    return jsonify([chicken.to_dict() for chicken in barn.chickens])

@app.route('/api/dashboard_data', methods=['GET'])
@login_required
def api_dashboard_data():
    # ข้อมูลสรุปสำหรับ dashboard
    total_chickens = Chicken.query.count()
    total_eggs = db.session.query(db.func.sum(EggCollection.total_eggs)).scalar() or 0
    total_sales = db.session.query(db.func.sum(Sale.total_amount)).scalar() or 0
    total_expenses = db.session.query(db.func.sum(Expense.amount)).scalar() or 0
    profit = total_sales - total_expenses
    
    return jsonify({
        'total_chickens': total_chickens,
        'total_eggs': total_eggs,
        'total_sales': total_sales,
        'total_expenses': total_expenses,
        'profit': profit
    })

# โมเดลสำหรับการตั้งค่าระบบ
class Setting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), nullable=False, unique=True)
    value = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Setting {self.key}>'

# ฟังก์ชันสำหรับอ่านค่าตั้งค่า
def get_setting(key, default=None):
    setting = Setting.query.filter_by(key=key).first()
    if setting:
        return setting.value
    return default

# ฟังก์ชันสำหรับกำหนดค่าตั้งค่า
def set_setting(key, value, description=None):
    setting = Setting.query.filter_by(key=key).first()
    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
    else:
        setting = Setting(key=key, value=value, description=description)
        db.session.add(setting)
    db.session.commit()
    return setting

# เส้นทางสำหรับหน้าตั้งค่า
@app.route('/settings')
@login_required
def settings():
    # ข้อมูลฟาร์ม
    farm_settings = {
        'farm_name': get_setting('farm_name', os.getenv('FARM_NAME', 'ฟาร์มไก่ชุมชน')),
        'farm_address': get_setting('farm_address', os.getenv('FARM_ADDRESS', '')),
        'farm_phone': get_setting('farm_phone', os.getenv('FARM_PHONE', '')),
        'farm_email': get_setting('farm_email', os.getenv('FARM_EMAIL', ''))
    }
    
    # ตั้งค่าระบบ
    system_settings = {
        'notification_enabled': get_setting('notification_enabled', 'true') == 'true',
        'auto_backup': get_setting('auto_backup', 'false') == 'true',
        'backup_frequency': get_setting('backup_frequency', 'weekly')
    }
    
    return render_template('settings.html', 
                           farm_settings=farm_settings,
                           system_settings=system_settings,
                           current_user=User.query.get(session['user_id']))

# บันทึกข้อมูลฟาร์ม
@app.route('/settings/save_farm', methods=['POST'])
@login_required
def save_farm_settings():
    farm_name = request.form.get('farm_name', '')
    farm_address = request.form.get('farm_address', '')
    farm_phone = request.form.get('farm_phone', '')
    farm_email = request.form.get('farm_email', '')
    
    set_setting('farm_name', farm_name, 'ชื่อฟาร์ม')
    set_setting('farm_address', farm_address, 'ที่อยู่ฟาร์ม')
    set_setting('farm_phone', farm_phone, 'เบอร์โทรศัพท์ฟาร์ม')
    set_setting('farm_email', farm_email, 'อีเมลฟาร์ม')
    
    flash('บันทึกข้อมูลฟาร์มเรียบร้อยแล้ว', 'success')
    return redirect(url_for('settings'))

# บันทึกตั้งค่าระบบ
@app.route('/settings/save_system', methods=['POST'])
@login_required
def save_system_settings():
    notification_enabled = 'true' if request.form.get('notification_enabled') else 'false'
    auto_backup = 'true' if request.form.get('auto_backup') else 'false'
    backup_frequency = request.form.get('backup_frequency', 'weekly')
    
    set_setting('notification_enabled', notification_enabled, 'เปิดใช้งานการแจ้งเตือน')
    set_setting('auto_backup', auto_backup, 'เปิดใช้งานการสำรองข้อมูลอัตโนมัติ')
    set_setting('backup_frequency', backup_frequency, 'ความถี่ในการสำรองข้อมูล')
    
    flash('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว', 'success')
    return redirect(url_for('settings'))

# สำรองข้อมูล
@app.route('/backup', methods=['POST'])
@login_required
@admin_required
def backup_data():
    backup_type = request.form.get('backup_type', 'csv')
    
    if backup_type == 'csv':
        backup_files = backup_database('csv')
        
        # สร้างไฟล์ zip สำหรับดาวน์โหลด
        import zipfile
        import tempfile
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.zip')
        try:
            with zipfile.ZipFile(temp_file.name, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for table_name, file_path in backup_files.items():
                    zipf.write(file_path, os.path.basename(file_path))
            
            # ส่งไฟล์ zip กลับไปยังผู้ใช้
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            return send_file(
                temp_file.name,
                as_attachment=True,
                download_name=f'farm_backup_{timestamp}.zip',
                mimetype='application/zip'
            )
        finally:
            # ลบไฟล์ชั่วคราวหลังจากการดาวน์โหลด
            os.unlink(temp_file.name)
            # ลบไฟล์ CSV ที่สร้างขึ้นระหว่างการสำรองข้อมูล
            for file_path in backup_files.values():
                if os.path.exists(file_path):
                    os.unlink(file_path)
    
    elif backup_type == 'sql':
        # สำรองฐานข้อมูล SQL
        import sqlite3
        import tempfile
        
        db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
        
        if db_path.startswith('/'):
            db_path = db_path[1:]
            
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.sql')
        try:
            # สร้างคำสั่ง SQL สำหรับการสำรองข้อมูล
            conn = sqlite3.connect(db_path)
            with open(temp_file.name, 'w') as f:
                for line in conn.iterdump():
                    f.write(f'{line}\n')
            conn.close()
            
            # ส่งไฟล์ SQL กลับไปยังผู้ใช้
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            return send_file(
                temp_file.name,
                as_attachment=True,
                download_name=f'farm_backup_{timestamp}.sql',
                mimetype='text/plain'
            )
        finally:
            # ลบไฟล์ชั่วคราวหลังจากการดาวน์โหลด
            os.unlink(temp_file.name)
    
    flash('การสำรองข้อมูลล้มเหลว', 'danger')
    return redirect(url_for('settings'))

# นำเข้าข้อมูล
@app.route('/import', methods=['POST'])
@login_required
@admin_required
def import_data():
    # ตรวจสอบว่ามีไฟล์ที่อัปโหลดหรือไม่
    if 'import_file' not in request.files:
        flash('ไม่พบไฟล์อัปโหลด', 'danger')
        return redirect(url_for('settings'))
    
    file = request.files['import_file']
    
    # ตรวจสอบว่าชื่อไฟล์ว่างหรือไม่
    if file.filename == '':
        flash('ไม่ได้เลือกไฟล์', 'danger')
        return redirect(url_for('settings'))
    
    # ตรวจสอบว่าเป็นไฟล์ CSV หรือไม่
    if not file.filename.endswith('.csv'):
        flash('โปรดอัปโหลดไฟล์ CSV เท่านั้น', 'danger')
        return redirect(url_for('settings'))
    
    import_type = request.form.get('import_type', '')
    
    try:
        # อ่านไฟล์ CSV
        file_content = file.read().decode('utf-8-sig').splitlines()
        
        # ตรวจสอบประเภทการนำเข้าข้อมูล
        if import_type == 'chickens':
            import_chickens(file_content)
        elif import_type == 'feedings':
            import_feedings(file_content)
        elif import_type == 'egg_collections':
            import_egg_collections(file_content)
        elif import_type == 'barns':
            import_barns(file_content)
        elif import_type == 'customers':
            import_customers(file_content)
        else:
            flash(f'ไม่รองรับประเภทการนำเข้าข้อมูล {import_type}', 'danger')
            return redirect(url_for('settings'))
        
        flash(f'นำเข้าข้อมูล {import_type} สำเร็จ', 'success')
    except Exception as e:
        flash(f'การนำเข้าข้อมูลล้มเหลว: {str(e)}', 'danger')
    
    return redirect(url_for('settings'))

# ฟังก์ชันสำหรับนำเข้าข้อมูลไก่
def import_chickens(csv_file):
    required_columns = ['name', 'breed', 'age', 'weight', 'health_status', 'egg_production_rate']
    
    reader = csv.DictReader(csv_file)
    headers = reader.fieldnames
    
    for col in required_columns:
        if col not in headers:
            raise ValueError(f'ไม่พบคอลัมน์ {col} ในไฟล์ CSV')
    
    for row in reader:
        # ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
        existing_chicken = Chicken.query.filter_by(name=row['name']).first()
        if existing_chicken:
            # อัปเดตข้อมูลที่มีอยู่
            existing_chicken.breed = row['breed']
            existing_chicken.age = int(row['age'])
            existing_chicken.weight = float(row['weight'])
            existing_chicken.health_status = row['health_status']
            existing_chicken.egg_production_rate = float(row['egg_production_rate'])
            # อัปเดตฟิลด์อื่นๆ ถ้ามี
            if 'barn_id' in row and row['barn_id']:
                existing_chicken.barn_id = int(row['barn_id'])
            if 'notes' in row and row['notes']:
                existing_chicken.notes = row['notes']
        else:
            # สร้างข้อมูลใหม่
            chicken = Chicken(
                name=row['name'],
                breed=row['breed'],
                age=int(row['age']),
                weight=float(row['weight']),
                health_status=row['health_status'],
                egg_production_rate=float(row['egg_production_rate'])
            )
            if 'barn_id' in row and row['barn_id']:
                chicken.barn_id = int(row['barn_id'])
            if 'notes' in row and row['notes']:
                chicken.notes = row['notes']
            db.session.add(chicken)
    
    db.session.commit()

# ฟังก์ชันสำหรับนำเข้าข้อมูลการให้อาหาร
def import_feedings(csv_file):
    required_columns = ['date', 'food_type', 'amount', 'cost']
    
    reader = csv.DictReader(csv_file)
    headers = reader.fieldnames
    
    for col in required_columns:
        if col not in headers:
            raise ValueError(f'ไม่พบคอลัมน์ {col} ในไฟล์ CSV')
    
    for row in reader:
        # แปลงวันที่จาก string เป็น date
        feeding_date = datetime.strptime(row['date'], '%Y-%m-%d').date()
        
        # สร้างข้อมูลใหม่
        feeding = Feeding(
            date=feeding_date,
            food_type=row['food_type'],
            amount=float(row['amount']),
            cost=float(row['cost'])
        )
        if 'barn_id' in row and row['barn_id']:
            feeding.barn_id = int(row['barn_id'])
        if 'feed_formula_id' in row and row['feed_formula_id']:
            feeding.feed_formula_id = int(row['feed_formula_id'])
        if 'notes' in row and row['notes']:
            feeding.notes = row['notes']
        
        db.session.add(feeding)
    
    db.session.commit()

# ฟังก์ชันสำหรับนำเข้าข้อมูลการเก็บไข่
def import_egg_collections(csv_file):
    required_columns = ['date', 'total_eggs', 'broken_eggs']
    
    reader = csv.DictReader(csv_file)
    headers = reader.fieldnames
    
    for col in required_columns:
        if col not in headers:
            raise ValueError(f'ไม่พบคอลัมน์ {col} ในไฟล์ CSV')
    
    for row in reader:
        # แปลงวันที่จาก string เป็น date
        collection_date = datetime.strptime(row['date'], '%Y-%m-%d').date()
        
        # ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
        existing_collection = EggCollection.query.filter_by(date=collection_date).first()
        if 'barn_id' in row and row['barn_id']:
            existing_collection = EggCollection.query.filter_by(date=collection_date, barn_id=int(row['barn_id'])).first()
        
        if existing_collection:
            # อัปเดตข้อมูลที่มีอยู่
            existing_collection.total_eggs = int(row['total_eggs'])
            existing_collection.broken_eggs = int(row['broken_eggs'])
            if 'notes' in row and row['notes']:
                existing_collection.notes = row['notes']
        else:
            # สร้างข้อมูลใหม่
            collection = EggCollection(
                date=collection_date,
                total_eggs=int(row['total_eggs']),
                broken_eggs=int(row['broken_eggs'])
            )
            if 'barn_id' in row and row['barn_id']:
                collection.barn_id = int(row['barn_id'])
            if 'notes' in row and row['notes']:
                collection.notes = row['notes']
            
            db.session.add(collection)
    
    db.session.commit()

# ฟังก์ชันสำหรับนำเข้าข้อมูลโรงเรือน
def import_barns(csv_file):
    required_columns = ['name', 'capacity']
    
    reader = csv.DictReader(csv_file)
    headers = reader.fieldnames
    
    for col in required_columns:
        if col not in headers:
            raise ValueError(f'ไม่พบคอลัมน์ {col} ในไฟล์ CSV')
    
    for row in reader:
        # ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
        existing_barn = Barn.query.filter_by(name=row['name']).first()
        if existing_barn:
            # อัปเดตข้อมูลที่มีอยู่
            existing_barn.capacity = int(row['capacity'])
            if 'status' in row and row['status']:
                existing_barn.status = row['status']
            if 'description' in row and row['description']:
                existing_barn.description = row['description']
            if 'environment' in row and row['environment']:
                existing_barn.environment = row['environment']
        else:
            # สร้างข้อมูลใหม่
            barn = Barn(
                name=row['name'],
                capacity=int(row['capacity'])
            )
            if 'status' in row and row['status']:
                barn.status = row['status']
            if 'description' in row and row['description']:
                barn.description = row['description']
            if 'environment' in row and row['environment']:
                barn.environment = row['environment']
            
            db.session.add(barn)
    
    db.session.commit()

# ฟังก์ชันสำหรับนำเข้าข้อมูลลูกค้า
def import_customers(csv_file):
    required_columns = ['name']
    
    reader = csv.DictReader(csv_file)
    headers = reader.fieldnames
    
    for col in required_columns:
        if col not in headers:
            raise ValueError(f'ไม่พบคอลัมน์ {col} ในไฟล์ CSV')
    
    for row in reader:
        # ตรวจสอบว่ามีข้อมูลซ้ำหรือไม่
        existing_customer = Customer.query.filter_by(name=row['name']).first()
        if existing_customer:
            # อัปเดตข้อมูลที่มีอยู่
            if 'contact_person' in row and row['contact_person']:
                existing_customer.contact_person = row['contact_person']
            if 'phone' in row and row['phone']:
                existing_customer.phone = row['phone']
            if 'email' in row and row['email']:
                existing_customer.email = row['email']
            if 'address' in row and row['address']:
                existing_customer.address = row['address']
            if 'customer_type' in row and row['customer_type']:
                existing_customer.customer_type = row['customer_type']
            if 'notes' in row and row['notes']:
                existing_customer.notes = row['notes']
        else:
            # สร้างข้อมูลใหม่
            customer = Customer(name=row['name'])
            if 'contact_person' in row and row['contact_person']:
                customer.contact_person = row['contact_person']
            if 'phone' in row and row['phone']:
                customer.phone = row['phone']
            if 'email' in row and row['email']:
                customer.email = row['email']
            if 'address' in row and row['address']:
                customer.address = row['address']
            if 'customer_type' in row and row['customer_type']:
                customer.customer_type = row['customer_type']
            if 'notes' in row and row['notes']:
                customer.notes = row['notes']
            
            db.session.add(customer)
    
    db.session.commit()

if __name__ == '__main__':
    app.run(debug=True) 