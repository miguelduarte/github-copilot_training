"""Tests for the Mergington High School Activities API."""
import pytest


class TestActivitiesEndpoint:
    """Test the /activities GET endpoint."""

    def test_get_activities_returns_dict(self, client):
        """Test that /activities returns a dictionary of activities."""
        response = client.get("/activities")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    def test_get_activities_contains_required_fields(self, client):
        """Test that each activity has required fields."""
        response = client.get("/activities")
        activities = response.json()

        for name, details in activities.items():
            assert isinstance(name, str)
            assert "description" in details
            assert "schedule" in details
            assert "max_participants" in details
            assert "participants" in details
            assert isinstance(details["participants"], list)

    def test_get_activities_has_expected_activities(self, client):
        """Test that expected activities are present."""
        response = client.get("/activities")
        activities = response.json()

        expected_activities = [
            "Chess Club",
            "Programming Class",
            "Gym Class",
            "Basketball Club",
            "Swimming Team",
        ]
        for activity in expected_activities:
            assert activity in activities


class TestSignupEndpoint:
    """Test the /activities/{activity_name}/signup POST endpoint."""

    def test_signup_new_participant(self, client):
        """Test signing up a new participant."""
        email = "test@example.com"
        activity = "Chess Club"

        response = client.post(
            f"/activities/{activity}/signup",
            params={"email": email},
        )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert email in data["message"]
        assert activity in data["message"]

    def test_signup_duplicate_participant_fails(self, client):
        """Test that signing up the same person twice fails."""
        email = "duplicate@example.com"
        activity = "Programming Class"

        # First signup should succeed
        response1 = client.post(
            f"/activities/{activity}/signup",
            params={"email": email},
        )
        assert response1.status_code == 200

        # Second signup should fail
        response2 = client.post(
            f"/activities/{activity}/signup",
            params={"email": email},
        )
        assert response2.status_code == 400
        data = response2.json()
        assert "already signed up" in data["detail"].lower()

    def test_signup_nonexistent_activity_fails(self, client):
        """Test that signing up for a non-existent activity fails."""
        email = "test@example.com"
        activity = "NonExistent Activity"

        response = client.post(
            f"/activities/{activity}/signup",
            params={"email": email},
        )

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_signup_participant_added_to_list(self, client):
        """Test that a signed-up participant appears in the activities list."""
        email = "verify@example.com"
        activity = "Drama Club"

        # Signup
        client.post(f"/activities/{activity}/signup", params={"email": email})

        # Verify participant is in the list
        response = client.get("/activities")
        activities = response.json()
        assert email in activities[activity]["participants"]


class TestUnregisterEndpoint:
    """Test the DELETE /activities/{activity_name}/participants endpoint."""

    def test_unregister_existing_participant(self, client):
        """Test removing a participant from an activity."""
        email = "remove@example.com"
        activity = "Art Workshop"

        # Signup first
        client.post(f"/activities/{activity}/signup", params={"email": email})

        # Unregister
        response = client.delete(
            f"/activities/{activity}/participants",
            params={"email": email},
        )

        assert response.status_code == 200
        data = response.json()
        assert email in data["message"]
        assert activity in data["message"]

    def test_unregister_nonexistent_participant_fails(self, client):
        """Test that unregistering a non-existent participant fails."""
        email = "nonexistent@example.com"
        activity = "Science Club"

        response = client.delete(
            f"/activities/{activity}/participants",
            params={"email": email},
        )

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_unregister_nonexistent_activity_fails(self, client):
        """Test that unregistering from a non-existent activity fails."""
        email = "test@example.com"
        activity = "Fake Activity"

        response = client.delete(
            f"/activities/{activity}/participants",
            params={"email": email},
        )

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    def test_unregister_removes_participant_from_list(self, client):
        """Test that unregistered participant is removed from the activities list."""
        email = "remove_verify@example.com"
        activity = "Debate Team"

        # Signup
        client.post(f"/activities/{activity}/signup", params={"email": email})

        # Verify participant is in list
        response = client.get("/activities")
        activities = response.json()
        assert email in activities[activity]["participants"]

        # Unregister
        client.delete(
            f"/activities/{activity}/participants",
            params={"email": email},
        )

        # Verify participant is no longer in list
        response = client.get("/activities")
        activities = response.json()
        assert email not in activities[activity]["participants"]


class TestRootEndpoint:
    """Test the root / endpoint."""

    def test_root_redirects_to_static_index(self, client):
        """Test that / redirects to /static/index.html."""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert "/static/index.html" in response.headers["location"]
