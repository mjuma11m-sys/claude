"""Scaffold a production-ready Flask API (Supabase auth, pydantic, tests, Render).

  python scaffold.py <target_dir> [feature ...]
  python scaffold.py api players teams     # creates api/ with players + teams blueprints
Existing files are never overwritten.
"""
import sys
from pathlib import Path

FILES = {
"app/__init__.py": '''from flask import Flask
from flask_cors import CORS

from .config import Config
from .errors import register_errors


def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)
    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)
    register_errors(app)

{blueprints}
    @app.get("/healthz")
    def healthz():
        return {{"ok": True}}

    return app
''',
"app/config.py": '''import os


class Config:
    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")
    SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "")  # legacy HS256 projects only
    CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
    JSON_SORT_KEYS = False


class TestConfig(Config):
    TESTING = True
    SUPABASE_URL = "http://supabase.test"
    SUPABASE_JWT_SECRET = "test-secret-test-secret-test-secret!"
''',
"app/auth.py": '''from functools import wraps

import jwt
from flask import abort, current_app, g, request

_jwks_clients = {}


def _jwks(url):
    if url not in _jwks_clients:
        _jwks_clients[url] = jwt.PyJWKClient(f"{url}/auth/v1/.well-known/jwks.json", cache_keys=True)
    return _jwks_clients[url]


def decode_token(token):
    secret = current_app.config["SUPABASE_JWT_SECRET"]
    alg = jwt.get_unverified_header(token).get("alg")
    if alg == "HS256":
        if not secret:
            raise jwt.InvalidTokenError("HS256 token but no SUPABASE_JWT_SECRET")
        return jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
    key = _jwks(current_app.config["SUPABASE_URL"]).get_signing_key_from_jwt(token).key
    return jwt.decode(token, key, algorithms=["ES256", "RS256"], audience="authenticated")


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            abort(401, description="Missing bearer token")
        try:
            g.user = decode_token(header[7:])
        except jwt.PyJWTError:
            abort(401, description="Invalid or expired token")
        g.user_id = g.user["sub"]
        g.token = header[7:]
        return fn(*args, **kwargs)
    return wrapper
''',
"app/db.py": '''from flask import current_app, g
from supabase import create_client


def user_client():
    """Supabase client acting as the signed-in user, so RLS applies."""
    client = create_client(current_app.config["SUPABASE_URL"], current_app.config["SUPABASE_ANON_KEY"])
    client.postgrest.auth(g.token)
    return client
''',
"app/errors.py": '''from pydantic import ValidationError
from werkzeug.exceptions import HTTPException


def error(code, message, status, **extra):
    return {"error": {"code": code, "message": message, **extra}}, status


def register_errors(app):
    @app.errorhandler(ValidationError)
    def _validation(e):
        return error("invalid", "Invalid input", 422,
                     fields=e.errors(include_url=False, include_context=False, include_input=False))

    @app.errorhandler(HTTPException)
    def _http(e):
        return error(e.name.lower().replace(" ", "_"), e.description, e.code)

    @app.errorhandler(Exception)
    def _unhandled(e):
        app.logger.exception(e)
        return error("server_error", "Something went wrong", 500)
''',
"wsgi.py": '''from app import create_app

app = create_app()
''',
"requirements.txt": '''flask==3.1.3
flask-cors==6.0.5
gunicorn==26.2.0
pydantic==2.14.1
pyjwt[crypto]==2.15.1
supabase==2.32.0
pytest==9.1.1
''',
".python-version": "3.12\n",
".env.example": '''SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
CORS_ORIGINS=https://your-frontend.vercel.app
''',
"pytest.ini": "[pytest]\npythonpath = .\ntestpaths = tests\n",
".gitignore": ".env\n__pycache__/\n.venv/\n.pytest_cache/\n",
"render.yaml": '''services:
  - type: web
    name: {name}
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60
    healthCheckPath: /healthz
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: CORS_ORIGINS
        sync: false
''',
"tests/conftest.py": '''import time

import jwt
import pytest

from app import create_app
from app.config import TestConfig


@pytest.fixture
def client():
    return create_app(TestConfig).test_client()


@pytest.fixture
def auth_header():
    token = jwt.encode({"sub": "00000000-0000-0000-0000-000000000001", "aud": "authenticated",
                        "exp": int(time.time()) + 3600}, TestConfig.SUPABASE_JWT_SECRET, algorithm="HS256")
    return {"Authorization": f"Bearer {token}"}
''',
"tests/test_health.py": '''def test_healthz(client):
    assert client.get("/healthz").get_json() == {"ok": True}


def test_unknown_route_uses_error_shape(client):
    r = client.get("/nope")
    assert r.status_code == 404
    assert r.get_json()["error"]["code"] == "not_found"
''',
}

