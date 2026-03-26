# HackTeam Backend

HackTeam is an open source implementation of a Spaceteam-style game, re-themed as **Hack the Gibson** — a cyberpunk co-op game set in the world of the 1995 movie *Hackers*.

Players work together, shouting commands across devices, to overload the Gibson supercomputer and stop the Da Vinci virus before Agent Gill catches them.

## Tech Stack

- Python 3
- aiohttp
- python-socketio

## Running Locally

```bash
git clone https://github.com/hackers-team/backend.git hackersTeam
cd hackersTeam/backend-master

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure
cp settings.sample.ini settings.ini
# Edit settings.ini as needed (DEBUG=1 and SINGLE_PLAYER=1 for local dev)

# Run
python3 hackthegibson.py
```

The server starts on `http://127.0.0.1:4433` by default.

## Lexicon

The game vocabulary lives in `words/hackthegibson-lexicons/hackthegibson/`. All terms are drawn from the *Hackers* (1995) movie script. To modify or add words, edit the `.txt` files in that directory.

## Configuration

| Key | Default | Description |
|---|---|---|
| `DEBUG` | `0` | Enable debug logging |
| `SINGLE_PLAYER` | `0` | Single-player test mode |
| `SIO_HOST` | `127.0.0.1` | Server host |
| `SIO_PORT` | `4433` | Server port |
| `SSL_CERT` | `cert.crt` | Path to SSL cert (leave blank to disable SSL) |
| `SSL_KEY` | `key.key` | Path to SSL key (leave blank to disable SSL) |

## Special Events

| Socket Event | Description |
|---|---|
| `defeat_trace` | All players must shake the mouse to break an FBI trace |
| `defeat_virus` | All players must mash Enter to kill a virus attack |

## Hack the Planet
