import telnetlib

HOST = "localhost"
PORT = 5000

def change(conn, path, value):
    cmd = 'set {} {}\r\n'.format(path, value)

    conn.write(cmd.encode('ascii'))
    conn.read_until(b'/> ')


def nasal(conn, command):
    cmd = 'nasal \r\n {} ###EOF##\r\n'.format(command)

    conn.write(cmd.encode('ascii'))
    conn.read_until(b'/> ')


try:
    # Connect to the Telnet server
    tn = telnetlib.Telnet(HOST, PORT)

    
    # nasal(tn, "controls.flapsDown(1)")

    from http.server import BaseHTTPRequestHandler, HTTPServer

    class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            # Send response headers
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()

            p = ""
            v = ""
            command = ""

            # Print out the headers
            print("Headers of the incoming request:")
            for header, value in self.headers.items():
                if header=="path":
                    p=value
                if header=="value":
                    v=value
                if header=="nasal":
                    command=value
                print(f"{header}: {value}")
            
            if p and v:
                print("h: ",p)
                print("v: ",v)
                change(tn, p, v)

            
            if command:
                nasal(tn, command)



                

            # Response body
            self.wfile.write(b"Hello, World!")

    host = 'localhost'
    port = 80

    server = HTTPServer((host, port), SimpleHTTPRequestHandler)

    print(f"Server running on {host}:{port}")
    server.serve_forever()

    # change(tn, "/controls/engines/engine[0]/throttle", "1")


    # When you're done, close the connection
    tn.close()
except Exception as e:
    print("An error occurred:", str(e))