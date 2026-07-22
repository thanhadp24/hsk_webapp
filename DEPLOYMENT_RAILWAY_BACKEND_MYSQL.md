# Trien khai Backend Django + MySQL tren Railway

Frontend da deploy tren Vercel. Tai lieu nay chi tap trung vao:

- Backend Django trong `backend/`
- MySQL tren Railway
- Chuyen du lieu cu sang MySQL moi
- Ket noi frontend Vercel voi backend Railway

## 1. Kien truc khuyen nghi

```text
Vercel Frontend
  NEXT_PUBLIC_API_URL=https://<backend>.up.railway.app/api/v1

Railway Backend Service
  Root Directory: /backend
  Start Command: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT

Railway MySQL Service
  DATABASE_URL=${{MySQL.MYSQL_URL}}
```

Ly do dung `/backend` lam Root Directory:

- `requirements.txt` nam trong `backend/`
- `manage.py` nam trong `backend/`
- `config/settings` nam trong `backend/`
- Railway build/install/start command se chay dung thu muc backend

## 2. Tao MySQL tren Railway

1. Vao Railway Dashboard.
2. Create Project hoac mo project backend.
3. Bam `+ New`.
4. Chon `Database`.
5. Chon `Add MySQL`.
6. Cho service MySQL deploy xong.

Railway MySQL service se co cac bien:

```text
MYSQLHOST
MYSQLPORT
MYSQLUSER
MYSQLPASSWORD
MYSQLDATABASE
MYSQL_URL
```

Trong backend Django, repo nay da dung `dj-database-url`, nen chi can map:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

Neu service MySQL cua ban khong ten la `MySQL`, thay `MySQL` bang dung ten service tren Railway.

## 3. Tao backend service

1. Trong cung Railway project, bam `+ New`.
2. Chon `GitHub Repo`.
3. Chon repo `hsk_webapp`.
4. Vao backend service -> `Settings`.
5. Set:

```text
Root Directory: /backend
Start Command: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

Build Command de trong, Railway se tu cai Python dependencies tu `backend/requirements.txt`.

## 4. Environment variables backend

Vao backend service -> `Variables`, them:

```env
DJANGO_SETTINGS_MODULE=config.settings.production
DJANGO_SECRET_KEY=<secret-key-random-dai>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=<backend-domain>.up.railway.app
DJANGO_TIME_ZONE=Asia/Ho_Chi_Minh

DATABASE_URL=${{MySQL.MYSQL_URL}}

CORS_ALLOWED_ORIGINS=https://<frontend-domain>.vercel.app

JWT_ACCESS_TOKEN_MINUTES=30
JWT_REFRESH_TOKEN_DAYS=7
```

Neu dung custom domain:

```env
DJANGO_ALLOWED_HOSTS=api.your-domain.com,<backend-domain>.up.railway.app
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com,https://<frontend-domain>.vercel.app
```

## 5. Generate domain backend

1. Backend service -> `Settings`.
2. Muc `Networking`.
3. Bam `Generate Domain`.
4. Lay URL Railway, vi du:

```text
https://hsk-backend-production.up.railway.app
```

Test:

```text
https://hsk-backend-production.up.railway.app/api/docs/
https://hsk-backend-production.up.railway.app/api/v1/hsk-levels/
```

## 6. Cap nhat frontend Vercel

Trong Vercel frontend project, set:

```env
NEXT_PUBLIC_API_URL=https://<backend-domain>.up.railway.app/api/v1
```

Sau do redeploy frontend.

## 7. Tao schema tren MySQL moi

Sau khi backend deploy va ket noi DB thanh cong, chay migrations.

### Cach A: Railway dashboard

Neu Railway service co phan command/pre-deploy command, dung:

```bash
python manage.py migrate
```

Root Directory da la `/backend`, nen khong can `cd backend`.

### Cach B: Railway CLI tu may local

```powershell
cd D:\hsk_webapp\backend
railway login
railway link
railway run python manage.py migrate
railway run python manage.py createsuperuser
```

`railway run` se inject bien moi truong cua Railway service vao command local.

## 8. Chuyen du lieu cu sang MySQL moi

Co 3 tinh huong pho bien.

### Tinh huong A: Du lieu cu dang o MySQL local Docker

Day la kha nang cao nhat voi repo nay, vi `infrastructure/compose.yaml` dang tao MySQL local.

1. Dam bao MySQL local dang chay:

```powershell
cd D:\hsk_webapp
docker compose -f infrastructure/compose.yaml --env-file .env up -d mysql
```

2. Dump database local ra file:

```powershell
docker exec hsk-webapp-mysql mysqldump `
  -u hsk_user `
  -phsk_password `
  --single-transaction `
  --routines `
  --triggers `
  --default-character-set=utf8mb4 `
  hsk_webapp > hsk_webapp_backup.sql
```

Neu password/user/db khac, lay tu `.env`.

3. Lay public connection cua Railway MySQL:

- Mo MySQL service tren Railway.
- Vao tab Connect/Data.
- Dung connection public/TCP Proxy de import tu may local.

4. Import dump vao Railway MySQL:

```powershell
mysql --host=<railway-public-host> `
  --port=<railway-public-port> `
  --user=<railway-user> `
  --password=<railway-password> `
  --default-character-set=utf8mb4 `
  <railway-database> < hsk_webapp_backup.sql
