# บทที่ 3
# การพัฒนาระบบ

## 3.1 สภาพแวดล้อมในการพัฒนา

การพัฒนาระบบร้านขายรองเท้าออนไลน์ใช้สภาพแวดล้อมในการพัฒนาดังนี้

### 3.1.1 ฮาร์ดแวร์
- คอมพิวเตอร์ส่วนบุคคล (PC) หรือโน้ตบุ๊ก
  - หน่วยประมวลผล: Intel Core i5 หรือสูงกว่า
  - หน่วยความจำ (RAM): 8 GB หรือสูงกว่า
  - พื้นที่จัดเก็บข้อมูล: 256 GB หรือสูงกว่า

### 3.1.2 ซอฟต์แวร์
- ระบบปฏิบัติการ: Windows 10, macOS, หรือ Linux
- เครื่องมือพัฒนา:
  - Visual Studio Code: ใช้เป็น IDE หลักในการพัฒนา
  - Git: ใช้สำหรับการควบคุมเวอร์ชัน
  - GitHub: ใช้สำหรับการจัดการโปรเจค
  - DB Browser for SQLite: ใช้สำหรับการจัดการฐานข้อมูล
- ภาษาและเฟรมเวิร์ค:
  - Python 3.8 หรือสูงกว่า
  - Flask 2.3.2
  - Flask-SQLAlchemy 2.5.1
  - SQLAlchemy 1.4.49
  - Werkzeug 2.3.7
  - HTML5, CSS3, JavaScript
  - Bootstrap 5

## 3.2 โครงสร้างของระบบ

ระบบร้านขายรองเท้าออนไลน์มีโครงสร้างหลักดังนี้

```
project/
│
├── app.py                  # ไฟล์หลักของแอปพลิเคชัน
├── shoes.db                # ฐานข้อมูล SQLite
├── requirements.txt        # รายการ dependencies
│
├── static/                 # ไฟล์ static
│   └── uploads/            # โฟลเดอร์สำหรับเก็บรูปภาพที่อัปโหลด
│
└── templates/              # ไฟล์ HTML templates
    ├── base.html           # เทมเพลตหลัก
    ├── index.html          # หน้าหลัก
    ├── login.html          # หน้าเข้าสู่ระบบ
    ├── register.html       # หน้าลงทะเบียน
    ├── profile.html        # หน้าโปรไฟล์
    ├── shoe_detail.html    # หน้ารายละเอียดสินค้า
    ├── cart.html           # หน้าตะกร้าสินค้า
    ├── checkout.html       # หน้าชำระเงิน
    ├── order.html          # หน้าคำสั่งซื้อ
    ├── orders.html         # หน้าประวัติการสั่งซื้อ
    ├── receipt.html        # หน้าใบเสร็จรับเงิน
    ├── search.html         # หน้าค้นหาสินค้า
    ├── admin_dashboard.html # หน้าแดชบอร์ดสำหรับผู้ดูแลระบบ
    ├── admin_shoes.html    # หน้าจัดการสินค้าสำหรับผู้ดูแลระบบ
    ├── admin_shoe_form.html # หน้าฟอร์มเพิ่ม/แก้ไขสินค้า
    ├── admin_orders.html   # หน้าจัดการคำสั่งซื้อสำหรับผู้ดูแลระบบ
    ├── order_detail.html   # หน้ารายละเอียดคำสั่งซื้อ
    └── footer.html         # ส่วนท้ายของเว็บไซต์
```

## 3.3 การพัฒนาฐานข้อมูล

ระบบร้านขายรองเท้าออนไลน์ใช้ SQLite เป็นฐานข้อมูลและ SQLAlchemy เป็น ORM (Object-Relational Mapping) ในการจัดการฐานข้อมูล โดยมีการกำหนดโมเดลต่างๆ ดังนี้

### 3.3.1 โมเดล User

```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    profile_image = db.Column(db.String(120), default='default.jpg')
    is_admin = db.Column(db.Boolean, default=False)
    
    # Relationships
    cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade="all, delete-orphan")
    orders = db.relationship('Order', backref='user', lazy=True)
    reviews = db.relationship('Review', backref='user', lazy=True)
```

### 3.3.2 โมเดล ShoeCategory

```python
class ShoeCategory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('shoe_category.id'), nullable=True)
    
    # Relationships
    subcategories = db.relationship('ShoeCategory', backref=db.backref('parent', remote_side=[id]), lazy=True)
    shoes = db.relationship('Shoe', backref='category_rel', lazy=True)
```

