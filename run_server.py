import http.server
import socketserver
import socket

# Configuration
PORT = 8000

# Get your Local Network IP (to view on mobile)
def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

LOCAL_IP = get_ip()

Handler = http.server.SimpleHTTPRequestHandler

print("\n" + "="*40)
print("⚓ CAPTAIN HOOK - LOCAL HOSTING SERVER")
print("="*40)
print(f"\n1. Local Link:   http://localhost:{PORT}")
print(f"2. Mobile Link:  http://{LOCAL_IP}:{PORT}")
print("\n[TIP] Make sure your phone and PC are on the same Wi-Fi!")
print("\nPress Ctrl+C to stop the server.")
print("="*40 + "\n")

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n\nServer stopped. Happy coding! ⚓")
