# HSK Webapp

Monorepo khoi tao cho website tu hoc tieng Trung theo kien truc:

- `frontend/`: Next.js + TypeScript + Tailwind CSS + shadcn/ui
- `backend/`: Django + Django REST Framework
- `infrastructure/`: Docker Compose cho MySQL 8 `utf8mb4`

## Cau truc chinh

```text
backend/
  config/settings/
  apps/accounts/
  apps/catalog/
  common/
frontend/
  src/app/
  src/components/
  src/features/
  src/services/
infrastructure/
  compose.yaml
```

## Chay local

1. Tao env:

```bash
cp .env.example .env
```

2. Chay MySQL:

```bash
docker compose -f infrastructure/compose.yaml --env-file .env up -d mysql
```

3. Cai backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

4. Chay frontend:

```bash
cd frontend
npm install
npm run dev
```

URL mac dinh:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/v1`
- Django Admin: `http://localhost:8000/admin`
- API docs: `http://localhost:8000/api/docs`

## Da khoi tao

- Custom user model `accounts.User` dung email dang nhap.
- Bang `roles` voi role he thong `ADMIN` va `USER`.
- Catalog models: `level_hsks`, `topics`, `grammar_categories`.
- Django Admin co ban cho User, Role va catalog.
- MySQL 8 compose voi charset/collation `utf8mb4`.

### cách import data học thông qua image
B1: cd D:\hsk_webapp\backend
B2: python manage.py import_visual_images "..\data\hsk_level updated\image\hsk5" --dry-run(check có chưa)
B3: python manage.py import_visual_images "..\data\hsk_level updated\image\hsk5" 

### cách import data đề thi
B1: cd D:\hsk_webapp\backend
B2: python manage.py import_exercises "..\data\hsk_level updated\dethi\import\hsk4_de3.json" --dry-run
B3: python manage.py import_exercises "..\data\hsk_level updated\dethi\import\hsk4_de3.json"

## Trien khai (Deployment)

Chi tiet huong dan trien khai ung dung len cloud:
- **Koyeb / Render + TiDB / Aiven**: Xem chi tiet tai [plan/alternative_deployments.md](file:///d:/hsk_webapp/plan/alternative_deployments.md).
- **Vercel + Railway**: Xem chi tiet tai [plan/deployment_vercel_railway.md](file:///d:/hsk_webapp/plan/deployment_vercel_railway.md) (Luu y: Railway yeu cau credit card de su dung thu nghiem).