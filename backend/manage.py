#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""

import os
import sys

import django_stubs_ext
from django.core.management import execute_from_command_line

django_stubs_ext.monkeypatch()


def main() -> None:
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.django.local")
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
