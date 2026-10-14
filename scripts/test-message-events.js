/**
 * scripts/test-message-events.js
 * Integration test for message deletion and editing real-time socket events.
 *
 * Verifies that:
 * 1. Sender and Receiver connect to Socket.io using valid JWT tokens.
 * 2. Sender posts a message via API.
 * 3. Sender edits the message via PATCH /api/messages/:id/edit.
 * 4. Receiver's socket receives 'messageEdited' event with updated text and isEdited=true.
 * 5. Sender deletes the message via DELETE /api/messages/:id.
 * 6. Receiver's socket receives 'messageDeleted' event with messageId.
 *
 * How to run:
 *   node scripts/test-message-events.js
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.join(__dirname, '../backend');
// Use a require function anchored to backend so all backend dependencies resolve cleanly
const requireBackend = createRequire(path.join(backendRoot, 'server.js'));

const http = requireBackend('http');
const mongoose = requireBackend('mongoose');
const jwt = requireBackend('jsonwebtoken');

// Load environment variables from backend/.env
requireBackend('dotenv').config({ path: path.join(backendRoot, '.env') });

// Load socket.io-client from backend devDependencies
const { io: ioClient } = requireBackend('socket.io-client');

const PORT = process.env.PORT || 5000;
const SERVER_URL = `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'someshSecretKey';
const MONGO_URI = process.env.MONGO_URI;

// Import models
const User = requireBackend('./models/user');
const Message = requireBackend('./models/message');

// Helper to make HTTP JSON requests
function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, SERVER_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('====================================================');
  console.log('🧪 Whispr Real-time Socket Events Integration Test');
  console.log('====================================================\n');

  // 1. Connect to MongoDB to fetch or prepare 2 test users
  console.log('1. Connecting to MongoDB to get test users…');
  await mongoose.connect(MONGO_URI);

  let userA = await User.findOne({ email: 'test_alice@whispr.com' });
  if (!userA) {
    userA = await User.create({
      name: 'Test Alice',
      email: 'test_alice@whispr.com',
      password: 'password123',
    });
  }

  let userB = await User.findOne({ email: 'test_bob@whispr.com' });
  if (!userB) {
    userB = await User.create({
      name: 'Test Bob',
      email: 'test_bob@whispr.com',
      password: 'password123',
    });
  }

  const tokenA = jwt.sign({ id: userA._id.toString() }, JWT_SECRET, { expiresIn: '1h' });
  const tokenB = jwt.sign({ id: userB._id.toString() }, JWT_SECRET, { expiresIn: '1h' });

  console.log(`   User A (Sender):   ${userA.name} (${userA._id})`);
  console.log(`   User B (Receiver): ${userB.name} (${userB._id})\n`);

  // 2. Connect both users via Socket.io
  console.log(`2. Connecting User A and User B sockets to ${SERVER_URL}…`);

  const socketA = ioClient(SERVER_URL, {
    auth: { token: tokenA },
    transports: ['websocket'],
  });

  const socketB = ioClient(SERVER_URL, {
    auth: { token: tokenB },
    transports: ['websocket'],
  });

  await Promise.all([
    new Promise((resolve, reject) => {
      socketA.on('connect', () => {
        console.log(`   ✓ Socket A connected (id: ${socketA.id})`);
        resolve();
      });
      socketA.on('connect_error', reject);
    }),
    new Promise((resolve, reject) => {
      socketB.on('connect', () => {
        console.log(`   ✓ Socket B connected (id: ${socketB.id})`);
        resolve();
      });
      socketB.on('connect_error', reject);
    }),
  ]);

  // Give server 200ms to register rooms
  await new Promise((r) => setTimeout(r, 200));

  // 3. User A sends a message to User B via HTTP API
  console.log('\n3. User A sending message to User B via POST /api/messages/send…');
  const sendRes = await makeRequest(
    'POST',
    '/api/messages/send',
    { Authorization: `Bearer ${tokenA}` },
    {
      receiverId: userB._id.toString(),
      message: 'Hello Bob! This message will be edited then deleted.',
    }
  );

  if (sendRes.status !== 201 || !sendRes.data.success) {
    throw new Error(`Failed to send message: ${JSON.stringify(sendRes.data)}`);
  }

  const createdMessage = sendRes.data.message;
  const messageId = (createdMessage._id || createdMessage.id).toString();
  console.log(`   ✓ Message created with ID: ${messageId}`);
  console.log(`   ✓ Original text: "${createdMessage.message}"`);

  // 4. Test Edit Message & Assert Receiver Socket Event
  console.log('\n4. User A editing message via PATCH /api/messages/:id/edit…');
  const newText = 'Hello Bob! This message has been EDITED.';

  const editPromiseB = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: Receiver socket did not receive "messageEdited" event within 4s'));
    }, 4000);

    socketB.on('messageEdited', (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

  const editRes = await makeRequest(
    'PATCH',
    `/api/messages/${messageId}/edit`,
    { Authorization: `Bearer ${tokenA}` },
    { message: newText }
  );

  if (editRes.status !== 200 || !editRes.data.success) {
    throw new Error(`Failed to edit message: ${JSON.stringify(editRes.data)}`);
  }
  console.log(`   ✓ Edit API response status: ${editRes.status}`);

  console.log('   Waiting for User B socket to receive "messageEdited"…');
  const receivedEdit = await editPromiseB;
  console.log('   ✓ User B received "messageEdited" event:', receivedEdit);

  if (String(receivedEdit.messageId) !== messageId) {
    throw new Error(`messageEdited payload ID mismatch! Expected ${messageId}, got ${receivedEdit.messageId}`);
  }
  if (receivedEdit.message !== newText) {
    throw new Error(`messageEdited text mismatch! Expected "${newText}", got "${receivedEdit.message}"`);
  }
  if (!receivedEdit.isEdited) {
    throw new Error(`messageEdited isEdited mismatch! Expected true, got ${receivedEdit.isEdited}`);
  }
  console.log('   ✅ EDIT ASSERTION PASSED: Receiver received edited message in real-time!');

  // 5. Test Delete Message & Assert Receiver Socket Event
  console.log('\n5. User A deleting message via DELETE /api/messages/:id…');

  const deletePromiseB = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout: Receiver socket did not receive "messageDeleted" event within 4s'));
    }, 4000);

    socketB.on('messageDeleted', (payload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });

  const deleteRes = await makeRequest(
    'DELETE',
    `/api/messages/${messageId}`,
    { Authorization: `Bearer ${tokenA}` }
  );

  if (deleteRes.status !== 200 || !deleteRes.data.success) {
    throw new Error(`Failed to delete message: ${JSON.stringify(deleteRes.data)}`);
  }
  console.log(`   ✓ Delete API response status: ${deleteRes.status}`);

  console.log('   Waiting for User B socket to receive "messageDeleted"…');
  const receivedDelete = await deletePromiseB;
  console.log('   ✓ User B received "messageDeleted" event:', receivedDelete);

  if (String(receivedDelete.messageId) !== messageId) {
    throw new Error(`messageDeleted payload ID mismatch! Expected ${messageId}, got ${receivedDelete.messageId}`);
  }
  console.log('   ✅ DELETE ASSERTION PASSED: Receiver received messageDeleted event in real-time!');

  // 6. Verify in DB that message is saved with isDeleted=true, message="", image=null
  console.log('\n6. Verifying database state of deleted message…');
  const dbMsg = await Message.findById(messageId);
  if (!dbMsg.isDeleted || dbMsg.message !== '' || dbMsg.image !== null) {
    throw new Error(`Database record not properly cleared! Record: ${JSON.stringify(dbMsg)}`);
  }
  console.log('   ✓ DB Message isDeleted: true');
  console.log('   ✓ DB Message text cleared: ""');
  console.log('   ✓ DB Message image cleared: null');
  console.log('   ✅ DATABASE INTEGRITY ASSERTION PASSED!');

  // Cleanup
  socketA.disconnect();
  socketB.disconnect();
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
