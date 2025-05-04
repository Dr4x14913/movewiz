# Movwiz - Event Booking App

A simple web application for creating events with address autocomplete, map integration, and MySQL storage. Perfect for beta testing or event management needs.

---

## 🎯 Description

**Movwiz** is a beta version of an event booking application that allows users to input event details, such as name, date, and address. It features:

- Address autocomplete using the [Photon API](https://photon.komoot.io)
- Interactive map integration with Leaflet
- Unique URL generation for each event
- MySQL database storage for event data

## 🛠 Technologies Used

- **Backend**: Node.js with Express
- **Database**: MySQL
- **Frontend**: HTML, CSS (Bulma), JavaScript (Leaflet)
- **Dependencies**: 
  - `express` for API routing
  - `mysql2` for MySQL database connection
  - `uuid` for generating unique tokens

## 🛠 Setup Instructions

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Create `.env` File**:
   ```env
   DB_HOST=your_database_host
   DB_USER=your_database_user
   DB_PASS=your_database_password
   DB_NAME=your_database_name
   ```

3. **Create MySQL Database and Table**:
   ```sql
   CREATE DATABASE my_db;

   USE my_db;

   CREATE TABLE events (
     id INT AUTO_INCREMENT PRIMARY KEY,
     firstName VARCHAR(255),
     lastName VARCHAR(255),
     email VARCHAR(255),
     eventName VARCHAR(255),
     datePicker DATE,
     address VARCHAR(255),
     latitude DECIMAL(10,8),
     longitude DECIMAL(10,8),
     token VARCHAR(36)
   );
   ```

4. **Start the Server**:
   ```bash
   node server.js
   ```
   Or
   ```bash
   node --env-file=.env server.js
   ```

## API Routes

#### 1. `POST /api/createEvent`
**Description**: Creates a new event and returns a unique URL for it.  
**Purpose**: Stores event details in the MySQL database and generates a unique token for the event.  

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "eventName": "Birthday Party",
  "datePicker": "2023-10-15",
  "address": "123 Main St",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

**Response**:
```json
{
  "uniqueUrl": "https://example.com/event/5f96a677-1b4d-4a47-9c6c-1a5d6e7f890a"
}
```

#### 2. `GET /api/getEvent`
**Description**: Retrieves event details using a unique token.  
**Purpose**: Fetches event data from the MySQL database based on the provided token.  

**Query Parameters**:
- `token`: A unique identifier for the event (required).

**Response**:
```json
{
  "event": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "eventName": "Birthday Party",
    "datePicker": "2023-10-15",
    "address": "123 Main St",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "token": "5f96a677-1b4d-4a47-9c6c-1a5d6e7f890a"
  }
}
```

---

## 📝 Notes
- These endpoints are part of the backend and are used to store and retrieve event data.
- The `/api/createEvent` endpoint generates a unique token using UUID v4 and stores it in the database.
- The `/api/getEvent` endpoint uses the token to fetch the event details from the database.


## 📝 Notes

- The app uses **UUID v4** to generate unique tokens for each event.
- The **MySQL connection** is configured using environment variables from `.env`.
- The **Photon API** is used for address autocomplete and reverse geocoding.
- The **Leaflet map** is used for interactive address selection.
- The app is a **beta version**, so some features may require further refinement.

## 📚 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

