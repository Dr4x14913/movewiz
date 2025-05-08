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
  const readUrl = `${req.protocol}://${req.get('host')}/event?token=${readToken}`;
  const writeUrl = `${req.protocol}://${req.get('host')}/edit?token=${editToken}`;

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
    res.json({readUrl, writeUrl });
  });
});

app.get('/api/getEvent', (req, res) => {
  const token = req.query.token;
  const isEdit = req.query.isEdit;
  let tokenType = "editToken";
  if (!token) {
    return res.status(400).send('Token is required');
  }
  if (!isEdit) {
    tokenType = "readToken"
  }
  db.query(`SELECT * FROM events WHERE ${tokenType} = '${token}'`, (error, results) => {
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
      if (key === 'editToken') continue; // Skip the tokens
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }

    if (fields.length === 0) {
      return res.json({ event });
    }

    const sql = `UPDATE events SET ${fields.join(', ')} WHERE editToken = '${editToken}'`;

    // Prepare the values array (updates + editToken)
    const valuesToUse = [...values];

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

app.post('/api/registerParticipant', (req, res) => {
  const { firstName, lastName, email, hasCar, showEmail, token, registrationDate } = req.body;
  const query = `
  INSERT INTO participants (firstName, lastName, email, registrationDate, hasCar, showEmail, eventId)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  let eventId;

  db.query(`SELECT id FROM events WHERE readToken='${token}'`, (error, results) => {
    if (error) {
      console.log('Failed to register participant ');
      return res.status(500).json({ error: 'Failed to register participant '});
    }
    else if (results.length > 1) {
      console.log('Multiples event found with this id, please contact an administrator.');
      return res.status(501).json({ error: 'Multiples event found with this id, please contact an administrator.' });
    } else {
      eventId = results[0].id;
      db.query(query, [firstName, lastName, email, registrationDate, hasCar, showEmail, eventId], (error, results) => {
        if (error) {
          console.log('Failed to register participant' + error);
          return res.status(502).json({ error: 'Failed to register participant' });
        }
        res.status(200).json({ message: 'Participant registered successfully' });
      });
    }
  });
});

app.get('/api/getParticipants', (req, res) => {
  const token = req.query.token;

  // Step 1: Find the event with the provided readToken
  db.query('SELECT * FROM events WHERE readToken = ?', [token], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Database error, ' + error  });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Event not found or invalid token' });
    }

    const eventId = results[0].id;

    // Step 2: Fetch all participants for this event
    db.query('SELECT * FROM participants WHERE eventId = ?', [eventId], (error, participants) => {
      if (error) {
        return res.status(500).json({ error: 'Database error, ' + error });
      }

      res.json(participants);
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
