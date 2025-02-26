import sqlite3

# เชื่อมต่อกับฐานข้อมูล
conn = sqlite3.connect('data/restaurant.db')
cursor = conn.cursor()

# เพิ่มคอลัมน์ category
try:
    cursor.execute('ALTER TABLE menu ADD COLUMN category TEXT DEFAULT "อาหารจานเดียว"')
    conn.commit()
    print("เพิ่มคอลัมน์ category สำเร็จ")
except sqlite3.OperationalError as e:
    print("คอลัมน์มีอยู่แล้วหรือมีข้อผิดพลาด:", e)

# เพิ่มคอลัมน์ image_url ถ้ายังไม่มี
try:
    cursor.execute('ALTER TABLE menu ADD COLUMN image_url TEXT')
    conn.commit()
    print("เพิ่มคอลัมน์ image_url สำเร็จ")
except sqlite3.OperationalError as e:
    print("คอลัมน์มีอยู่แล้วหรือมีข้อผิดพลาด:", e)

conn.close() 