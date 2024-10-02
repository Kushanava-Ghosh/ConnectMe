const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
const http = require('http');
const dotenv = require('dotenv').config();
const bodyparser = require('body-parser');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Check if uploads folder exists, if not, create it
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for handling media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Specify your upload folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Append the timestamp to the file name
  },
});
const upload = multer({ storage });

// Enable CORS
app.use(cors());
app.use('/uploads', express.static('uploads'));

const server = http.createServer(app);  // Create HTTP server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow your client URL
  },
});  // Initialize Socket.IO

// MongoDB connection URI
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Connect to MongoDB
client.connect();

app.use(bodyparser.json());

app.get('/api/login', (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    collection.find().toArray()
      .then(users => {
        res.json(users);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Server Error' });
      });
  });

  app.post('/api/login', async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    const { email, password } = req.body;
    const user = await collection.findOne({ email, password });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid email or password' });
      }
      res.json({ success: true, message: 'Login successful', user: {firstName: user.firstName, lastName: user.lastName}});
  });

  app.get('/api/users', (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    collection.find().toArray()
      .then(users => {
        res.json(users);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Server Error' });
      });
  });

  app.post('/api/users', async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    const { firstName, lastName, email, password } = req.body;
    const user = await collection.findOne({ email });
      if (user) {
        return res.status(400).json({ success: false, message: 'Username already Exists' });
      }
      const newUser = { firstName, lastName, email, password };
      await collection.insertOne(newUser);
      res.json({ success: true, message: 'Registered successful' });
  });

  // Route to fetch chats for a specific user by email
  app.get('/api/chats', async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    const userEmail = req.query.email; // Get the email from query parameters

    if (!userEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    try {
      // Find the user by their email in the users collection
      const user = await collection.findOne({ email: userEmail });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Return the user's contacts (chat rooms)
      res.json({
        contacts: user.contacts,
      });
    } catch (error) {
      console.error('Error fetching chat data:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  });

  app.get('/api/messages', async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('ChatRooms');
    const { chatId } = req.query;
  
    if (!chatId) {
      return res.status(400).json({ message: 'chatId is required' });
    }
  
    try {
      // Find the messages for the specified chatId
      const chat = await collection.findOne({ ChatRoomID: chatId });
  
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }
  
      // Return the chat's messages
      res.json({ messages: chat.messages });
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Server error', error });
    }
  });

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('ChatRooms');
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded.');
      }

      const fileurl = `http://192.168.1.104:3000/uploads/${req.file.filename}`;
  
      const mediaMessage = {
        sender: req.body.sender,
        message: fileurl,  // Store file as base64 string
        type: req.body.type,  // 'image' or 'video'
        timestamp: new Date()
      };
  
      const result = await collection.updateOne(
        { ChatRoomID: req.body.chatId},
        { $push: {message: mediaMessage}}
      );
      res.status(200).json(result.ops[0]);  // Return the inserted message
    } catch (error) {
      console.error('Error uploading media:', error);
      res.status(500).send('Server error');
    }
  });

  // app.post('/api/messages', async (req, res) => {
  //   const db = client.db('ChatApp');
  //   const collection = db.collection('ChatRooms');
  //   const { ChatRoomId, message } = req.body;
  
  //   try {
  //     // Find the chatroom by chatroomId and update the messages array
  //     const result = await collection.updateOne(
  //       { ChatRoomId },  // Match chatroom by ID
  //       { $push: { messages: message } }    // Push the new message to the messages array
  //     );
  
  //     if (result.matchedCount === 0) {
  //       return res.status(404).json({ error: 'Chatroom not found' });
  //     }

  //     // Optionally, return the updated messages or a success response
  //     res.status(200).json({ message: 'Message added successfully' });
  //   } catch (err) {
  //     console.error('Error updating chatroom:', err);
  //     res.status(500).json({ error: 'Server error' });
  //   }
  // });

  // WebSocket connection handler
  io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', (chatId) => {
    socket.join(chatId); // Join the room corresponding to the chat
    console.log(`User ${socket.id} joined room: ${chatId}`);
  });

  socket.on('sendMessage', async ({ chatId, message }) => {
    const db = client.db('ChatApp');
    const collection = db.collection('ChatRooms');

    const newMessage = {
      sender: message.sender,
      message: message.message,
      timestamp: new Date().toISOString(),
    };

    try {
      // Save the new message in the database
      await collection.updateOne(
        { ChatRoomID: chatId }, 
        { $push: { messages: newMessage } }
      );

      // Broadcast the message to others in the room
      io.to(chatId).emit('receiveMessage', newMessage);
        } catch (error) {
          console.error('Error sending message:', error);
        }
      });

    // Handle sending a message
    socket.on('sendRequest', async (data) => {
      const db = client.db('ChatApp');
      const collection = db.collection('Users');
      const { receiver, sender, message } = data;
      try {
        // Update the receiver's inReq array
        await collection.updateOne(
          { email: receiver },
          { $push: { inReq: { sender, message, timestamp: new Date() } } }
        );

        await collection.updateOne(
          { email: sender},
          { $push: { outReq: receiver}}
        );
        
      } catch (error) {
        console.error('Error sending message:', error);
      }

      io.to(receiver).emit('receiveRequest', { sender, message, timestamp: new Date() });
    });

    // Listen for createChatRoom event
  socket.on('sendChatRoom', async ({ ChatRoomID, participants }) => {
    const db = client.db('ChatApp');
    const collection = db.collection('ChatRooms');
    const collection_ = db.collection('Users')
    try {
      // Check if the chat room already exists
      const existingChatRoom = await collection.findOne({ ChatRoomID });
      if (existingChatRoom) {
        console.log('Chat room already exists:', ChatRoomID);
        return;
      }

      // Create a new chat room
      const newChatRoom = {
        ChatRoomID,
        participants,
        messages: [], // Initialize with an empty array of messages
      }
      
      // Save the chat room to the database
      await collection.insertOne(newChatRoom);
      await collection_.updateOne(
        { email: participants[0] },
        { $push: {contacts: {email: participants[1], chatroomId: ChatRoomID}}}
      );
      await collection_.updateOne(
        { email: participants[1] },
        { $push: {contacts: {email: participants[0], chatroomId: ChatRoomID}}}
      );
      console.log('New chat room created:', ChatRoomID);
    } catch (error) {
      console.error('Error creating chat room:', error);
    }
    io.to(participants[0]).emit('receiveChatRoom', { id: ChatRoomID, username: participants[1], profilePic: 'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/elon.png', lastMessage: 'Hey, how are you?' });
    io.to(participants[1]).emit('receiveChatRoom', { id: ChatRoomID, username: participants[0], profilePic: 'https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/elon.png', lastMessage: 'Hey, how are you?' });
  });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  // Express.js API route to search users by query
  app.get('/api/user', async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    const emailQuery = req.query.email || '';
    if (typeof emailQuery !== 'string') {
      emailQuery = String(emailQuery);
    }
    const users = await collection
                          .find({ email: { $regex: new RegExp(emailQuery, 'i') } }) // case-insensitive search
                          .limit(10)
                          .toArray();
    res.json(users);
  });

  app.get('/api/requests', async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    const { email } = req.query;
    const user = await collection.findOne({ email });
    try {
      if (user) {
        res.json({ outReq: user.outReq });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error fetching requests', error });
    }
  });

  app.get('/api/request', async (req, res) => {
    const db = client.db('ChatApp');
    const collection = db.collection('Users');
    const { email } = req.query;
    const user = await collection.findOne({ email });
    try {
      if (user) {
        res.json({ inReq: user.inReq });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Error fetching requests', error });
    }
  });

  // Accept Request
  app.post('/api/accept', async (req, res) => {
    const { sender, receiver } = req.body;
    const db = client.db('ChatApp');
    const collection = db.collection('Users');

    try {
      // Remove the request from the receiver's inReq array
      await collection.updateOne(
        { email: receiver },
        { $pull: { inReq: { sender } } }
      );

      // Remove the request from the sender's outReq array
      await collection.updateOne(
        { email: sender },
        { $pull: { outReq: receiver } } // Remove the receiver's email from outReq
      );

      res.status(200).json({ message: 'Request accepted and chat room created.' });
      } catch (error) {
        console.error('Error accepting request:', error);
        res.status(500).json({ message: 'Failed to accept request.' });
      }
    });

  server.listen(4000, function(){
    console.log('Listening on *:4000');
  })

  // Start the server
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });