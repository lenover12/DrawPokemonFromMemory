document.addEventListener("DOMContentLoaded", function () {
  // Initialize Socket.IO and connect to your server
  const socket = io();

  const game_id = document.getElementById("game_id").value;

  // Join the game room
  socket.emit("join_room", { game_id });

  // Listen for room join confirmation
  socket.on("joined_room", function (data) {
    // Update player list
    fetch(`/get_players/{{ game.game_id }}`)
      .then((response) => response.json())
      .then((data) => {
        if (data.players) {
          const playerGrid = document.querySelector(".player-grid");
          playerGrid.innerHTML = ""; // Clear the current contents

          data.players.forEach((player, index) => {
            // Create the profile picture container div
            const profilePictureContainer = document.createElement("div");
            profilePictureContainer.className = "profile-picture-container";

            // Create the img element
            const img = document.createElement("img");
            img.id = `player-${index + 1}`;
            img.className = "profile-picture-small";
            img.src = player.profile_picture;
            img.alt = "Profile Picture";

            // Create the p element for the player name
            const playerName = document.createElement("p");
            playerName.className = "player-name-list";
            playerName.textContent = player.name;

            // Append img and p elements to the profile picture container div
            profilePictureContainer.appendChild(img);
            profilePictureContainer.appendChild(playerName);

            // Create the player grid item div
            const playerGridItem = document.createElement("div");
            playerGridItem.className = "player-grid-item";

            // Append the profile picture container to the player grid item
            playerGridItem.appendChild(profilePictureContainer);

            // Append the player grid item to the player grid
            playerGrid.appendChild(playerGridItem);
          });
        }
      });
  });

  // Listen for redirect event to review page
  socket.on("redirect_to_draw", function (data) {
    if (data.game_id === game_id) {
      window.location.href = `/draw/${game_id}`;
    }
  });

  // JavaScript functions to handle time limit adjustments
  window.increaseTime = function () {
    const timeDisplay = document.getElementById("time-display");
    const currentTime = parseTime(timeDisplay.textContent);
    const newTime = addTime(currentTime, 30);
    if (isValidTime(newTime)) {
      timeDisplay.textContent = formatTime(newTime);
      updateTimerInput(newTime);
    }
  };

  window.decreaseTime = function () {
    const timeDisplay = document.getElementById("time-display");
    const currentTime = parseTime(timeDisplay.textContent);
    const newTime = subtractTime(currentTime, 30);
    if (isValidTime(newTime)) {
      timeDisplay.textContent = formatTime(newTime);
      updateTimerInput(newTime);
    }
  };

  function updateTimerInput(time) {
    const timerInput = document.getElementById("timer");
    const totalSeconds = time.minutes * 60 + time.seconds;
    timerInput.value = totalSeconds;
  }

  function isValidTime(time) {
    const totalSeconds = time.minutes * 60 + time.seconds;
    return totalSeconds >= 30 && totalSeconds <= 720; // 30 seconds to 12 minutes (720 seconds)
  }

  function parseTime(timeString) {
    const [minutes, seconds] = timeString.split(":").map(Number);
    return { minutes, seconds };
  }

  function addTime(time, secondsToAdd) {
    let totalSeconds = time.minutes * 60 + time.seconds + secondsToAdd;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
  }

  function subtractTime(time, secondsToSubtract) {
    let totalSeconds = time.minutes * 60 + time.seconds - secondsToSubtract;
    if (totalSeconds < 0) {
      totalSeconds = 0;
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { minutes, seconds };
  }

  function formatTime(time) {
    const paddedSeconds = time.seconds.toString().padStart(2, "0");
    return `${time.minutes}:${paddedSeconds}`;
  }

  const images = document.querySelectorAll(".profile-picture-small");
  images.forEach((img) => {
    img.onerror = function () {
      this.style.visibility = "hidden";
    };
  });
});
