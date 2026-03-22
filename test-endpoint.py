import requests

# Test if the endpoint is accessible
def test_endpoint():
    url = "http://localhost:8000/"
    
    try:
        response = requests.get(url)
        print(f"Backend Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    test_endpoint()