```

Neu khong co `mysql` client tren may, dung Docker:

```powershell
docker run --rm -i mysql:8.0 mysql `
  --host=<railway-public-host> `
  --port=<railway-public-port> `
  --user=<railway-user> `
  --password=<railway-password> `
  --default-character-set=utf8mb4 `
  <railway-database> < hsk_webapp_backup.sql
```

5. Chay migrations sau import de dam bao schema moi nhat:

```powershell
cd D:\hsk_webapp\backend
railway run python manage.py migrate
```

6. Kiem tra so luong data:

```powershell
railway run python manage.py shell
```

Trong shell:

```python
from apps.catalog.models import HskLevel, Topic
from apps.vocabulary.models import Vocabulary
from apps.grammar.models import GrammarPoint
from apps.visual_learning.models import VisualLearningImage
from apps.exercises.models import ExerciseSet

print(HskLevel.objects.count())
print(Topic.objects.count())
print(Vocabulary.objects.count())
print(GrammarPoint.objects.count())
print(VisualLearningImage.objects.count())
print(ExerciseSet.objects.count())
```

### Tinh huong B: Du lieu cu dang la file trong thu muc `data/`

Neu DB local chua co data hoac muon import lai tu file goc:

1. Lay Railway env ve local bang CLI, hoac dung `railway run`.
2. Chay cac management command hien co:

```powershell
cd D:\hsk_webapp\backend
railway run python manage.py import_vocabulary "..\data\hsk_level updated\<path-file-or-folder>" --dry-run
railway run python manage.py import_vocabulary "..\data\hsk_level updated\<path-file-or-folder>"

railway run python manage.py import_grammar "..\data\hsk_level updated\<path-file-or-folder>" --dry-run
railway run python manage.py import_grammar "..\data\hsk_level updated\<path-file-or-folder>"

railway run python manage.py import_exercises "..\data\hsk_level updated\dethi\import\hsk4_de3.json" --dry-run
railway run python manage.py import_exercises "..\data\hsk_level updated\dethi\import\hsk4_de3.json"

railway run python manage.py import_visual_images "..\data\hsk_level updated\image\hsk5" --dry-run
railway run python manage.py import_visual_images "..\data\hsk_level updated\image\hsk5"
```

Luu y: `railway run` chay command tren may local nhung dung env cua Railway. Vi vay file `..\data\...` van doc tu may local cua ban, sau do ghi vao Railway MySQL.

### Tinh huong C: Du lieu cu dang o mot MySQL remote khac

Dump tu DB cu:

```powershell
mysqldump --host=<old-host> `
  --port=<old-port> `
  --user=<old-user> `
  --password=<old-password> `
  --single-transaction `
  --routines `
  --triggers `
  --default-character-set=utf8mb4 `
  <old-database> > hsk_webapp_backup.sql
```

Import vao Railway bang lenh import o tinh huong A.

## 9. Thu tu an toan khi migrate du lieu

1. Deploy Railway MySQL.
2. Deploy Railway backend, nhung chua mo frontend production neu data chua xong.
3. Chay `python manage.py migrate`.
4. Import data cu.
5. Chay lai `python manage.py migrate`.
6. Tao superuser neu can.
7. Test API docs va API list.
8. Set `NEXT_PUBLIC_API_URL` tren Vercel frontend.
9. Redeploy frontend.
10. Test login, danh sach HSK, vocabulary, grammar, exercises.

## 10. Checklist loi hay gap

### Build loi `mysqlclient`

Railway Linux build co the thieu native packages tuy thoi diem build. Neu gap loi compile `mysqlclient`, huong xu ly nhanh:

1. Thu redeploy lai.
2. Neu van loi, chuyen sang driver pure Python `PyMySQL`.
3. Hoac them package build theo Railway/Railpack config.

### Backend 400 Bad Request

Sai `DJANGO_ALLOWED_HOSTS`. Them dung Railway domain:

```env
DJANGO_ALLOWED_HOSTS=<backend-domain>.up.railway.app
```

### CORS error tren frontend

Sai `CORS_ALLOWED_ORIGINS`. Phai co scheme `https://` va dung domain Vercel:

```env
CORS_ALLOWED_ORIGINS=https://<frontend-domain>.vercel.app
```

### API connect sai DB

Kiem tra backend service co:

```env
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

Va MySQL service phai cung Railway project/environment voi backend.

### Mat anh/media

Khong luu file upload vao filesystem app service neu muon ben vung. Voi project nay, nen dung Google Drive/object storage va luu URL/file id vao MySQL.

## 11. Lenh test nhanh

Local voi Railway env:

```powershell
cd D:\hsk_webapp\backend
railway run python manage.py check
railway run python manage.py migrate --plan
```

API production:

```text
https://<backend-domain>.up.railway.app/api/docs/
https://<backend-domain>.up.railway.app/api/v1/hsk-levels/
```

Nguon tham khao:

- Railway Django guide: https://docs.railway.com/guides/django
- Railway MySQL docs: https://docs.railway.com/databases/mysql
- Railway build/root directory docs: https://docs.railway.com/builds/build-configuration
- Railway build/start command docs: https://docs.railway.com/builds/build-and-start-commands
- Railway CLI connect docs: https://docs.railway.com/cli/connect
