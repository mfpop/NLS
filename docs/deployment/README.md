# Deployment

## Prerequisites
- Architecture Audit must have passed.
- `tsc --noEmit` passes with zero errors.
- All Python tests pass.
- No unapplied migrations.
- Git working tree is clean (no uncommitted changes).

## Steps

### 1. Build Frontend
```powershell
cd frontend
npm ci
npm run build
```

### 2. Apply Migrations
```powershell
cd backend
python manage.py migrate
```

### 3. Collect Static Files
```powershell
python manage.py collectstatic --noinput
```

### 4. Smoke Tests
```powershell
python manage.py test check manufacturing improvement --keepdb
```

### 5. Verify TypeScript
```powershell
cd frontend
.\node_modules\.bin\tsc --noEmit
```

## Rollback
If deployment fails:
```powershell
git revert HEAD --no-edit
cd backend
python manage.py migrate
```

## Environment Variables
See `.env.example` for required environment variables.

## Troubleshooting
| Issue | Check |
|-------|-------|
| Build fails | Node version, dependency cache |
| Migration fails | Check for conflicting migrations |
| Smoke tests fail | Check test database state |