FEATURE_ROUTES = '''from flask import Blueprint, g, request
from pydantic import BaseModel, Field

from ..auth import require_auth
from ..db import user_client

bp = Blueprint("{name}", __name__)
TABLE = "{name}"


class {model}Create(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class {model}Update(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)


@bp.get("")
@require_auth
def list_{name}():
    limit = min(int(request.args.get("limit", 20)), 100)
    offset = max(int(request.args.get("offset", 0)), 0)
    res = user_client().table(TABLE).select("*").range(offset, offset + limit - 1).execute()
    return {{"data": res.data, "limit": limit, "offset": offset}}


@bp.post("")
@require_auth
def create_{singular}():
    body = {model}Create.model_validate(request.get_json(silent=True) or {{}})
    res = user_client().table(TABLE).insert({{**body.model_dump(), "owner_id": g.user_id}}).execute()
    return {{"data": res.data[0]}}, 201


@bp.patch("/<uuid:item_id>")
@require_auth
def update_{singular}(item_id):
    body = {model}Update.model_validate(request.get_json(silent=True) or {{}})
    res = user_client().table(TABLE).update(body.model_dump(exclude_none=True)).eq("id", str(item_id)).execute()
    if not res.data:
        return {{"error": {{"code": "not_found", "message": "Not found"}}}}, 404
    return {{"data": res.data[0]}}


@bp.delete("/<uuid:item_id>")
@require_auth
def delete_{singular}(item_id):
    res = user_client().table(TABLE).delete().eq("id", str(item_id)).execute()
    if not res.data:
        return {{"error": {{"code": "not_found", "message": "Not found"}}}}, 404
    return "", 204
'''

FEATURE_TEST = '''def test_{name}_requires_auth(client):
    assert client.get("/api/{name}").status_code == 401


def test_{name}_rejects_bad_token(client):
    r = client.get("/api/{name}", headers={{"Authorization": "Bearer nope"}})
    assert r.status_code == 401


def test_{name}_validates_body(client, auth_header):
    r = client.post("/api/{name}", json={{"name": ""}}, headers=auth_header)
    assert r.status_code == 422
    assert r.get_json()["error"]["code"] == "invalid"
'''


def write(path: Path, content: str):
    if path.exists():
        print(f"skip  {path}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"write {path}")


def main(argv):
    if not argv:
        print(__doc__)
        return 2
    root, features = Path(argv[0]), [f.lower() for f in argv[1:]]
    regs = "".join(
        f'    from .{f}.routes import bp as {f}_bp\n    app.register_blueprint({f}_bp, url_prefix="/api/{f}")\n'
        for f in features)
    for rel, content in FILES.items():
        content = content.replace("{name}", root.name) if rel == "render.yaml" else content
        if rel == "app/__init__.py":
            content = content.format(blueprints=regs)
        write(root / rel, content)
    for f in features:
        singular = f[:-1] if f.endswith("s") else f
        model = "".join(p.capitalize() for p in singular.split("_"))
        write(root / f"app/{f}/__init__.py", "")
        write(root / f"app/{f}/routes.py", FEATURE_ROUTES.format(name=f, singular=singular, model=model))
        write(root / f"tests/test_{f}.py", FEATURE_TEST.format(name=f))
    print(f"\nnext: cd {root} && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt && pytest -q")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
