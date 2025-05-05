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

app.get('/edit', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

/* ------------------------------------------------------------------------------------------------------------------ */
// API routes
/* ------------------------------------------------------------------------------------------------------------------ */
app.post('/api/createEvent', (req, res) => {
  const { firstName, lastName, email, eventName, datePicker, address, latitude, longitude } = req.body;

  // Generate a unique URL
  const readToken = uuidv4();
  const editToken = uuidv4();
  const uniqueUrl = `${req.protocol}://${req.get('host')}/event?token=${readToken}`;

  // Insert into MySQL
  const query = `
    INSERT INTO events (
      firstName, lastName, email, eventName, datePicker, address, latitude, longitude, readToken, editToken
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    firstName, lastName, email, eventName, datePicker, address, latitude, longitude, readToken, editToken
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ uniqueUrl });
  });
});

app.get('/api/getEvent', (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send('Token is required');
  }

  db.query('SELECT * FROM events WHERE readToken = ?', [token], (error, results) => {
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

app.post('/api/editEvent', (req, res) => {
  const editToken = req.body.editToken;

  if (!editToken) {
    return res.status(400).json({ error: 'Edit token is required' });
  }

  const updates = req.body;

  db.query('SELECT * FROM events WHERE editToken = ?', [editToken], (error, results) => {
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const event = results[0];

    const fields = [];
    const values = [];

    for (const key in updates) {
      if (key === 'editToken' || 'readToken') continue; // Skip the tokens
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }

    if (fields.length === 0) {
      return res.json({ event });
    }

    const sql = `UPDATE events SET ${fields.join(', ')} WHERE editToken = ?`;

    // Prepare the values array (updates + editToken)
    const valuesToUse = [...values, editToken];

    db.query(sql, valuesToUse, (error, result) => {
      if (error) {
        console.error('Database error during update:', error);
        return res.status(500).json({ error: 'Database error during update' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      // Return the updated event
      res.json({ event: { ...event, ...updates } });
    });
  });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
