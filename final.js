const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
app.use(bodyParser.json({ limit: '10mb' })); // Allow larger payloads for Base64 images

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401); // Unauthorized

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403); // Forbidden
    req.user = user;
    next();
  });
};

// Admin Registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.clubAdmin.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    res.status(201).send('Admin registered');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error registering admin: ' + err.message);
  }
});

// Admin Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await prisma.clubAdmin.findUnique({ where: { username } });
    if (!admin) return res.status(404).send('Admin not found');

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(401).send('Invalid credentials');

    const token = jwt.sign({ id: admin.id, username: admin.username, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error during admin login: ' + err.message);
  }
});

// User Registration
app.post('/register-user', async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    res.status(201).send('User registered');
  } catch (err) {
    console.error(err);
    res.status(400).send('Error registering user: ' + err.message);
  }
});

// User Login
app.post('/login-user', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(404).send('User not found');

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).send('Invalid credentials');

    const token = jwt.sign({ id: user.id, username: admin.username, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error during user login: ' + err.message);
  }
});

// Add Event (with authorization check)
app.post('/events', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Access Denied: Only admins can add events');
  }

  const { name, time, poster, gformLink, locationLink } = req.body;

  try {
    const event = await prisma.event.create({
      data: {
        name,
        time: new Date(time),
        poster,
        gformLink,
        locationLink,
        createdById: req.user.id,
      },
    });

    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(400).send('Error adding event: ' + err.message);
  }
});

// Get Events
app.get('/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      orderBy: {
        time: 'desc' 
      },
    });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching events: ' + err.message);
  }
});

// Get Event by Username
app.get('/events/user/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const events = await prisma.event.findMany({
      where: {
        createdBy: {
          username: username,
        },
      },
      include: {
        createdBy: {
          select: { username: true },
        },
      },
    });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching events: ' + err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));