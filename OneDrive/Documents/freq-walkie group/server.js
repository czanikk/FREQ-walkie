// server.js
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

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
        currentFreq = freq;
        const channel = getOrCreateChannel(freq);
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

// ─── Status endpoint ───
app.get('/status', (req, res) => {
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

// ─── Start Server ───
const PORT = process.env.PORT || 5500;
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