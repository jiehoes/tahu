import requests

def test_upload_document():
    base_url = "http://localhost:8788"
    url = f"{base_url}/api/v1/documents"
    headers = {
        "X-API-Key": "tahu-dev-key-2026"
    }
    files = {
        "file": ("test.txt", b"Sample file content", "text/plain")
    }
    data = {
        "title": "Test Document"
    }
    try:
        response = requests.post(url, headers=headers, files=files, data=data, timeout=30)
        assert response.status_code == 201, f"Expected status code 201 but got {response.status_code}"
        resp_json = response.json()
        assert resp_json.get("success") is True, "Response success flag is not True"
        data_field = resp_json.get("data", {})
        assert "id" in data_field and data_field["id"], "Response JSON missing 'id' inside 'data'"
        assert data_field.get("title") == "Test Document", f"Document title mismatch, expected 'Test Document' got {data_field.get('title')}"
        assert data_field.get("mimeType") == "text/plain", f"Document mimeType mismatch, expected 'text/plain' got {data_field.get('mimeType')}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_upload_document()