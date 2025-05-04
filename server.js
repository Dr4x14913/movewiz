const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
/* ------------------------------------------------------------------------------------------------------------------ */
// MySQL connection
/* ------------------------------------------------------------------------------------------------------------------ */
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || '3306',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME  
});


/* ------------------------------------------------------------------------------------------------------------------ */
// Serve static files
/* ------------------------------------------------------------------------------------------------------------------ */
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); 

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/event', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'event.html'));
});

/* ------------------------------------------------------------------------------------------------------------------ */
// API routes
/* ------------------------------------------------------------------------------------------------------------------ */
app.post('/api/createEvent', (req, res) => {
  const { firstName, lastName, email, eventName, datePicker, address, latitude, longitude } = req.body;

  // Generate a unique URL
  const uniqToken = uuidv4();
  const uniqueUrl = `https://example.com/event/${uniqToken}`;

  // Insert into MySQL
  const query = `
    INSERT INTO events (
      firstName, lastName, email, eventName, datePicker, address, latitude, longitude, token
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    firstName, lastName, email, eventName, datePicker, address, latitude, longitude, uniqToken
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ uniqueUrl });
  });
  //res.json({ uniqueUrl });
});

app.get('/api/getEvent', (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send('Token is required');
  }

  db.query('SELECT * FROM events WHERE token = ?', [token], (error, results) => {
    if (error) {
      console.error('Database error:', error);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('Event not found');
    }

    const event = results[0];
    res.json({ event })
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});