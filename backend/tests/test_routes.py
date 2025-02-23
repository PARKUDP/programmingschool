def test_home_route(test_client):
    """ホーム画面のレスポンスをテスト"""
    response = test_client.get("/")
    assert response.status_code == 200
    assert b"Backend is running!" in response.data


def test_health_route(test_client):
    """ヘルスチェックのレスポンスをテスト"""
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json == {"status": "OK"}
