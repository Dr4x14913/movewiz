#!/usr/bin/env python3
"""Register 25 test participants on movewiz dev event b5fb095f-... (each with
an address: reverse-geocoded from Nominatim, or generated if that fails)."""
import json
import math
import random
import time
import urllib.request
import urllib.error

BASE = "http://localhost:3033"
EVENT_LAT, EVENT_LNG = 47.72626899, -0.96354679

# Nominatim requires a valid User-Agent and is limited to ~1 req/s
UA = "movewiz-dev-seed/1.0 (developer test script)"

STREETS = [
    "rue de la Mairie", "rue des Lilas", "chemin des Vignes",
    "route de Nantes", "impasse du Château", "rue de l'Église",
    "allée des Peupliers", "rue du Moulin", "boulevard du 11 Novembre",
    "rue des Écoles",
]
# communes near the event (Maine-et-Loire / Vendée)
PLACES = [
    ("Le Pallet", "49330", "Maine-et-Loire"),
    ("Nuaillé", "49230", "Maine-et-Loire"),
    ("Chavagnes-en-Paillers", "49230", "Maine-et-Loire"),
    ("Treize-Vents", "49230", "Maine-et-Loire"),
    ("Landemont", "49330", "Maine-et-Loire"),
    ("Corpe", "49230", "Maine-et-Loire"),
    ("Saint-Léger-des-Bois", "49230", "Maine-et-Loire"),
    ("La Tessoualle", "49230", "Maine-et-Loire"),
    ("La Séguinière", "49500", "Maine-et-Loire"),
    ("Vezins", "49230", "Maine-et-Loire"),
    ("Tiffauges", "85700", "Vendée"),
    ("Beaulieu-sur-Layon", "49490", "Maine-et-Loire"),
]


def reverse_geocode(lat, lng):
    """Return Nominatim display_name for the point, or None on any failure."""
    url = ("https://nominatim.openstreetmap.org/reverse?format=json"
           f"&lat={lat}&lon={lng}")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            if res.status != 200:
                return None
            data = json.load(res)
        return data.get("display_name") or None
    except Exception:
        return None


def random_address(rng):
    """Fallback address in Nominatim display_name style."""
    street = rng.choice(STREETS)
    commune, postcode, dept = rng.choice(PLACES)
    return (f"{rng.randint(1, 120)} {street}, {commune}, {postcode}, "
            f"{dept}, Pays de la Loire, France")

# (first, last, mode, phone_suffix, showEmail, comment or None)
PARTICIPANTS = [
    ("Marie", "Lefebvre", "driver", "12 34 56 78", True, "Place pour 3 dans ma voiture"),
    ("Jean", "Martin", "passenger", "23 45 67 89", True, None),
    ("Sophie", "Bernard", "passenger", "34 56 78 90", True, None),
    ("Luc", "Moreau", "passenger", "45 67 89 01", False, None),
    ("Camille", "Petit", "driver", "56 78 90 12", True, None),
    ("Thomas", "Roux", "passenger", "67 89 01 23", True, "Peut partir 30 min en avance"),
    ("Léa", "Fournier", "passenger", "78 90 12 34", False, None),
    ("Antoine", "Girard", "passenger", "89 01 23 45", True, None),
    ("Chloé", "Bonnet", "driver", "90 12 34 56", True, "Place pour 4"),
    ("Maxime", "Lambert", "passenger", "01 23 45 67", True, None),
    ("Julie", "Mercier", "passenger", "12 34 56 09", True, None),
    ("Hugo", "Blanc", "passenger", "23 45 09 81", False, None),
    ("Emma", "Garnier", "driver", "34 09 81 22", True, None),
    ("Nicolas", "Faure", "passenger", "45 09 81 33", True, None),
    ("Manon", "Chevalier", "passenger", "09 81 22 44", True, "Voyage avec un vélo pliant"),
    ("David", "Fontaine", "passenger", "81 22 44 55", True, None),
    ("Alice", "Masson", "driver", "22 44 55 66", False, None),
    ("Florian", "André", "passenger", "44 55 66 77", True, None),
    ("Sarah", "Lemaire", "passenger", "55 66 77 88", True, None),
    ("Kevin", "Meunier", "driver", "66 77 88 99", True, None),
    ("Pauline", "Vincent", "passenger", "77 88 99 00", True, None),
    ("Adrien", "Michel", "passenger", "88 99 00 11", False, None),
    ("Inès", "Gauthier", "passenger", "99 00 11 22", True, None),
    ("Romain", "Perrin", "passenger", "00 11 22 33", True, None),
    ("Émilie", "Clément", "passenger", "11 22 33 44", True, None),
]

def main(base_url, token):
    rng = random.Random(42)
    failures = []

    for i, (first, last, mode, phone_suffix, show_email, comment) in enumerate(PARTICIPANTS):
        # random point 3-60 km around the event
        r_km = rng.uniform(3, 60)
        theta = rng.uniform(0, 2 * math.pi)
        lat = EVENT_LAT + (r_km / 111.0) * math.sin(theta)
        lng = EVENT_LNG + (r_km / (111.0 * math.cos(math.radians(EVENT_LAT)))) * math.cos(theta)

        # resolve a realistic address for the random point; fall back to a
        # generated one if Nominatim is unavailable / rate-limited
        address = reverse_geocode(lat, lng)
        if address is None:
            address = random_address(rng)
            print(f"  (nominatim failed for {first} {last}, using generated address)")
        time.sleep(1.05)  # stay under Nominatim's ~1 req/s limit

        body = {
            "firstName": first,
            "lastName": last,
            "email": f"{first.lower()}.{last.lower().replace('é', 'e')}@test.fr",
            "mode": mode,
            "showEmail": show_email,
            "token": token,
            "eventPageUrl": "http://localhost:5173/event",
            "editParticipantPageUrl": "http://localhost:5173/edit-participant",
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "address": address,
            "notifyMe": False,
            "phoneNumber": f"0{rng.choice('67')} {phone_suffix}",
            "comments": comment or "",
        }
        req = urllib.request.Request(
            base_url + "/api/registerParticipant",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                status = res.status
        except urllib.error.HTTPError as e:
            status = e.code
            print(f"  !! {first} {last}: HTTP {e.code} {e.read()[:200]!r}")
            failures.append((first, last, e.code))
            continue
        except Exception as e:
            print(f"  !! {first} {last}: {e}")
            failures.append((first, last, str(e)))
            continue
        print(f"  ok ({status}) {first} {last} [{mode}] {lat:.4f},{lng:.4f} — {address[:60]}")
        time.sleep(0.2)

    print(f"\nDone. Failures: {len(failures)}")

# verify final state
    with urllib.request.urlopen(base_url + f"/api/getParticipants?token={token}", timeout=15) as res:
        data = json.load(res)
    print(f"Total participants now: {len(data)}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Register participants on movewiz dev event")
    parser.add_argument("--token", required=True, type=str)
    parser.add_argument("--url", required=False, type=str, default=BASE)

    args = parser.parse_args()
    main(args.url, args.token)