### 3.3.3 โมเดล Shoe

```python
class Shoe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(200), nullable=True)
    stock = db.Column(db.Integer, default=0)
    category = db.Column(db.String(50), nullable=True)
    category_id = db.Column(db.Integer, db.ForeignKey('shoe_category.id'), nullable=True)
    
    # Relationships
    sizes = db.relationship('ShoeSize', backref='shoe', lazy=True, cascade="all, delete-orphan")
    cart_items = db.relationship('CartItem', backref='shoe', lazy=True)
    order_items = db.relationship('OrderItem', backref='shoe', lazy=True)
    reviews = db.relationship('Review', backref='shoe', lazy=True, cascade="all, delete-orphan")
```

### 3.3.4 โมเดลอื่นๆ

นอกจากโมเดลหลักที่กล่าวมาแล้ว ยังมีโมเดลอื่นๆ ที่ใช้ในระบบ ได้แก่ ShoeSize, CartItem, Order, OrderItem, และ Review

## 3.4 การพัฒนาส่วนติดต่อผู้ใช้

การพัฒนาส่วนติดต่อผู้ใช้ของระบบร้านขายรองเท้าออนไลน์ใช้ HTML, CSS, JavaScript และ Bootstrap เป็นหลัก โดยมีการพัฒนาหน้าต่างๆ ดังนี้

### 3.4.1 หน้าหลัก (Home Page)

หน้าหลักของระบบแสดงสินค้าแนะนำและหมวดหมู่สินค้า โดยใช้ Bootstrap Carousel สำหรับแสดงสินค้าแนะนำและ Bootstrap Card สำหรับแสดงหมวดหมู่สินค้า

```html
<!-- ตัวอย่างโค้ด HTML สำหรับหน้าหลัก -->
<div id="carouselExampleIndicators" class="carousel slide" data-bs-ride="carousel">
    <div class="carousel-indicators">
        <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
        <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="1" aria-label="Slide 2"></button>
        <button type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide-to="2" aria-label="Slide 3"></button>
    </div>
    <div class="carousel-inner">
        <div class="carousel-item active">
            <img src="..." class="d-block w-100" alt="...">
        </div>
        <div class="carousel-item">
            <img src="..." class="d-block w-100" alt="...">
        </div>
        <div class="carousel-item">
            <img src="..." class="d-block w-100" alt="...">
        </div>
    </div>
    <button class="carousel-control-prev" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
    </button>
    <button class="carousel-control-next" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
    </button>
</div>
```

### 3.4.2 หน้ารายละเอียดสินค้า (Product Detail Page)

หน้ารายละเอียดสินค้าแสดงข้อมูลของสินค้า รวมถึงรูปภาพ ราคา ขนาด และรีวิวจากผู้ใช้ โดยใช้ Bootstrap Grid System สำหรับจัดวางองค์ประกอบต่างๆ

### 3.4.3 หน้าตะกร้าสินค้า (Cart Page)

หน้าตะกร้าสินค้าแสดงรายการสินค้าที่ผู้ใช้เลือกซื้อ โดยใช้ Bootstrap Table สำหรับแสดงรายการสินค้าและ Bootstrap Form สำหรับการแก้ไขจำนวนสินค้า

### 3.4.4 หน้าชำระเงิน (Checkout Page)

หน้าชำระเงินให้ผู้ใช้กรอกข้อมูลการจัดส่งและเลือกวิธีการชำระเงิน โดยใช้ Bootstrap Form สำหรับการกรอกข้อมูลและ Bootstrap Card สำหรับแสดงสรุปคำสั่งซื้อ

## 3.5 การพัฒนาส่วนควบคุม (Controller)

ส่วนควบคุมของระบบร้านขายรองเท้าออนไลน์พัฒนาด้วย Flask โดยมีการกำหนด route ต่างๆ สำหรับการจัดการกับคำขอจากผู้ใช้ ดังนี้

### 3.5.1 การจัดการผู้ใช้

```python
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่
        existing_user = User.query.filter_by(username=username).first()
        if existing_user:
            flash('ชื่อผู้ใช้นี้มีอยู่แล้ว กรุณาเลือกชื่อผู้ใช้อื่น', 'danger')
            return redirect(url_for('register'))
        
        # สร้างผู้ใช้ใหม่
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, email=email, password_hash=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        
        flash('ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ', 'success')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        # ตรวจสอบข้อมูลผู้ใช้
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            flash('เข้าสู่ระบบสำเร็จ', 'success')
            return redirect(url_for('index'))
        else:
            flash('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    flash('ออกจากระบบสำเร็จ', 'success')
    return redirect(url_for('index'))
```

