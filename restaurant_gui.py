import tkinter as tk
from tkinter import ttk, messagebox
import sqlite3
from pathlib import Path

class RestaurantGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("ระบบจัดการร้านอาหาร")
        self.root.geometry("800x600")

        # เชื่อมต่อ SQLite
        Path("data").mkdir(exist_ok=True)
        self.conn = sqlite3.connect('data/restaurant.db')
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        
        # สร้างตาราง
        self.create_tables()
        
        # สร้าง GUI
        self.create_gui()
        
    def create_tables(self):
        self.cursor.executescript('''
            CREATE TABLE IF NOT EXISTS menu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                price REAL NOT NULL
            );
            
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT NOT NULL,
                total REAL NOT NULL,
                order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                menu_item_id INTEGER,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (menu_item_id) REFERENCES menu(id)
            );
        ''')
        self.conn.commit()

    def create_gui(self):
        # สร้าง Notebook สำหรับแท็บต่างๆ
        notebook = ttk.Notebook(self.root)
        notebook.pack(expand=True, fill='both', padx=10, pady=5)

        # แท็บเมนูอาหาร
        menu_frame = ttk.Frame(notebook)
        notebook.add(menu_frame, text='เมนูอาหาร')
        self.create_menu_tab(menu_frame)

        # แท็บสั่งอาหาร
        order_frame = ttk.Frame(notebook)
        notebook.add(order_frame, text='สั่งอาหาร')
        self.create_order_tab(order_frame)

        # แท็บประวัติการสั่ง
        history_frame = ttk.Frame(notebook)
        notebook.add(history_frame, text='ประวัติการสั่ง')
        self.create_history_tab(history_frame)

    def create_menu_tab(self, parent):
        # ส่วนเพิ่มเมนู
        add_frame = ttk.LabelFrame(parent, text="เพิ่มเมนูใหม่")
        add_frame.pack(fill='x', padx=5, pady=5)

        ttk.Label(add_frame, text="ชื่อเมนู:").grid(row=0, column=0, padx=5, pady=5)
        self.menu_name = ttk.Entry(add_frame)
        self.menu_name.grid(row=0, column=1, padx=5, pady=5)

        ttk.Label(add_frame, text="ราคา:").grid(row=0, column=2, padx=5, pady=5)
        self.menu_price = ttk.Entry(add_frame)
        self.menu_price.grid(row=0, column=3, padx=5, pady=5)

        ttk.Button(add_frame, text="เพิ่มเมนู", command=self.add_menu).grid(row=0, column=4, padx=5, pady=5)

        # แสดงรายการเมนู
        list_frame = ttk.LabelFrame(parent, text="รายการเมนูทั้งหมด")
        list_frame.pack(fill='both', expand=True, padx=5, pady=5)

        columns = ('name', 'price')
        self.menu_tree = ttk.Treeview(list_frame, columns=columns, show='headings')
        self.menu_tree.heading('name', text='ชื่อเมนู')
        self.menu_tree.heading('price', text='ราคา')
        self.menu_tree.pack(fill='both', expand=True)

        self.refresh_menu()

    def create_order_tab(self, parent):
        # ข้อมูลลูกค้า
        customer_frame = ttk.LabelFrame(parent, text="ข้อมูลการสั่ง")
        customer_frame.pack(fill='x', padx=5, pady=5)

        ttk.Label(customer_frame, text="ชื่อลูกค้า:").grid(row=0, column=0, padx=5, pady=5)
        self.customer_name = ttk.Entry(customer_frame)
        self.customer_name.grid(row=0, column=1, padx=5, pady=5)

        # เลือกเมนู
        select_frame = ttk.LabelFrame(parent, text="เลือกเมนู")
        select_frame.pack(fill='both', expand=True, padx=5, pady=5)

        # สร้าง Listbox สำหรับเลือกเมนู
        self.menu_listbox = tk.Listbox(select_frame, selectmode=tk.MULTIPLE)
        self.menu_listbox.pack(fill='both', expand=True, padx=5, pady=5)
        
        self.refresh_menu_listbox()

        # ปุ่มสั่งอาหาร
        ttk.Button(parent, text="สั่งอาหาร", command=self.place_order).pack(pady=5)

    def create_history_tab(self, parent):
        # แสดงประวัติการสั่ง
        columns = ('date', 'customer', 'items', 'total')
        self.history_tree = ttk.Treeview(parent, columns=columns, show='headings')
        self.history_tree.heading('date', text='วันที่')
        self.history_tree.heading('customer', text='ลูกค้า')
        self.history_tree.heading('items', text='รายการ')
        self.history_tree.heading('total', text='ราคารวม')
        self.history_tree.pack(fill='both', expand=True, padx=5, pady=5)

        # แสดงรายได้รวม
        self.income_label = ttk.Label(parent, text="รายได้รวม: 0 บาท")
        self.income_label.pack(pady=5)

        self.refresh_history()

    def add_menu(self):
        name = self.menu_name.get()
        try:
            price = float(self.menu_price.get())
            if name and price > 0:
                self.cursor.execute("INSERT INTO menu (name, price) VALUES (?, ?)", (name, price))
                self.conn.commit()
                self.menu_name.delete(0, tk.END)
                self.menu_price.delete(0, tk.END)
                self.refresh_menu()
                self.refresh_menu_listbox()
            else:
                messagebox.showerror("Error", "กรุณากรอกข้อมูลให้ถูกต้อง")
        except ValueError:
            messagebox.showerror("Error", "ราคาต้องเป็นตัวเลข")

    def refresh_menu(self):
        for item in self.menu_tree.get_children():
            self.menu_tree.delete(item)
        self.cursor.execute("SELECT name, price FROM menu")
        for row in self.cursor.fetchall():
            self.menu_tree.insert('', tk.END, values=(row['name'], f"{row['price']:.2f}"))

    def refresh_menu_listbox(self):
        self.menu_listbox.delete(0, tk.END)
        self.cursor.execute("SELECT name FROM menu")
        for row in self.cursor.fetchall():
            self.menu_listbox.insert(tk.END, row['name'])

    def place_order(self):
        customer_name = self.customer_name.get()
        selected_indices = self.menu_listbox.curselection()
        
        if not customer_name or not selected_indices:
            messagebox.showerror("Error", "กรุณากรอกชื่อลูกค้าและเลือกเมนู")
            return

        # หารายการที่เลือก
        selected_items = [self.menu_listbox.get(i) for i in selected_indices]
        
        # คำนวณราคารวม
        total = 0
        menu_item_ids = []
        for item_name in selected_items:
            self.cursor.execute("SELECT id, price FROM menu WHERE name = ?", (item_name,))
            menu_item = self.cursor.fetchone()
            if menu_item:
                total += menu_item['price']
                menu_item_ids.append(menu_item['id'])

        # บันทึกออเดอร์
        self.cursor.execute(
            "INSERT INTO orders (customer_name, total) VALUES (?, ?)",
            (customer_name, total)
        )
        order_id = self.cursor.lastrowid

        # บันทึกรายการอาหาร
        for menu_id in menu_item_ids:
            self.cursor.execute(
                "INSERT INTO order_items (order_id, menu_item_id) VALUES (?, ?)",
                (order_id, menu_id)
            )
        self.conn.commit()

        # รีเซ็ตฟอร์ม
        self.customer_name.delete(0, tk.END)
        self.menu_listbox.selection_clear(0, tk.END)
        
        self.refresh_history()
        messagebox.showinfo("Success", f"บันทึกออเดอร์สำเร็จ\nราคารวม: {total:.2f} บาท")

    def refresh_history(self):
        for item in self.history_tree.get_children():
            self.history_tree.delete(item)

        sql = """
        SELECT o.order_date, o.customer_name, o.total,
               GROUP_CONCAT(m.name) as items
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN menu m ON oi.menu_item_id = m.id
        GROUP BY o.id
        ORDER BY o.order_date DESC
        """
        self.cursor.execute(sql)
        for row in self.cursor.fetchall():
            self.history_tree.insert('', tk.END, values=(
                row['order_date'],
                row['customer_name'],
                row['items'],
                f"{row['total']:.2f}"
            ))

        # อัพเดทรายได้รวม
        self.cursor.execute("SELECT SUM(total) as total_income FROM orders")
        result = self.cursor.fetchone()
        total_income = result['total_income'] or 0
        self.income_label.config(text=f"รายได้รวม: {total_income:.2f} บาท")

    def __del__(self):
        self.conn.close()

if __name__ == "__main__":
    root = tk.Tk()
    app = RestaurantGUI(root)
    root.mainloop() 