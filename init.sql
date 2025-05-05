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
  editToken VARCHAR(255)
);
