from pathlib import Path

import environ

env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent
# The directory where manage.py and .env usually reside
APP_DIR = Path(__file__).resolve().parent.parent

# Read .env file if it exists
if (APP_DIR / ".env").exists():
    env.read_env(APP_DIR / ".env")
elif (BASE_DIR / ".env").exists():
    env.read_env(BASE_DIR / ".env")
