document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build participants HTML with delete buttons
        const participantsList = (details.participants && details.participants.length)
          ? details.participants.map(p => `
              <li class="participant-item">
                <span class="participant-email">${p}</span>
                <button class="delete-participant" data-activity="${name}" data-email="${p}" title="Remove ${p}">✖</button>
              </li>
            `).join("")
          : `<li class="participant-item"><em>No participants yet</em></li>`;

        const participantsHTML = `
          <div class="participants">
            <strong>Participants</strong>
            <ul>
              ${participantsList}
            </ul>
          </div>
        `;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHTML}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Update a single activity card optimistically after signup
  function addParticipantToCard(activityName, email) {
    const cards = activitiesList.querySelectorAll('.activity-card');
    for (const card of cards) {
      const title = card.querySelector('h4') && card.querySelector('h4').textContent;
      if (title === activityName) {
        const ul = card.querySelector('.participants ul');
        // Remove placeholder "No participants yet" if present
        if (ul) {
          const placeholder = ul.querySelector('li em');
          if (placeholder) ul.innerHTML = '';

          const li = document.createElement('li');
          li.className = 'participant-item';
          li.innerHTML = `\n            <span class="participant-email">${email}</span>\n            <button class="delete-participant" data-activity="${activityName}" data-email="${email}" title="Remove ${email}">✖</button>\n          `;
          ul.appendChild(li);
        }

        // Update availability text (decrement spots)
        const pTags = card.querySelectorAll('p');
        for (const p of pTags) {
          if (p.innerHTML.includes('Availability:')) {
            const match = p.textContent.match(/(\d+) spots left/);
            if (match) {
              const newNum = Math.max(0, parseInt(match[1], 10) - 1);
              p.innerHTML = `<strong>Availability:</strong> ${newNum} spots left`;
            }
            break;
          }
        }

        break;
      }
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Optimistically update the card immediately, then refresh to sync
        addParticipantToCard(activity, email);
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Delegated click handler for delete buttons (attached once)
  activitiesList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.delete-participant');
    if (!btn) return;

    const activity = btn.dataset.activity;
    const email = btn.dataset.email;

    if (!activity || !email) return;

    if (!confirm(`Remove ${email} from ${activity}?`)) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE'
      });

      const result = await resp.json().catch(() => ({}));

      if (resp.ok) {
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || result.message || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), 5000);
      }
    } catch (err) {
      console.error('Error removing participant:', err);
      messageDiv.textContent = 'Failed to remove participant. Please try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
      setTimeout(() => messageDiv.classList.add('hidden'), 5000);
    }
  });
});
