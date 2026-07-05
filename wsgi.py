import sys
import os

# PythonAnywhere 项目路径（替换为你的实际用户名）
path = '/home/yourusername/mysite'
if path not in sys.path:
    sys.path.insert(0, path)

os.chdir(path)

from app import app as application