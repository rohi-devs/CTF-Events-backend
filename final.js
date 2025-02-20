const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

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

// Swagger UI route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new admin
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Username already exists
 */
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

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
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
/**
 * @swagger
 * /register-user:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Username already exists
 */
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
/**
 * @swagger
 * /login-user:
 *   post:
 *     summary: User login
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
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

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - dateTime
 *             properties:
 *               title:
 *                 type: string
 *               subtitle:
 *                 type: string
 *               description:
 *                 type: string
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *               poster:
 *                 type: string
 *               gformLink:
 *                 type: string
 *               location:
 *                 type: string
 *               locationLink:
 *                 type: string
 *               instaLink:
 *                 type: string
 *     responses:
 *       201:
 *         description: Event created successfully
 *       403:
 *         description: Access denied
 */
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

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of all events
 */
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

/**
 * @swagger
 * /announcements:
 *   post:
 *     summary: Create a new announcement
 *     tags: [Announcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *               poster:
 *                 type: string
 *               instaLink:
 *                 type: string
 *               gformLink:
 *                 type: string
 *     responses:
 *       201:
 *         description: Announcement created successfully
 *       403:
 *         description: Access denied
 */
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
/**
 * @swagger
 * /events/admin/{username}:
 *   get:
 *     summary: Get events by admin username
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin username
 *     responses:
 *       200:
 *         description: List of events by admin
 *       500:
 *         description: Server error
 */
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
/**
 * @swagger
 * /announcements/admin/{username}:
 *   get:
 *     summary: Get announcements by admin username
 *     tags: [Announcements]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin username
 *     responses:
 *       200:
 *         description: List of announcements by admin
 *       500:
 *         description: Server error
 */
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

// Add schemas for common models
/**
 * @swagger
 * components:
 *   schemas:
 *     Event:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - dateTime
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         subtitle:
 *           type: string
 *         description:
 *           type: string
 *         dateTime:
 *           type: string
 *           format: date-time
 *         poster:
 *           type: string
 *         gformLink:
 *           type: string
 *         location:
 *           type: string
 *         locationLink:
 *           type: string
 *         instaLink:
 *           type: string
 *         createdById:
 *           type: integer
 *     Announcement:
 *       type: object
 *       required:
 *         - description
 *       properties:
 *         id:
 *           type: integer
 *         description:
 *           type: string
 *         poster:
 *           type: string
 *         instaLink:
 *           type: string
 *         gformLink:
 *           type: string
 *         createdById:
 *           type: integer
 */

// Get Event by Event ID
app.get('/events/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const event = await prisma.event.findUnique({
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      where: { id: parseInt(id) }, 
    });

    const formattedEvents = event.map(event => ({
      id: event.id,
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      poster: event.poster,
      dateTime: event.dateTime,
      location: event.location,
      locationLink: event.locationLink,
      gformLink: event.gformLink,
      instaLink: event.instaLink,
      createdByUsername: event.createdBy ? event.createdBy.username : "Unknown",
    }));

    res.json(formattedEvents);

  } catch (err) {
    res.status(500).send("Error fetching event: " + err.message);
  }
});

// Get Announcement by Announcement ID
app.get('/announcements/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const announcement = await prisma.announcement.findUnique({
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      where: { id: parseInt(id) }, 
    });

    const formattedAnnouncements = announcement.map(announcement => ({
      id: announcement.id,
      description: announcement.description,
      poster: announcement.poster,
      gformLink: announcement.gformLink,
      instaLink: announcement.instaLink,
      createdByUsername: announcement.createdBy ? announcement.createdBy.username : "Unknown",
    }));

    res.json(formattedAnnouncements);
  } catch (err) {
    res.status(500).send("Error fetching announcement: " + err.message);
  }
});

app.get('/events_with_creators', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    });

    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.title,
      subtitle: event.subtitle,
      description: event.description,
      poster: event.poster,
      dateTime: event.dateTime,
      location: event.location,
      locationLink: event.locationLink,
      gformLink: event.gformLink,
      instaLink: event.instaLink,
      createdByUsername: event.createdBy ? event.createdBy.username : "Unknown",
    }));

    res.json(formattedEvents);
  } catch (err) {
    res.status(500).json({ error: "Error fetching events", details: err.message });
  }
});


app.get('/announcements_with_creators', async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: {
        createdBy: {
          select: { username: true },
        },
      },
      orderBy: {
        dateTime: 'desc',
      },
    });

    const formattedAnnouncements = announcements.map(announcement => ({
      id: announcement.id,
      description: announcement.description,
      poster: announcement.poster,
      gformLink: announcement.gformLink,
      instaLink: announcement.instaLink,
      createdByUsername: announcement.createdBy ? announcement.createdBy.username : "Unknown",
    }));

    res.json(formattedAnnouncements);
  } catch (err) {
    res.status(500).json({ error: "Error fetching events", details: err.message });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));