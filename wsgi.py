import sys
import os

# PythonAnywhere 项目路径（替换为你的实际用户名）
path = '/home/yourusername/mysite'
if path not in sys.path:
    sys.path.insert(0, path)

os.chdir(path)

from app import app, init_db

# 初始化数据库
init_db()

# PythonAnywhere 需要的 WSGI application 对象
application = app