"""
Constraint names for the Binaries models (Application, Release).
"""

# UniqueConstraint names
UNIQUE_APP_PER_PROJECT = "unique_app_per_project"
UNIQUE_RELEASE_PER_APP = "unique_release_per_app"
UNIQUE_ARTIFACT_HASH_PER_RELEASE = "unique_artifact_hash_per_release"
UNIQUE_ARTIFACT_ARCH_PER_RELEASE = "unique_artifact_arch_per_release"
