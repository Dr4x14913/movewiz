const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;

// MySQL connection
/*try {
  const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_password', // Update with your MySQL password
    database: 'event_db'       // Update with your database name
  });
} catch (err) {
  console.log("Error connecting to mysql server: ", err);
}*/
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); 

// Serve the main HTML file at the root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

// API route to create an event
app.post('/api/createEvent', (req, res) => {
  const { firstName, lastName, email, eventName, datePicker, address, latitude, longitude } = req.body;

  // Generate a unique URL
  const uniqueUrl = `https://example.com/event/${uuidv4()}`;

  // Insert into MySQL
  const query = `
    INSERT INTO events (
      firstName, lastName, email, eventName, datePicker, address, latitude, longitude, uniqueUrl
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    firstName, lastName, email, eventName, datePicker, address, latitude, longitude, uniqueUrl
  ];

  /*db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ uniqueUrl });
  });*/
  res.json({ uniqueUrl });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});