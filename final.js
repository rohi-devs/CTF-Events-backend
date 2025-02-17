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

// Add this helper function at the top after imports
const validatePassword = (password) => {
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
};

// Admin Registration
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  // Password validation
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).send(passwordCheck.message);
  }

  try {
    // Check if username already exists
    const existingAdmin = await prisma.clubAdmin.findUnique({ where: { username } });
    if (existingAdmin) {
      return res.status(409).send('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.clubAdmin.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    res.status(201).send('Admin registered successfully');
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).send('Username already exists');
    }
    res.status(400).send('Error registering admin: ' + err.message);
  }
});

// Admin Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const admin = await prisma.clubAdmin.findUnique({ where: { username } });
    if (!admin) {
      return res.status(401).send('Invalid username or password');
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).send('Invalid username or password');
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error during login');
  }
});

// User Registration
app.post('/register-user', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  // Password validation
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    return res.status(400).send(passwordCheck.message);
  }

  try {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(409).send('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    res.status(201).send('User registered successfully');
  } catch (err) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).send('Username already exists');
    }
    res.status(400).send('Error registering user: ' + err.message);
  }
});

// User Login
app.post('/login-user', async (req, res) => {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).send('Username and password are required');
  }

  try {
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).send('Invalid username or password');
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).send('Invalid username or password');
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: 'user' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error during login');
  }
});

// Add Event (with authorization check)
app.post('/events', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Access Denied: Only admins can add events');
  }

  const { title, subtitle, description, dateTime, poster, gformLink, location, locationLink, instaLink } = req.body;

  try {
    const event = await prisma.event.create({
      data: {
        title,
        subtitle,
        description,
        dateTime: new Date(dateTime),
        poster,
        gformLink,
        location,
        locationLink,
        instaLink,
        createdById: req.user.id,
      },
    });

    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(400).send('Error adding event: ' + err.message);
  }
});

// Get All Events
app.get('/events', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      orderBy: {
        dateTime: 'desc'
      },
    });
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching events: ' + err.message);
  }
});

// Add Announcement (admin only)
app.post('/announcements', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Access Denied: Only admins can add announcements');
  }

  const { description, poster, instaLink, gformLink } = req.body;

  try {
    const announcement = await prisma.announcement.create({
      data: {
        description,
        poster,
        instaLink,
        gformLink,
        createdById: req.user.id,
      },
    });

    res.status(201).json(announcement);
  } catch (err) {
    console.error(err);
    res.status(400).send('Error adding announcement: ' + err.message);
  }
});

// Get All Announcements
app.get('/announcements', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      orderBy: {
        id: 'desc'
      },
    });
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching announcements: ' + err.message);
  }
});

// Get Events by Admin Username
app.get('/events/admin/:username', async (req, res) => {
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

// Get Announcements by Admin Username
app.get('/announcements/admin/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const announcements = await prisma.announcement.findMany({
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
    res.json(announcements);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching announcements: ' + err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));