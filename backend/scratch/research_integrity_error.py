import sys
import os

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.django.local")

import django
django.setup()

from django.db import IntegrityError, transaction
from projects.models import Project, UserProjectProfile
from django.contrib.auth import get_user_model
from projects.constraints import UNIQUE_PROJECT_ADMIN

User = get_user_model()

def run_test():
    try:
        # Cleanup
        User.objects.all().delete()
        Project.objects.all().delete()

        u = User.objects.create_user(email='test@example.com', password='password123')
        p = Project.objects.create(title='Test Project')

        # Create first admin
        UserProjectProfile.objects.create(user=u, project=p, role=UserProjectProfile.Role.ADMIN)
        print("First admin created.")

        # Try to create second admin (violates unique_project_admin)
        try:
            with transaction.atomic():
                UserProjectProfile.objects.create(user=u, project=p, role=UserProjectProfile.Role.ADMIN)
        except IntegrityError as e:
            print(f"IntegrityError for unique_project_admin: {e}")
            
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == "__main__":
    run_test()
