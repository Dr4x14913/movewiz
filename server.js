const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const ejs = require('ejs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const svgCaptcha = require('svg-captcha');

const app = express();
const PORT = 3000;
/* ------------------------------------------------------------------------------------------------------------------ */
// Session configuration
/* ------------------------------------------------------------------------------------------------------------------ */
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
/* ------------------------------------------------------------------------------------------------------------------ */
// Rate limiting configuration
/* ------------------------------------------------------------------------------------------------------------------ */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit to 100 requests per window
  message: 'Too many requests, please try again later.',
  statusCode: 429
});

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
// SMTP configuration and mailing functions
/* ------------------------------------------------------------------------------------------------------------------ */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  requireTLS: process.env.SMTP_TLS === 'true', 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
// Function to send email
function sendEmail(to, subject, html) {
  const mailOptions = {
    from: process.env.SMTP_FROM || 'no-reply@yourdomain.com',
    to,
    subject,
    html
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.messageId);
    }
  });
}

function notifyAll(eventId, ownerEmail, subject, data, ejsFile) {
  db.query(`SELECT email FROM participants WHERE notifyMe = 1 AND eventId = ${eventId}`, (error, results) => {
    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Render the EJS template once
    ejs.renderFile(path.join(__dirname, 'mail_templates', ejsFile), data, (err, html) => {
      if (err) {
        console.error('Error rendering email template:', err);
        return res.status(500).json({ error: 'Error rendering email template:' + err});
      }

      // Send to the owner
      sendEmail(ownerEmail, subject, html);

      // Send to all participants
      results.forEach(participant => {
        sendEmail(participant.email, subject, html);
      });

      // Optional: Log confirmation
      console.log(`Emails sent to ${results.length} participants and owner.`);
    });
  });
}
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
  const { firstName, lastName, email, eventName, datePicker, address, latitude, longitude, comments } = req.body;

  // Generate a unique URL
  const readToken = uuidv4();
  const editToken = uuidv4();
  const readUrl = `${req.protocol}://${req.get('host')}/event?token=${readToken}`;
  const writeUrl = `${req.protocol}://${req.get('host')}/edit?token=${editToken}`;

  // Insert into MySQL
  const query = `
    INSERT INTO events (
      firstName, lastName, email, eventName, datePicker, address, latitude, longitude, readToken, editToken, comments
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    firstName, lastName, email, eventName, datePicker, address, latitude, longitude, readToken, editToken, comments,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    // Send email to event owner
    ejs.renderFile(path.join(__dirname, 'mail_templates', 'event_creation.ejs'), { eventName, eventAddress: address, latitude, longitude, eventDate: datePicker, eventComments: comments, publicUrl: readUrl, privateUrl: writeUrl}, (err, html) => {
      if (err)
        console.error(err);
      else {
        sendEmail(email,"[Movewiz] New Event Created", html);
      }
    });
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
  const { firstName, lastName, email, mode, showEmail, token, registrationDate, latitude, longitude, comments, phoneNumber, notifyMe } = req.body;
  const query = `
  INSERT INTO participants (firstName, lastName, email, registrationDate, mode, showEmail, eventId, latitude, longitude, comments, phoneNumber, notifyMe, contactToken)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  let eventId;
  let ownerEmail;
  let eventName;
  const contactToken = uuidv4();

  db.query(`SELECT id, email, eventName FROM events WHERE readToken='${token}'`, (error, results) => {
    if (error) {
      console.log('Failed to register participant ');
      return res.status(500).json({ error: 'Failed to register participant '});
    }
    else if (results.length > 1) {
      console.log('Multiples event found with this id, please contact an administrator.');
      return res.status(501).json({ error: 'Multiples event found with this id, please contact an administrator.' });
    } else {
      eventId = results[0].id;
      ownerEmail = results[0].email
      eventName = results[0].eventName
      db.query(query, [firstName, lastName, email, registrationDate, mode, showEmail, eventId, latitude, longitude, comments, phoneNumber, notifyMe, contactToken], (error, results) => {
        if (error) {
          console.log('Failed to register participant' + error);
          return res.status(502).json({ error: 'Failed to register participant' });
        }
        notifyAll(eventId, ownerEmail, "[Movewiz] A new partitipant joined the event !", {eventName, firstName, lastName, mode, email: showEmail ? email : "Hidden email", latitude, longitude, comments, phoneNumber, url: `${req.protocol}://${req.get('host')}/event?token=${token}`}, "new_participant.ejs");
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

app.post('/api/contactParticipant', limiter, (req, res) => {
  const contactToken = req.body.contactToken;
  const answer = req.body.answer;
  const senderEmail = req.body.senderEmail;
  const message = req.body.message;
  const eventName = req.body.eventName;

  if (req.session.captcha !== answer) {
    console.log('Invalid captcha');
    return res.status(401).json({ error: 'Invalid captcha' });
  }

  db.query('SELECT * FROM participants WHERE contactToken = ?', [contactToken], (error, results) => {
    if (error) {
      console.log('Database error');
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      console.log('Participant not found');
      return res.status(404).json({ error: 'Participant not found' });
    }
    const participant = results[0];
    const participantEmail = participant.email;

    // Send email to participant
    ejs.renderFile(path.join(__dirname, 'mail_templates', 'contact.ejs'), { senderEmail, message }, (err, html) => {
      if (err)
        console.error(err);
      else 
        sendEmail(participantEmail, `[Movewiz] Contact from event ${eventName}`, html);
    });
    delete req.session.captcha;

    res.json({ success: true });
  });
});

app.get('/generate-captcha', (req, res) => {
  const captcha = svgCaptcha.create({
    size: 5, // Number of characters
    ignoreChars: '0Oo1i', // Characters to avoid
    noise: 3, // Number of noise lines
    color: true, // Colorful characters
    width: 150, // Width of the captcha
    height: 50, // Height of the captcha
    fontSize: 40 // Font size
  });
  req.session.captcha = captcha.text;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(captcha.data);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
