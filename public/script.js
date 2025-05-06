var latitude;
var longitude;
var marker;

function toggleTheme() {
    const toggleButton = document.getElementById('theme-toggle');
    const html_c = document.documentElement;
    if (html_c.classList.contains('theme-dark')) {
        html_c.classList.remove('theme-dark');
    } else {
        html_c.classList.add('theme-dark');
    }
}

// Address Autocomplete Function
async function auto_complete_addr() {
    const addressInput = document.getElementById('addressInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const query = addressInput.value.trim();
    if (query.length < 3) {
        suggestionsDiv.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();

        suggestionsDiv.innerHTML = '';
        if (data.features.length === 0) {
            suggestionsDiv.innerHTML = '<div class="content has-text-centered"><p>No results found</p></div>';
            return;
        }

        data.features.forEach(feature => {
            const name    = feature.properties.name || `${feature.properties.housenumber} ${feature.properties.street}`;
            const city    = feature.properties.city || feature.properties.district;
            const country = feature.properties.country;

            const lat = feature.geometry.coordinates[1];
            const lng = feature.geometry.coordinates[0];

            const div = document.createElement('div');
            div.className = 'suggestion';
            div.innerHTML = `<div class="content">${name}<div class="has-text-grey">${city}, ${country}</div></div>`;
            div.addEventListener('click', () => {
                addressInput.value = `${name}, ${city}, ${country}`;
                suggestionsDiv.innerHTML = '';
                updateMapPos(lat,lng)
            });
            suggestionsDiv.appendChild(div);
        });
    } catch (error) {
        suggestionsDiv.innerHTML = '<div class="content has-text-centered"><p>Error fetching data</p></div>';
        console.error(error);
    }
}

function initMap(lat, lng, interactive=true) {
    map = L.map('map').setView([lat, lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    updateMapPos(lat, lng);

    if (interactive) {
      map.on('click', async function (e) {
          const suggestionsDiv = document.getElementById('suggestions');
          const addressInput = document.getElementById('addressInput');
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;

          const response = await fetch(`https://photon.komoot.io/reverse/?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}`);
          const data = await response.json();
          const feature = data.features[0];
          const name = feature.properties.name ||
              `${feature.properties.housenumber} ${feature.properties.street}`;
          const city = feature.properties.city || feature.properties.district;
          const country = feature.properties.country;
          const address = name + ", " + city + ", " + country;
          addressInput.value = address;
          suggestionsDiv.innerHTML = '';
          updateMapPos(lat,lng)
      });
    }
}

function updateMapPos(lat, lng){
    map.setView([lat, lng], 13);
    if (marker != undefined) {
        map.removeLayer(marker);
    }
    marker = L.marker([lat, lng]).addTo(map);
    latitude  = lat;
    longitude = lng;
}

function submitForm(update=false, editToken="") {
    // Extract and trim input values
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('email').value.trim();
    const eventName = document.getElementById('eventName').value.trim();
    const datePicker = document.getElementById('datePicker').value;
    const address = document.getElementById('addressInput').value.trim();

    // Error messages
    let isValid = true;
    let errorMessage = [];

    // Validate required fields
    if (!firstName) {
        isValid = false;
        errorMessage.push('First Name is required');
    }
    if (!lastName) {
        isValid = false;
        errorMessage.push('Last Name is required. ');
    }
    if (!email) {
        isValid = false;
        errorMessage.push('Email is required. ');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        isValid = false;
        errorMessage.push('Invalid email format. ');
    }
    if (!eventName) {
        isValid = false;
        errorMessage.push('Event Name is required.');
    }
    if (!datePicker) {
        isValid = false;
        errorMessage.push('Date is required. ');
    }
    if (!address) {
        isValid = false;
        errorMessage.push('Address is required. ');
    }

    // If any field is invalid, show error modal
    if (!isValid) {
        showErrorMessage(errorMessage);
        return;
    }

    // Proceed with form processing
    const data = {
        firstName,
        lastName,
        email,
        eventName,
        datePicker,
        address,
        latitude,
        longitude
    };

    if (update)
        data['editToken'] = editToken;

    const json = JSON.stringify(data, null, 2);
    if (!update){
        fetch('/api/createEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: json
        }).then(response => response.json()).then(result => {
            document.getElementById('result').innerHTML = `Your unique URL that you can share: <a href=${result.readUrl}>${result.readUrl}</a></br>Your <b>private</b> URL for edition: <a href=${result.writeUrl}>${result.writeUrl}</a>`;
        }).catch(error => {
            document.getElementById('result').textContent = 'An error occured:' + error;
            console.error('Error:', error);
        });
    } else {
        fetch('/api/editEvent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: json
        }).then(response => response.json()).then(result => {
          alert('Update successful!');
        }).catch(error => {
            document.getElementById('result').textContent = 'An error occured:' + error;
            console.error('Error:', error);
        });
    }
}

function showErrorMessage(message) {
    const modal = document.getElementById('errorModal');
    const modalMessage = document.getElementById('modalMessage');
    modalMessage.innerHTML = '';
    message.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        modalMessage.appendChild(li);
    });
    modal.classList.add('is-active');
}

function closeModal() {
    const modal = document.getElementById('errorModal');
    modal.classList.remove('is-active');
}
