const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');

const app = express();
app.use(express.json());
// Static files (HTML, JS) serve karne ke liye
app.use(express.static(path.join(__dirname, '../public')));

let sock;
let qrCode;
let connectionStatus = 'disconnected';

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrCode = qr;
            connectionStatus = 'qr';
            console.log("QR Code available, waiting for scan.");
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            connectionStatus = 'disconnected';
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log("Logged out, not reconnecting.");
                // Session files delete karke naya connection start karne ka logic yahan daal sakte hain
            }
        } else if (connection === 'open') {
            connectionStatus = 'connected';
            qrCode = null;
            console.log('WhatsApp connection opened!');
        }
    });
}

// API Route 1: Status check karne ke liye
app.get('/api/status', (req, res) => {
    res.json({
        status: connectionStatus,
        qr: qrCode,
        user: sock ? sock.user : null
    });
});

// API Route 2: Message bhejne ke liye
app.post('/api/send', async (req, res) => {
    const { number, message } = req.body;

    if (connectionStatus !== 'connected') {
        return res.status(400).json({ success: false, error: 'WhatsApp is not connected.' });
    }
    if (!number || !message) {
        return res.status(400).json({ success: false, error: 'Number and message are required.' });
    }

    try {
        const jid = `${number}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message });
        res.json({ success: true, message: 'Message sent successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Failed to send message.' });
    }
});

// WhatsApp connection shuru karein
connectToWhatsApp();

// Vercel ke liye export
module.exports = app;
