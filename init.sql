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
  contactToken VARCHAR(255) NULL,
  FOREIGN KEY (eventId) REFERENCES events(id)
);