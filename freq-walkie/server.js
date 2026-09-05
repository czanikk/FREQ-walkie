// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const basicAuth = require('express-basic-auth');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Allow JSON body parsing for API endpoints

// ─── Channel State ───
// channels = { "FREQ-CODE": { peers: Map<ws, {id, lastSeen}> } }
const channels = new Map();

function getOrCreateChannel(freq) {
  if (!channels.has(freq)) {
    channels.set(freq, { peers: new Map() });
  }
  return channels.get(freq);
}

function broadcastToChannel(freq, senderWs, message) {
  const channel = channels.get(freq);
  if (!channel) return;
  const data = JSON.stringify(message);
  channel.peers.forEach((info, ws) => {
    if (ws !== senderWs && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function getPeerCount(freq) {
  const channel = channels.get(freq);
  if (!channel) return 0;
  return channel.peers.size;
}

function removeFromAllChannels(ws) {
  channels.forEach((channel, freq) => {
    if (channel.peers.has(ws)) {
      const info = channel.peers.get(ws);
      channel.peers.delete(ws);
      console.log(`[${freq}] Peer ${info.id} left (${channel.peers.size} remaining)`);

      // Notify remaining peers
      broadcastToChannel(freq, null, {
        type: 'peer-left',
        peerId: info.id,
        peerCount: channel.peers.size,
      });

      // Cleanup empty channels
      if (channel.peers.size === 0) {
        channels.delete(freq);
        console.log(`[${freq}] Channel destroyed (empty)`);
      }
    }
  });
}

// ─── WebSocket Handler ───
wss.on('connection', (ws, req) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`New WS connection from ${ip}`);

  let currentFreq = null;
  let peerId = null;

  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    // 10KB payload limit to prevent memory exhaustion
    if (raw.length > 10240) {
      console.warn(`Payload too large, closing connection.`);
      ws.close(1009, 'Payload too large');
      return;
    }

    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.error('Invalid JSON:', raw.toString().slice(0, 100));
      return;
    }

    switch (msg.type) {

      // ── Join a frequency channel ──
      case 'join': {
        const freq = (msg.frequency || '').toUpperCase().trim();
        peerId = msg.peerId;

        if (!freq || !peerId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Missing frequency or peerId' }));
          return;
        }

        // Leave previous channel
        removeFromAllChannels(ws);

        // Join new channel
        const channel = getOrCreateChannel(freq);
        
        if (channel.peers.size >= 10) {
          ws.send(JSON.stringify({ type: 'error', message: 'Frequency is full (max 10 peers)' }));
          return;
        }

        currentFreq = freq;
        channel.peers.set(ws, { id: peerId, lastSeen: Date.now() });

        console.log(`[${freq}] Peer ${peerId} joined (${channel.peers.size} total)`);

        // Send current peer list to joiner
        const existingPeers = [];
        channel.peers.forEach((info, peerWs) => {
          if (peerWs !== ws) {
            existingPeers.push(info.id);
          }
        });

        ws.send(JSON.stringify({
          type: 'joined',
          frequency: freq,
          peerCount: channel.peers.size,
          existingPeers: existingPeers,
        }));

        // Notify others that a new peer arrived
        broadcastToChannel(freq, ws, {
          type: 'peer-joined',
          peerId: peerId,
          peerCount: channel.peers.size,
        });

        break;
      }

      // ── Leave current channel ──
      case 'leave': {
        removeFromAllChannels(ws);
        currentFreq = null;
        ws.send(JSON.stringify({ type: 'left' }));
        break;
      }

      // ── Text Chat ──
      case 'chat': {
        if (!currentFreq) return;
        const chatMsg = msg.text || '';
        if (!chatMsg.trim()) return;
        
        console.log(`[${currentFreq}] ${peerId} → CHAT: ${chatMsg.substring(0, 50)}`);
        
        broadcastToChannel(currentFreq, ws, {
          type: 'chat',
          fromId: peerId,
          text: chatMsg,
          timestamp: Date.now()
        });
        break;
      }

      // ── WebRTC Signaling: Offer ──
      case 'offer': {
        if (!currentFreq) return;
        console.log(`[${currentFreq}] ${peerId} → OFFER → ${msg.targetId || 'broadcast'}`);
        if (msg.targetId) {
          // Send to specific peer
          const channel = channels.get(currentFreq);
          if (channel) {
            channel.peers.forEach((info, peerWs) => {
              if (info.id === msg.targetId && peerWs.readyState === WebSocket.OPEN) {
                peerWs.send(JSON.stringify({
                  type: 'offer',
                  sdp: msg.sdp,
                  fromId: peerId,
                }));
              }
            });
          }
        } else {
          // Broadcast offer to all peers on channel
          broadcastToChannel(currentFreq, ws, {
            type: 'offer',
            sdp: msg.sdp,
            fromId: peerId,
          });
        }
        break;
      }

      // ── WebRTC Signaling: Answer ──
      case 'answer': {
        if (!currentFreq) return;
        console.log(`[${currentFreq}] ${peerId} → ANSWER → ${msg.targetId}`);
        const channel = channels.get(currentFreq);
        if (channel) {
          channel.peers.forEach((info, peerWs) => {
            if (info.id === msg.targetId && peerWs.readyState === WebSocket.OPEN) {
              peerWs.send(JSON.stringify({
                type: 'answer',
                sdp: msg.sdp,
                fromId: peerId,
              }));
            }
          });
        }
        break;
      }

      // ── WebRTC Signaling: ICE Candidate ──
      case 'candidate': {
        if (!currentFreq) return;
        if (msg.targetId) {
          const channel = channels.get(currentFreq);
          if (channel) {
            channel.peers.forEach((info, peerWs) => {
              if (info.id === msg.targetId && peerWs.readyState === WebSocket.OPEN) {
                peerWs.send(JSON.stringify({
                  type: 'candidate',
                  candidate: msg.candidate,
                  fromId: peerId,
                }));
              }
            });
          }
        } else {
          broadcastToChannel(currentFreq, ws, {
            type: 'candidate',
            candidate: msg.candidate,
            fromId: peerId,
          });
        }
        break;
      }

      // ── Heartbeat / keepalive ──
      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong' }));
        if (currentFreq) {
          const channel = channels.get(currentFreq);
          if (channel && channel.peers.has(ws)) {
            channel.peers.get(ws).lastSeen = Date.now();
          }
        }
        break;
      }

      default:
        console.log(`Unknown message type: ${msg.type}`);
    }
  });

  ws.on('close', () => {
    console.log(`WS closed: peer ${peerId || 'unknown'}`);
    removeFromAllChannels(ws);
  });

  ws.on('error', (err) => {
    console.error(`WS error for ${peerId}:`, err.message);
    removeFromAllChannels(ws);
  });
});