### 3.5.2 การจัดการสินค้า

```python
@app.route('/')
def index():
    # ดึงข้อมูลสินค้าแนะนำ
    featured_shoes = Shoe.query.limit(6).all()
    return render_template('index.html', featured_shoes=featured_shoes)

@app.route('/shoe/<int:shoe_id>')
def shoe_detail(shoe_id):
    # ดึงข้อมูลสินค้า
    shoe = Shoe.query.get_or_404(shoe_id)
    # ดึงข้อมูลรีวิวของสินค้า
    reviews = Review.query.filter_by(shoe_id=shoe_id).all()
    return render_template('shoe_detail.html', shoe=shoe, reviews=reviews)

@app.route('/search')
def search():
    # ค้นหาสินค้า
    query = request.args.get('query', '')
    category_id = request.args.get('category', '')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')
    
    # สร้าง query object
    shoes_query = Shoe.query
    
    # กรองตามชื่อสินค้า
    if query:
        shoes_query = shoes_query.filter(Shoe.name.ilike(f'%{query}%'))
    
    # กรองตามหมวดหมู่
    if category_id:
        shoes_query = shoes_query.filter_by(category_id=category_id)
    
    # กรองตามราคา
    if min_price:
        shoes_query = shoes_query.filter(Shoe.price >= float(min_price))
    if max_price:
        shoes_query = shoes_query.filter(Shoe.price <= float(max_price))
    
    # ดึงข้อมูลสินค้า
    shoes = shoes_query.all()
    
    return render_template('search.html', shoes=shoes, query=query)
```

### 3.5.3 การจัดการตะกร้าสินค้า

```python
@app.route('/cart')
def cart():
    # ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบเพื่อดูตะกร้าสินค้า', 'danger')
        return redirect(url_for('login'))
    
    # ดึงข้อมูลสินค้าในตะกร้า
    cart_items = CartItem.query.filter_by(user_id=session['user_id']).all()
    
    # คำนวณราคารวม
    total_price = sum(item.shoe.price * item.quantity for item in cart_items)
    
    return render_template('cart.html', cart_items=cart_items, total_price=total_price)

@app.route('/add_to_cart/<int:shoe_id>', methods=['POST'])
def add_to_cart(shoe_id):
    # ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบเพื่อเพิ่มสินค้าลงในตะกร้า', 'danger')
        return redirect(url_for('login'))
    
    # ดึงข้อมูลสินค้า
    shoe = Shoe.query.get_or_404(shoe_id)
    
    # ดึงข้อมูลขนาดและจำนวน
    size = request.form.get('size')
    quantity = int(request.form.get('quantity', 1))
    
    # ตรวจสอบว่ามีสินค้านี้ในตะกร้าแล้วหรือไม่
    cart_item = CartItem.query.filter_by(user_id=session['user_id'], shoe_id=shoe_id, size=size).first()
    
    if cart_item:
        # ถ้ามีสินค้านี้ในตะกร้าแล้ว ให้เพิ่มจำนวน
        cart_item.quantity += quantity
    else:
        # ถ้ายังไม่มีสินค้านี้ในตะกร้า ให้สร้างรายการใหม่
        cart_item = CartItem(user_id=session['user_id'], shoe_id=shoe_id, size=size, quantity=quantity)
        db.session.add(cart_item)
    
    db.session.commit()
    
    flash('เพิ่มสินค้าลงในตะกร้าสำเร็จ', 'success')
    return redirect(url_for('cart'))
```

### 3.5.4 การจัดการคำสั่งซื้อ

