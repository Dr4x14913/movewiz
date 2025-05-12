# Movewiz - Event Management System

A web-based event management application that allows users to create events, register participants, and send notifications. Built with Node.js, Express, and MySQL, with a focus on user-friendly interfaces and real-time updates.

## Overview
Movewiz is designed to streamline event coordination by providing a centralized platform for:
- Creating and managing events with detailed information
- Registering participants with customizable options
- Sending automated notifications to event owners and participants
- Integrating maps for location-based event details

The application features a responsive web interface with support for event editing and participant management witout any account or login required.

## Tech Stack
- **Backend**: Node.js, Express.js, MySQL
- **Database**: MariaDB (with Docker container)
- **Frontend**: HTML, CSS (Bulma), JavaScript (Leaflet for maps)
- **Utilities**: EJS for templating, Nodemailer for email notifications
- **Containerization**: Docker (with Docker Compose)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/Dr4x14913/movewiz.git
   cd movewiz
   ```

2. **Create environment file**
   ```bash
   # Database Configuration
   DB_HOST=db
   DB_PORT=3306
   DB_USER=user
   DB_PASS=mypswd
   DB_NAME=my_db

   # SMTP Configuration
   SMTP_HOST=smtp.example.com
   SMTP_PORT=587
   SMTP_SECURE=true
   SMTP_TLS=true
   SMTP_USER=smtpuser@domain.com
   SMTP_PASS=smtppassword
   SMTP_FROM=no-reply@yourdomain.com
   ```
   Update `stack.env` with your database credentials and SMTP settings.

    | Variable | Description |
    |---------|-------------|
    | `DB_HOST` | Database host (e.g., `db` for Docker) |
    | `DB_PORT` | Database port (e.g., `3306`) |
    | `DB_USER` | Database username |
    | `DB_PASS` | Database password |
    | `DB_NAME` | Database name |
    | `SMTP_HOST` | SMTP server host (e.g., `smtp.example.com`) |
    | `SMTP_PORT` | SMTP server port (e.g., `587`) |
    | `SMTP_SECURE` | Whether to use secure connection (`true`/`false`) |
    | `SMTP_TLS` | Whether to use TLS (`true`/`false`) |
    | `SMTP_USER` | SMTP username |
    | `SMTP_PASS` | SMTP password |
    | `SMTP_FROM` | Email address for sending notifications |

3. **Build and run**
  * With docker:
    ```bash
    docker-compose up --build
    ```
  * Without docker:
    - Setup the database:
      ```sql
      CREATE DATABASE my_db;

      USE my_db;

      CREATE TABLE events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        email VARCHAR(255),
        eventName VARCHAR(255),
        datePicker VARCHAR(32),
        address TEXT,
        latitude DECIMAL(10,8),
        longitude DECIMAL(10,8),
        readToken VARCHAR(255),
        editToken VARCHAR(255),
        comments TEXT
      );

      CREATE TABLE participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(255),
        lastName VARCHAR(255),
        email VARCHAR(255),
        showEmail BOOLEAN,
        registrationDate VARCHAR(32),
        mode VARCHAR(255),
        latitude DECIMAL(10,8),
        longitude DECIMAL(10,8),
        eventId INT,
        comments TEXT,
        phoneNumber VARCHAR(20),
        notifyMe BOOLEAN,
        FOREIGN KEY (eventId) REFERENCES events(id)
      );
      ```
    - Install Dependencies:
      ```bash
      npm install
      ```
    - Start the app:
      ```bash
      node --env-file=stack.env server.js
      ```

4. **Access the app**
   - Open http://localhost:3033 in your browser
   - Use the event creation form to start managing events

---

## API Routes Guide for Movewiz

This document provides a detailed overview of the API routes implemented in the Movewiz project. These routes are used to interact with the backend server and manage event data, participants, and notifications.

### 1. **`/api/createEvent` (POST)**

**Purpose**: Create a new event with the provided details.

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "eventName": "City Tour",
  "datePicker": "2023-10-15",
  "address": "123 Main Street",
  "latitude": "40.7128",
  "longitude": "-74.0060",
  "comments": "Join us for a fun day in the city!"
}
```