// ─── Heartbeat: Detect dead connections ───
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      removeFromAllChannels(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 15000);

wss.on('close', () => clearInterval(heartbeatInterval));

// ─── Protected Routes (Admin & Status) ───
const adminAuth = basicAuth({
  users: { 'admin': 'admin123' },
  challenge: true,
  realm: 'Admin Area'
});

app.get('/admin', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/api/admin/status', adminAuth, (req, res) => {
  const info = {};
  channels.forEach((channel, freq) => {
    info[freq] = {
      peerCount: channel.peers.size,
      peers: Array.from(channel.peers.values()).map(p => p.id),
    };
  });
  res.json({
    activeChannels: channels.size,
    totalConnections: wss.clients.size,
    channels: info,
  });
});

app.post('/api/admin/kick', adminAuth, (req, res) => {
  const { freq, peerId } = req.body;
  const channel = channels.get(freq);
  if (channel) {
    for (let [ws, info] of channel.peers.entries()) {
      if (info.id === peerId) {
        ws.send(JSON.stringify({ type: 'error', message: 'You have been kicked by an administrator.' }));
        ws.close(1008, 'Kicked by admin');
        return res.json({ success: true, message: `Kicked ${peerId} from ${freq}` });
      }
    }
  }
  res.status(404).json({ success: false, message: 'Peer or channel not found' });
});

app.post('/api/admin/close-room', adminAuth, (req, res) => {
  const { freq } = req.body;
  const channel = channels.get(freq);
  if (channel) {
    for (let [ws, info] of channel.peers.entries()) {
      ws.send(JSON.stringify({ type: 'error', message: 'This room was closed by an administrator.' }));
      ws.close(1008, 'Room closed by admin');
    }
    channels.delete(freq);
    return res.json({ success: true, message: `Closed room ${freq}` });
  }
  res.status(404).json({ success: false, message: 'Channel not found' });
});

// Unprotected endpoint to list active channels (useful for the UI sidebar)
app.get('/api/channels', (req, res) => {
  const info = {};
  channels.forEach((channel, freq) => {
    info[freq] = channel.peers.size;
  });
  res.json(info);
});

// ─── Start Server ───
const PORT = process.env.PORT || 9090;
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   FREQ WALKIE-TALKIE SIGNALING SERVER       ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   HTTP:  http://localhost:${PORT}              ║`);
  console.log(`║   WS:    ws://localhost:${PORT}                ║`);
  console.log('║   Status: /status                            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  console.log('Next: Run ngrok to expose publicly:');
  console.log(`  ngrok http ${PORT}`);
  console.log('');
});