"""
旅行共享记账本 - Flask 后端
部署到 PythonAnywhere 的免费服务器
"""
import os
import uuid
from flask import Flask, render_template, request, jsonify, send_from_directory
import sqlite3

app = Flask(__name__)

# 配置
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DB_PATH = os.path.join(BASE_DIR, 'data.db')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def get_db():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """初始化数据库表"""
    conn = get_db()
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT DEFAULT '',
            color TEXT DEFAULT '#6366f1',
            emoji TEXT DEFAULT '👤',
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT DEFAULT '📌',
            color TEXT DEFAULT '#6366f1',
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            amount REAL NOT NULL CHECK(amount > 0),
            description TEXT DEFAULT '',
            receipt_path TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
            FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
        );
    ''')

    # 插入默认数据（如果表为空）
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM members")
    if c.fetchone()[0] == 0:
        c.executemany(
            "INSERT INTO members (name, role, color, emoji, sort_order) VALUES (?,?,?,?,?)",
            [
                ('小明', '队长', '#6366f1', '🧑‍💼', 1),
                ('小红', '财务', '#ec4899', '👩‍💼', 2),
                ('小刚', '吃货', '#f59e0b', '😋', 3),
                ('小丽', '摄影师', '#10b981', '📸', 4),
            ]
        )

    c.execute("SELECT COUNT(*) FROM categories")
    if c.fetchone()[0] == 0:
        c.executemany(
            "INSERT INTO categories (name, icon, color, sort_order) VALUES (?,?,?,?)",
            [
                ('餐饮', '🍜', '#f59e0b', 1),
                ('住宿', '🏨', '#8b5cf6', 2),
                ('交通', '🚗', '#3b82f6', 3),
                ('门票', '🎫', '#10b981', 4),
                ('购物', '🛍️', '#ec4899', 5),
                ('其他', '📌', '#6b7280', 6),
            ]
        )

    conn.commit()
    conn.close()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ==================== 页面路由 ====================

@app.route('/')
def index():
    return render_template('index.html')


# ==================== 成员 API ====================

@app.route('/api/members', methods=['GET'])
def get_members():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM members ORDER BY sort_order"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/members', methods=['POST'])
def add_member():
    data = request.get_json()
    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO members (name, role, color, emoji, sort_order) VALUES (?,?,?,?,?)",
        (data['name'], data.get('role', ''), data.get('color', '#6366f1'),
         data.get('emoji', '👤'), data.get('sort_order', 0))
    )
    conn.commit()
    member_id = c.lastrowid
    conn.close()
    return jsonify({'id': member_id, 'message': '添加成功'})


@app.route('/api/members/<int:member_id>', methods=['PUT'])
def update_member(member_id):
    data = request.get_json()
    conn = get_db()
    conn.execute(
        "UPDATE members SET name=?, role=?, color=?, emoji=? WHERE id=?",
        (data['name'], data.get('role', ''), data.get('color', '#6366f1'),
         data.get('emoji', '👤'), member_id)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': '更新成功'})


@app.route('/api/members/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    conn = get_db()
    conn.execute("DELETE FROM members WHERE id=?", (member_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': '删除成功'})


# ==================== 分类 API ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM categories ORDER BY sort_order"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ==================== 支出 API ====================

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    conn = get_db()
    rows = conn.execute('''
        SELECT e.*, m.name as member_name, m.color as member_color, m.emoji as member_emoji,
               c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM expenses e
        JOIN members m ON e.member_id = m.id
        JOIN categories c ON e.category_id = c.id
        ORDER BY e.created_at DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/expenses', methods=['POST'])
def add_expense():
    data = request.form
    receipt_path = ''

    # 处理截图上传
    if 'receipt' in request.files:
        file = request.files['receipt']
        if file and file.filename and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"{uuid.uuid4().hex}.{ext}"
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            receipt_path = filename

    conn = get_db()
    c = conn.cursor()
    c.execute(
        "INSERT INTO expenses (member_id, category_id, amount, description, receipt_path) VALUES (?,?,?,?,?)",
        (int(data['member_id']), int(data['category_id']),
         float(data['amount']), data.get('description', ''), receipt_path)
    )
    conn.commit()
    expense_id = c.lastrowid

    # 返回新创建的记录
    row = conn.execute('''
        SELECT e.*, m.name as member_name, m.color as member_color, m.emoji as member_emoji,
               c.name as category_name, c.icon as category_icon, c.color as category_color
        FROM expenses e
        JOIN members m ON e.member_id = m.id
        JOIN categories c ON e.category_id = c.id
        WHERE e.id = ?
    ''', (expense_id,)).fetchone()
    conn.close()
    return jsonify(dict(row))


@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    conn = get_db()
    # 删除关联的截图文件
    row = conn.execute(
        "SELECT receipt_path FROM expenses WHERE id=?", (expense_id,)
    ).fetchone()
    if row and row['receipt_path']:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], row['receipt_path'])
        if os.path.exists(filepath):
            os.remove(filepath)

    conn.execute("DELETE FROM expenses WHERE id=?", (expense_id,))
    conn.commit()
    conn.close()
    return jsonify({'message': '删除成功'})


# ==================== 统计 API ====================

@app.route('/api/stats', methods=['GET'])
def get_stats():
    conn = get_db()

    # 总支出
    total = conn.execute("SELECT COALESCE(SUM(amount), 0) as total FROM expenses").fetchone()['total']

    # 成员数量
    member_count = conn.execute("SELECT COUNT(*) as cnt FROM members").fetchone()['cnt']

    # 人均应付
    per_person = round(total / member_count, 2) if member_count > 0 else 0

    # 每人已付
    member_paid = conn.execute('''
        SELECT m.id, m.name, m.color, m.emoji,
               COALESCE(SUM(e.amount), 0) as paid
        FROM members m
        LEFT JOIN expenses e ON m.id = e.member_id
        GROUP BY m.id
        ORDER BY m.sort_order
    ''').fetchall()

    # 每分类汇总
    category_summary = conn.execute('''
        SELECT c.id, c.name, c.icon, c.color,
               COALESCE(SUM(e.amount), 0) as total,
               COUNT(e.id) as count
        FROM categories c
        LEFT JOIN expenses e ON c.id = e.category_id
        GROUP BY c.id
        ORDER BY c.sort_order
    ''').fetchall()

    conn.close()

    return jsonify({
        'total': round(total, 2),
        'member_count': member_count,
        'per_person': per_person,
        'member_paid': [dict(r) for r in member_paid],
        'category_summary': [dict(r) for r in category_summary],
    })


# ==================== 截图访问 ====================

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# ==================== 启动 ====================

if __name__ == '__main__':
    init_db()
    print("Travel Expense Tracker started: http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)