---
name: flask-api
description: يبني ويوسّع API بـ Python Flask بنمط ثابت جاهز للإنتاج — app factory، blueprints، تحقق Supabase JWT، validation، error handling موحد، CORS، gunicorn على Render. Use when user says "سو endpoint"، "API"، "Flask"، "باك إند"، "route جديد"، or builds/extends a Flask backend.
---

# 🐍 Flask API

## 🔧 أداة
`python .claude/skills/flask-api/scripts/scaffold.py <dir> <feature...>` — يولّد المشروع كامل (factory، auth بـ JWKS + HS256، errors، CRUD لكل feature بـ RLS عبر توكن المستخدم، tests، `render.yaml`، `.env.example`). ما يكتب فوق ملف موجود. بعدها: `pytest -q`.

## الهيكل
```
app/
  __init__.py      # create_app()
  config.py        # يقرا من env بس
  extensions.py    # supabase client, cors
  auth.py          # require_auth decorator
  errors.py        # handlers موحدة
  <feature>/routes.py   # Blueprint لكل ميزة
wsgi.py            # app = create_app()
requirements.txt   # نسخ مثبتة ==
```

## app factory
```python
from flask import Flask
from flask_cors import CORS
from .config import Config
from .errors import register_errors

def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    register_errors(app)
    from .players.routes import bp as players_bp
    app.register_blueprint(players_bp, url_prefix="/api/players")

    @app.get("/healthz")
    def healthz():
        return {"ok": True}
    return app
```
`CORS_ORIGINS` قائمة محددة من env (مو `*`).

## Auth (Supabase JWT)
```python
import jwt
from functools import wraps
from flask import request, g, current_app, abort

_jwks = None
def _client():
    global _jwks
    if _jwks is None:
        _jwks = jwt.PyJWKClient(f"{current_app.config['SUPABASE_URL']}/auth/v1/.well-known/jwks.json")
    return _jwks

def require_auth(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            abort(401)
        token = header[7:]
        try:
            key = _client().get_signing_key_from_jwt(token).key
            g.user = jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")
        except jwt.PyJWTError:
            abort(401)
        return fn(*a, **kw)
    return wrapper
```
- المشاريع القديمة (legacy HS256): `jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")`.
- `g.user["sub"]` = user id. لعمليات تحترم RLS: أنشئ client بـ anon key وحط توكن المستخدم (`postgrest.auth(token)`). `service_role` بس للعمليات الإدارية وبعد تحقق صريح من الصلاحية.

## Validation و Errors
- كل input يمر على schema (`pydantic` v2): `Model.model_validate(request.get_json(silent=True) or {})`.
- شكل خطأ واحد: `{"error": {"code": "not_found", "message": "..."}}` + status صحيح (400/401/403/404/409/422/500).
```python
from pydantic import ValidationError
from werkzeug.exceptions import HTTPException

def register_errors(app):
    @app.errorhandler(ValidationError)
    def _v(e): return {"error": {"code": "invalid", "message": "بيانات غير صحيحة", "fields": e.errors(include_url=False, include_context=False)}}, 422
    @app.errorhandler(HTTPException)
    def _h(e): return {"error": {"code": e.name.lower().replace(" ", "_"), "message": e.description}}, e.code
    @app.errorhandler(Exception)
    def _x(e):
        app.logger.exception(e)
        return {"error": {"code": "server_error", "message": "صار خطأ"}}, 500
```
- لا تطلع stack trace أو رسالة DB للعميل.

## قواعد
- endpoints بأسماء جمع: `GET /api/players`، `POST /api/players`، `PATCH /api/players/<uuid:id>`.
- pagination: `?limit=20&offset=0` بحد أقصى 100.
- لا أسرار في الكود: `os.environ[...]` و `.env` في `.gitignore` + `.env.example`.
- Render: start `gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60` · health check `/healthz`.
- test لكل endpoint جديد (`pytest` + `app.test_client()`): نجاح، 401، و input غلط.
