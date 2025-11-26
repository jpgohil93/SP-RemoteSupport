import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function App() {
    const [view, setView] = useState('login'); // login, devices, session
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [socket, setSocket] = useState(null);
    const canvasRef = useRef(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    // Login (Static Check)
    const handleLogin = (e) => {
        e.preventDefault();
        if (email === 'screenpulse.ai@gmail.com' && password === 'Tjcg@#2050') {
            setView('devices');
            fetchDevices();
            setError('');
        } else {
            setError('Invalid credentials');
        }
    };

    // Fetch Devices
    const fetchDevices = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/devices`);
            const data = await res.json();
            setDevices(data);
        } catch (err) {
            console.error('Failed to fetch devices', err);
        }
    };

    // Connect to Device
    const connectToDevice = (device) => {
        setSelectedDevice(device);
        setView('session');

        // Initialize WebSocket
        const ws = new WebSocket(API_BASE_URL.replace('http', 'ws'));

        ws.onopen = () => {
            console.log('Connected to WS');
            ws.send(JSON.stringify({
                type: 'AGENT_CONNECT',
                deviceId: device.deviceId
            }));
        };

        ws.onmessage = (event) => {
            // Handle incoming screen data
            // Assuming JSON with base64 frame for prototype simplicity
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'SCREEN_FRAME') {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvasRef.current?.getContext('2d');
                        if (ctx) {
                            // Resize canvas to match image
                            if (canvasRef.current.width !== img.width) {
                                canvasRef.current.width = img.width;
                                canvasRef.current.height = img.height;
                            }
                            ctx.drawImage(img, 0, 0);
                        }
                    };
                    img.src = `data:image/jpeg;base64,${data.payload}`;
                }
            } catch (e) {
                console.error('Error parsing WS message', e);
            }
        };

        setSocket(ws);
    };

    // Remote Input
    const sendCommand = (keyCode) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
                type: 'REMOTE_INPUT',
                keyCode: keyCode
            }));
        }
    };

    return (
        <div className="container">
            {view === 'login' && (
                <div className="login-box">
                    <h1>Screen Pulse Support</h1>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            style={{ padding: '8px' }}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            style={{ padding: '8px' }}
                        />
                        <button type="submit">Log In</button>
                    </form>
                    {error && <p style={{ color: 'red' }}>{error}</p>}
                </div>
            )}

            {view === 'devices' && (
                <div className="device-list">
                    <h2>Online Devices</h2>
                    <button onClick={fetchDevices}>Refresh</button>
                    <ul>
                        {devices.map(d => (
                            <li key={d.deviceId}>
                                <span>{d.name || d.deviceId}</span>
                                <button onClick={() => connectToDevice(d)}>Connect</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {view === 'session' && selectedDevice && (
                <div className="session-view">
                    <div className="header">
                        <button onClick={() => {
                            socket?.close();
                            setView('devices');
                        }}>Back</button>
                        <h3>Connected to: {selectedDevice.name}</h3>
                    </div>

                    <div className="remote-container">
                        <canvas ref={canvasRef} style={{ border: '1px solid #333', maxWidth: '100%' }} />

                        <div className="controls">
                            <button onClick={() => sendCommand(19)}>UP</button>
                            <div className="row">
                                <button onClick={() => sendCommand(21)}>LEFT</button>
                                <button onClick={() => sendCommand(23)}>OK</button>
                                <button onClick={() => sendCommand(22)}>RIGHT</button>
                            </div>
                            <button onClick={() => sendCommand(20)}>DOWN</button>
                            <button onClick={() => sendCommand(4)}>BACK</button>
                            <button onClick={() => sendCommand(3)}>HOME</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
