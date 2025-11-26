require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 8080;

// Device Registry (In-Memory)
// Map<deviceId, { ws, info }>
const devices = new Map();
// Map<agentWs, deviceId> (which device the agent is viewing)
const agents = new Map();

app.get('/', (req, res) => {
    res.send('Screen Pulse Remote Backend Running');
});

// List online devices
app.get('/api/devices', (req, res) => {
    const deviceList = [];
    devices.forEach((value, key) => {
        deviceList.push({
            deviceId: key,
            ...value.info,
            online: true
        });
    });
    res.json(deviceList);
});

// WebSocket Handling
wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // DEVICE REGISTRATION
            if (data.type === 'REGISTER_DEVICE') {
                const { deviceId, info } = data;
                devices.set(deviceId, { ws, info });
                console.log(`Device registered: ${deviceId}`);
                ws.deviceId = deviceId; // Tag socket
            }

            // AGENT CONNECT
            else if (data.type === 'AGENT_CONNECT') {
                const { deviceId } = data;
                if (devices.has(deviceId)) {
                    agents.set(ws, deviceId);
                    console.log(`Agent connected to device: ${deviceId}`);
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Device not found' }));
                }
            }

            // SCREEN DATA (Device -> Backend -> Agent)
            else if (data.type === 'SCREEN_FRAME') {
                // Determine which agents are watching this device
                // This is a simple broadcast to all agents watching THIS device
                // In a real app, optimize this.
                if (ws.deviceId) {
                    agents.forEach((targetDeviceId, agentWs) => {
                        if (targetDeviceId === ws.deviceId && agentWs.readyState === WebSocket.OPEN) {
                            agentWs.send(message); // Forward raw message
                        }
                    });
                }
            }

            // REMOTE CONTROL (Agent -> Backend -> Device)
            else if (data.type === 'REMOTE_INPUT') {
                const targetDeviceId = agents.get(ws);
                if (targetDeviceId) {
                    const device = devices.get(targetDeviceId);
                    if (device && device.ws.readyState === WebSocket.OPEN) {
                        device.ws.send(message);
                    }
                }
            }

        } catch (e) {
            // Handle binary data (Screen frames might be binary)
            // For now assuming JSON or base64 inside JSON for simplicity in prototype
            console.error('Error parsing message', e);
        }
    });

    ws.on('close', () => {
        if (ws.deviceId) {
            console.log(`Device disconnected: ${ws.deviceId}`);
            devices.delete(ws.deviceId);
        }
        agents.delete(ws);
    });
});

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
