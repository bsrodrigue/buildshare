"""
Constraint names for the Project models.
"""

# UniqueConstraint names
UNIQUE_PROJECT_ADMIN = "unique_project_admin"
UNIQUE_USER_PROJECT = "unique_user_project"

# CheckConstraint names
CHECK_PROJECT_INVITATION_STATUS_VALID = "check_project_invitation_status_valid"
CHECK_PROJECT_INVITATION_ROLE_VALID = "check_project_invitation_role_valid"
