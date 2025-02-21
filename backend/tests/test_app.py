import sys
import os

# `backend` ディレクトリを `sys.path` に追加
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../")))

import pytest
from app import create_app 

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_home(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.get_json() == {"message": "Backend is running!"}

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.get_json() == {"status": "OK"}