**Response**:
```json
{
  "readUrl": "http://localhost:3033/event?token=abc123",
  "writeUrl": "http://localhost:3033/edit?token=def456"
}
```

**Notes**:
- Generates a unique read and edit token for the event.
- Sends an email notification to the event owner with the event details and public/private URLs.
- Stores the event in the database.

### 2. **`/api/getEvent` (GET)**

**Purpose**: Retrieve event details using a token.

**Query Parameters**:
- `token`: The readToken or editToken of the event.

**Example Request**:
```
GET /api/getEvent?token=abc123
```

**Response**:
```json
{
  "event": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "eventName": "City Tour",
    "datePicker": "2023-10-15",
    "address": "123 Main Street",
    "latitude": "40.7128",
    "longitude": "-74.0060",
    "readToken": "abc123",
    "editToken": "def456",
    "comments": "Join us for a fun day in the city!"
  }
}
```

**Notes**:
- Returns the event details if the token is valid.
- If the token is invalid or the event doesn't exist, returns a 404 error.


### 3. **`/api/editEvent` (POST)**

**Purpose**: Update an event using the edit token.

**Request Body**:
```json
{
  "editToken": "def456",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "eventName": "City Tour 2023",
  "datePicker": "2023-10-16",
  "address": "456 Oak Avenue",
  "latitude": "40.7129",
  "longitude": "-74.0061",
  "comments": "Updated event details for 2023!"
}
```

**Response**:
```json
{
  "event": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "eventName": "City Tour 2023",
    "datePicker": "2023-10-16",
    "address": "456 Oak Avenue",
    "latitude": "40.7129",
    "longitude": "-74.0061",
    "readToken": "abc123",
    "editToken": "def456",
    "comments": "Updated event details for 2023!"
  }
}
```

**Notes**:
- Only the `editToken` is required in the request body.
- Updates the event details in the database.
- Returns the updated event data.


### 4. **`/api/registerParticipant` (POST)**

**Purpose**: Register a participant for an event using the read token.

**Request Body**:
```json
{
  "firstName": "Alice",
  "lastName": "Smith",
  "email": "alice.smith@example.com",
  "mode": "passenger",
  "showEmail": true,
  "token": "abc123",
  "registrationDate": "2023-10-10",
  "latitude": "40.7128",
  "longitude": "-74.0060",
  "comments": "I'm excited to join!",
  "phoneNumber": "123-456-7890",
  "notifyMe": true
}
```

**Response**:
```json
{
  "message": "Participant registered successfully"
}
```

**Notes**:
- Uses the `readToken` from the query to find the event.
- Sends an email notification to the event owner and all participants.
- Stores the participant in the database.


### 5. **`/api/getParticipants` (GET)**

**Purpose**: Retrieve all participants for an event using the read token.

**Query Parameters**:
- `token`: The readToken of the event.

**Example Request**:
```
GET /api/getParticipants?token=abc123
```

**Response**:
```json
[
  {
    "id": 1,
    "firstName": "Alice",
    "lastName": "Smith",
    "email": "alice.smith@example.com",
    "registrationDate": "2023-10-10",
    "mode": "passenger",
    "showEmail": true,
    "eventId": 1,
    "latitude": "40.7128",
    "longitude": "-74.0060",
    "comments": "I'm excited to join!",
    "phoneNumber": "123-456-7890",
    "notifyMe": true
  }
]
```

**Notes**:
- Returns all participants for the event if the token is valid.
- If the token is invalid or the event doesn't exist, returns a 404 error.


## License
This project is open-source and released under the MIT License.

For questions or feedback, feel free to open an issue on the repository.