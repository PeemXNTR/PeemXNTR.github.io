from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from flask import session
import json

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # สำหรับ flash messages

# สร้างโฟลเดอร์และฐานข้อมูล
Path("data").mkdir(exist_ok=True)

def get_db():
    db = sqlite3.connect('data/restaurant.db')
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    cursor = db.cursor()
    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS menu (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            image_url TEXT
        );
        
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            table_number INTEGER,
            total REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER,
            menu_item_id INTEGER,
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (menu_item_id) REFERENCES menu(id)
        );

        -- ตารางผู้ใช้
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        );

        -- ตารางโต๊ะ
        CREATE TABLE IF NOT EXISTS tables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            number INTEGER UNIQUE NOT NULL,
            status TEXT DEFAULT 'available',
            capacity INTEGER NOT NULL
        );

        -- ตารางการจอง
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            table_id INTEGER,
            reservation_date DATE NOT NULL,
            reservation_time TIME NOT NULL,
            guests INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (table_id) REFERENCES tables (id)
        );

        -- ตารางสถิติ
        CREATE TABLE IF NOT EXISTS statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date DATE NOT NULL,
            total_sales REAL NOT NULL,
            total_orders INTEGER NOT NULL
        );
    ''')
    db.commit()
    db.close()

init_db()

@app.route('/')
def landing():
    return render_template('landing.html')

@app.route('/menu')
def menu():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM menu ORDER BY category")
    menu_items = cursor.fetchall()
    return render_template('menu.html', menu_items=menu_items)

@app.route('/add_menu', methods=['GET', 'POST'])
def add_menu():
    if request.method == 'POST':
        name = request.form['name']
        price = float(request.form['price'])
        category = request.form['category']
        image_url = request.form['image_url']
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO menu (name, price, category, image_url) VALUES (?, ?, ?, ?)",
            (name, price, category, image_url)
        )
        db.commit()
        flash('เพิ่มเมนูสำเร็จ')
        return redirect(url_for('menu'))
    
    return render_template('add_menu.html')

@app.route('/menu/add', methods=['GET', 'POST'])
def add_menu_item():
    if request.method == 'POST':
        # TODO: Implement form handling logic here
        pass
    return render_template('add_menu.html')

@app.route('/order', methods=['GET', 'POST'])
def order():
    db = get_db()
    cursor = db.cursor()
    
    if request.method == 'POST':
        customer_name = request.form['customer_name']
        table_number = request.form['table_number']
        items = request.form.getlist('items[]')
        quantities = request.form.getlist('quantities[]')
        
        # คำนวณราคารวม
        total = 0
        for item_id, qty in zip(items, quantities):
            cursor.execute("SELECT price FROM menu WHERE id = ?", (item_id,))
            price = cursor.fetchone()['price']
            total += price * int(qty)
        
        # บันทึกออเดอร์
        cursor.execute(
            "INSERT INTO orders (customer_name, table_number, total) VALUES (?, ?, ?)",
            (customer_name, table_number, total)
        )
        order_id = cursor.lastrowid
        
        # บันทึกรายการอาหาร
        for item_id, qty in zip(items, quantities):
            cursor.execute(
                "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
                (order_id, item_id, qty)
            )
        
        db.commit()
        flash('บันทึกออเดอร์สำเร็จ')
        return redirect(url_for('orders'))
    
    cursor.execute("SELECT * FROM menu ORDER BY category")
    menu_items = cursor.fetchall()
    return render_template('order.html', menu_items=menu_items)

@app.route('/orders')
def orders():
    db = get_db()
    cursor = db.cursor()
    
    # ดึงข้อมูลออเดอร์พร้อมรายละเอียดเมนู
    cursor.execute("""
        SELECT o.id, o.customer_name, o.table_number, o.total, o.status, o.order_date,
               m.id as menu_id, m.name, m.price, m.image_url, oi.quantity
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN menu m ON oi.menu_item_id = m.id
        ORDER BY o.order_date DESC
    """)
    
    rows = cursor.fetchall()
    
    # จัดกลุ่มข้อมูลตามออเดอร์
    orders = {}
    for row in rows:
        order_id = row['id']
        if order_id not in orders:
            orders[order_id] = {
                'id': order_id,
                'customer_name': row['customer_name'],
                'table_number': row['table_number'],
                'total': row['total'],
                'status': row['status'],
                'order_date': row['order_date'],
                'order_items': []
            }
        
        orders[order_id]['order_items'].append({
            'name': row['name'],
            'price': row['price'],
            'quantity': row['quantity'],
            'image_url': row['image_url']
        })
    
    return render_template('orders.html', orders=orders.values())

@app.route('/update_order_status/<int:order_id>', methods=['POST'])
def update_order_status(order_id):
    status = request.form['status']
    db = get_db()
    cursor = db.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    db.commit()
    return jsonify({'success': True})

@app.route('/reservations', methods=['GET', 'POST'])
def reservations():
    if request.method == 'POST':
        customer_name = request.form['customer_name']
        phone = request.form['phone']
        date = request.form['date']
        time = request.form['time']
        guests = request.form['guests']
        
        db = get_db()
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO reservations 
            (customer_name, phone, reservation_date, reservation_time, guests)
            VALUES (?, ?, ?, ?, ?)
        """, (customer_name, phone, date, time, guests))
        db.commit()
        flash('การจองสำเร็จ')
        return redirect(url_for('reservations'))
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM reservations ORDER BY reservation_date, reservation_time")
    reservations = cursor.fetchall()
    return render_template('reservations.html', reservations=reservations)

@app.route('/delete_reservation/<int:id>', methods=['POST'])
def delete_reservation(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM reservations WHERE id = ?", (id,))
    db.commit()
    flash('ลบการจองเรียบร้อยแล้ว')
    return redirect(url_for('reservations'))

@app.route('/delete_order/<int:id>', methods=['POST'])
def delete_order(id):
    db = get_db()
    cursor = db.cursor()
    # ลบรายการในตาราง order_items ก่อน
    cursor.execute("DELETE FROM order_items WHERE order_id = ?", (id,))
    # จากนั้นลบออเดอร์
    cursor.execute("DELETE FROM orders WHERE id = ?", (id,))
    db.commit()
    flash('ลบออเดอร์เรียบร้อยแล้ว')
    return redirect(url_for('orders'))

@app.route('/analytics')
def analytics():
    db = get_db()
    cursor = db.cursor()
    
    # สถิติรายวัน
    cursor.execute("""
        SELECT 
            DATE(order_date) as date,
            COUNT(*) as total_orders,
            SUM(total) as total_sales,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
        FROM orders
        WHERE order_date >= DATE('now', '-30 day')
        GROUP BY DATE(order_date)
        ORDER BY date DESC
    """)
    daily_stats = cursor.fetchall()
    
    # เมนูยอดนิยม
    cursor.execute("""
        SELECT 
            m.name,
            m.price,
            COUNT(*) as order_count,
            SUM(oi.quantity) as total_quantity
        FROM order_items oi
        JOIN menu m ON oi.menu_item_id = m.id
        GROUP BY m.id
        ORDER BY order_count DESC
        LIMIT 10
    """)
    popular_items = cursor.fetchall()
    
    # สถิติการจองโต๊ะ
    cursor.execute("""
        SELECT 
            DATE(reservation_date) as date,
            COUNT(*) as total_reservations,
            SUM(guests) as total_guests
        FROM reservations
        WHERE reservation_date >= DATE('now', '-30 day')
        GROUP BY DATE(reservation_date)
        ORDER BY date DESC
    """)
    reservation_stats = cursor.fetchall()
    
    return render_template('analytics.html',
                         daily_stats=daily_stats,
                         popular_items=popular_items,
                         reservation_stats=reservation_stats)

if __name__ == '__main__':
    app.run(debug=True) 