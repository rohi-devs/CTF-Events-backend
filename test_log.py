import requests
import json
import pytest

# Replace with your actual server address
BASE_URL = "http://localhost:5000" 

def get_admin_token():
    """Helper function to get an admin token."""
    data = {
        "username": "admin",
        "password": "password" 
    }
    response = requests.post(f"{BASE_URL}/login", json=data)
    print(response.status_code)
    return response.json()["token"]

def test_add_event():
    """Tests adding an event as an admin."""
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    data = {
        "name": "Test Event",
        "time": "2024-12-31T23:59:59", 
        "poster": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==", 
        "gformLink": "https://docs.google.com/forms/d/e/1FAIpQLSf987654321/viewform",
        "locationLink": "https://maps.google.com/maps?q=location"
    }

    response = requests.post(f"{BASE_URL}/events", headers=headers, json=data)
    print(response.status_code)
    print("id ",response.json()) 


def test_get_events():
    """Tests getting all events."""
    response = requests.get(f"{BASE_URL}/events")
    print( response.status_code == 200)
    print(response.json())

def test_get_events_by_username():
    """Tests getting events by username."""
    response = requests.get(f"{BASE_URL}/events/user/admin") 
    print( response.status_code == 200)
    print(response.json())

# if __name__ == "__main__":
#     pytest.main()

get_admin_token()
test_get_events()
test_get_events_by_username
# test_add_event()
