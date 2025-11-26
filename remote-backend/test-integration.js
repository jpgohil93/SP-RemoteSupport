const WebSocket = require('ws');

// Configuration
const PORT = 8080;
const WS_URL = `ws://localhost:${PORT}`;

// Mock Data
const DEVICE_ID = 'test-device-123';
const AGENT_ID = 'test-agent-456';

function runTest() {
    console.log('Starting Backend Integration Test...');

    // 1. Start Device Connection
    const deviceWs = new WebSocket(WS_URL);
    let agentWs;

    deviceWs.on('open', () => {
        console.log('[Device] Connected');

        // 2. Register Device
        const registerMsg = {
            type: 'REGISTER_DEVICE',
            deviceId: DEVICE_ID,
            info: { name: 'QA Test Device', remoteControl: true, remoteScreen: true }
        };
        deviceWs.send(JSON.stringify(registerMsg));
        console.log('[Device] Sent REGISTER_DEVICE');

        // Give it a moment to register, then start Agent
        setTimeout(startAgent, 1000);
    });

    deviceWs.on('message', (data) => {
        const msg = JSON.parse(data);
        console.log(`[Device] Received: ${data}`);

        if (msg.type === 'REMOTE_INPUT') {
            console.log('[PASS] Device received REMOTE_INPUT from Agent');

            // 5. Send Screen Frame back
            const frameMsg = {
                type: 'SCREEN_FRAME',
                payload: 'base64-mock-frame-data'
            };
            deviceWs.send(JSON.stringify(frameMsg));
            console.log('[Device] Sent SCREEN_FRAME');
        }
    });

    function startAgent() {
        agentWs = new WebSocket(WS_URL);

        agentWs.on('open', () => {
            console.log('[Agent] Connected');

            // 3. Agent Connects to Device
            const connectMsg = {
                type: 'AGENT_CONNECT',
                deviceId: DEVICE_ID
            };
            agentWs.send(JSON.stringify(connectMsg));
            console.log('[Agent] Sent AGENT_CONNECT');

            // 4. Send Remote Command
            setTimeout(() => {
                const cmdMsg = {
                    type: 'REMOTE_INPUT',
                    keyCode: 19 // UP
                };
                agentWs.send(JSON.stringify(cmdMsg));
                console.log('[Agent] Sent REMOTE_INPUT');
            }, 1000);
        });

        agentWs.on('message', (data) => {
            const msg = JSON.parse(data);
            console.log(`[Agent] Received: ${data}`);

            if (msg.type === 'SCREEN_FRAME') {
                console.log('[PASS] Agent received SCREEN_FRAME from Device');
                cleanup();
            }
        });
    }

    function cleanup() {
        console.log('Test Completed Successfully.');
        deviceWs.close();
        agentWs.close();
        process.exit(0);
    }

    // Timeout fail-safe
    setTimeout(() => {
        console.error('[FAIL] Test Timed Out');
        process.exit(1);
    }, 10000);
}

runTest();
