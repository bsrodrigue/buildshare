import os
from pathlib import Path

import environ

env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Read .env file if it exists
if os.path.exists(BASE_DIR / ".env"):
    env.read_env(BASE_DIR / ".env")