```python
@app.route('/checkout', methods=['GET', 'POST'])
def checkout():
    # ตรวจสอบว่าผู้ใช้เข้าสู่ระบบหรือไม่
    if 'user_id' not in session:
        flash('กรุณาเข้าสู่ระบบเพื่อชำระเงิน', 'danger')
        return redirect(url_for('login'))
    
    # ดึงข้อมูลสินค้าในตะกร้า
    cart_items = CartItem.query.filter_by(user_id=session['user_id']).all()
    
    # ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่
    if not cart_items:
        flash('ไม่มีสินค้าในตะกร้า', 'danger')
        return redirect(url_for('cart'))
    
    # คำนวณราคารวม
    total_price = sum(item.shoe.price * item.quantity for item in cart_items)
    
    if request.method == 'POST':
        # ดึงข้อมูลการจัดส่งและวิธีการชำระเงิน
        shipping_address = request.form.get('shipping_address')
        payment_method = request.form.get('payment_method')
        
        # สร้างคำสั่งซื้อใหม่
        new_order = Order(
            user_id=session['user_id'],
            total_price=total_price,
            status='รอการชำระเงิน',
            order_date=datetime.now(),
            shipping_address=shipping_address,
            payment_method=payment_method
        )
        db.session.add(new_order)
        db.session.flush()  # เพื่อให้ได้ order_id
        
        # สร้างรายการสินค้าในคำสั่งซื้อ
        for item in cart_items:
            order_item = OrderItem(
                order_id=new_order.id,
                shoe_id=item.shoe_id,
                size=item.size,
                quantity=item.quantity,
                price=item.shoe.price
            )
            db.session.add(order_item)
            
            # ลดจำนวนสินค้าในสต็อก
            shoe_size = ShoeSize.query.filter_by(shoe_id=item.shoe_id, size=item.size).first()
            if shoe_size:
                shoe_size.stock -= item.quantity
        
        # ลบสินค้าในตะกร้า
        for item in cart_items:
            db.session.delete(item)
        
        db.session.commit()
        
        flash('สั่งซื้อสำเร็จ', 'success')
        return redirect(url_for('order', order_id=new_order.id))
    
    return render_template('checkout.html', cart_items=cart_items, total_price=total_price)
```

## 3.6 การรักษาความปลอดภัย

ระบบร้านขายรองเท้าออนไลน์มีการรักษาความปลอดภัยในหลายด้าน ดังนี้

### 3.6.1 การเข้ารหัสรหัสผ่าน

ระบบใช้ Werkzeug ในการเข้ารหัสรหัสผ่านของผู้ใช้ โดยใช้ฟังก์ชัน `generate_password_hash` และ `check_password_hash`

### 3.6.2 การตรวจสอบสิทธิ์

ระบบมีการตรวจสอบสิทธิ์ของผู้ใช้ก่อนที่จะอนุญาตให้เข้าถึงฟังก์ชันการทำงานต่างๆ โดยใช้ decorator `login_required` และ `admin_required`

```python
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('กรุณาเข้าสู่ระบบ', 'danger')
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('กรุณาเข้าสู่ระบบ', 'danger')
            return redirect(url_for('login', next=request.url))
        
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            flash('คุณไม่มีสิทธิ์เข้าถึงหน้านี้', 'danger')
            return redirect(url_for('index'))
        
        return f(*args, **kwargs)
    return decorated_function
```

### 3.6.3 การป้องกัน CSRF

ระบบมีการป้องกัน Cross-Site Request Forgery (CSRF) โดยใช้ Flask-WTF และ CSRF token

## 3.7 การทดสอบระบบเบื้องต้น

ในระหว่างการพัฒนาระบบ มีการทดสอบระบบเบื้องต้นเพื่อตรวจสอบการทำงานของฟังก์ชันต่างๆ โดยใช้ Flask Testing และการทดสอบด้วยมือ (Manual Testing) ซึ่งผลการทดสอบเบื้องต้นพบว่าระบบสามารถทำงานได้ตามที่ออกแบบไว้

## 3.8 ปัญหาและอุปสรรคในการพัฒนา

ในระหว่างการพัฒนาระบบ พบปัญหาและอุปสรรคดังนี้

1. **การจัดการสต็อกสินค้า**: การจัดการสต็อกสินค้าตามขนาดมีความซับซ้อน เนื่องจากต้องคำนึงถึงการลดจำนวนสินค้าในสต็อกเมื่อมีการสั่งซื้อ
2. **การอัปโหลดรูปภาพ**: การจัดการกับการอัปโหลดรูปภาพและการแสดงผลรูปภาพมีความซับซ้อน
3. **การจัดการกับการชำระเงิน**: การเชื่อมต่อกับระบบชำระเงินภายนอกมีความซับซ้อน

อย่างไรก็ตาม ปัญหาและอุปสรรคเหล่านี้ได้รับการแก้ไขในระหว่างการพัฒนาระบบ ทำให้ระบบสามารถทำงานได้อย่างมีประสิทธิภาพ
