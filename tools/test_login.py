import sys; sys.path.insert(0, '.')
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User

creds = [('admin', 'admin'), ('admin', 'admin123'),
         ('manager', 'manager'), ('manager', 'manager123')]
for u, p in creds:
    r = authenticate(username=u, password=p)
    status = 'SUCCESS' if r else 'FAILED'
    print(f'{u}/{p}: {status}')

print('---')
admin = User.objects.get(username='admin')
print(f'Hash: {admin.password[:60]}...')
print(f'Active: {admin.is_active}')
print(f'Total users: {User.objects.count()}')
