import requests
import time

# List of ML model endpoints to check
# Format: {"name": "Model Name", "url": "http://endpoint-url", "payload": {}}
MODELS = [
    {
        "name": "Power Prediction",
        "url": "http://127.0.0.1:8000/api/predict/",
        "payload": {} # Add minimal payload here
    },
    {
        "name": "Light Appliance",
        "url": "http://127.0.0.1:8000/api/predict/light/",
        "payload": {} # Add minimal payload here
    },
    {
        "name": "Time Forecast",
        "url": "http://127.0.0.1:8000/api/predict/time/",
        "payload": {} # Add minimal payload here
    }
]

TIMEOUT = 3.0 # Fail fast with 3s timeout

def check_models():
    print(f"{'Model':<20} | {'Status':<6} | {'Response Time':<15}")
    print("-" * 47)
    
    results = []
    
    for model in MODELS:
        start_time = time.time()
        try:
            # Sending a minimal inference request (POST is typical for inference)
            response = requests.post(model["url"], json=model["payload"], timeout=TIMEOUT)
            
            # If the model responds with an error due to invalid payload or auth, it's still "UP"
            # We just want to check if the server is alive and responding
            status = "UP" if response.status_code in [200, 400, 401, 405, 422, 500] else "DOWN"
            latency = (time.time() - start_time) * 1000
            
        except requests.exceptions.RequestException:
            status = "DOWN"
            latency = 0
            
        print(f"{model['name']:<20} | {status:<6} | {latency:.2f} ms")
        results.append({
            "model": model["name"],
            "status": status,
            "latency_ms": latency
        })

if __name__ == "__main__":
    check_models()
