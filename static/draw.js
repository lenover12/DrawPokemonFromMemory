document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const colorInput = document.getElementById("colour");
  const saveBtn = document.getElementById("saveBtn");
  const uploadBtn = document.getElementById("uploadBtn");
  const languageSelect = document.getElementById("language");
  const pokemonNameDisplay = document.getElementById("pokemonNameDisplay");
  const sliderRange = document.getElementById("myRange");
  const sliderValue = document.getElementById("sliderValue");
  const pokemonIdInput = document.getElementById("pokemonId");
  const gameIDInput = document.getElementById("game_id");
  const timerDisplay = document.getElementById("timer");

  // Initialize Socket.IO client
  const socket = io();

  // Join the game room
  const game_id = document.getElementById("game_id").value;
  socket.emit("join_room", { game_id });

  // Listen for room join confirmation
  socket.on("joined_room", function (data) {
    console.log(`Joined room: ${data.game_id}`);
  });

  // Listen for redirect event to review page
  socket.on("redirect_to_review", function (data) {
    if (data.game_id === game_id) {
      window.location.href = `/review/${game_id}`;
    }
  });

  // Function to get the scale factor from CSS variable
  function getScale() {
    const root = getComputedStyle(document.documentElement);
    return parseFloat(root.getPropertyValue("--scale"));
  }

  // Get the initial scale factor
  let scale = getScale();

  // Timer settings
  let timerSeconds = 60; // 1 minute timer
  let timerInterval;

  // Start timer function
  function startTimer() {
    timerInterval = setInterval(() => {
      timerSeconds--;
      if (timerSeconds < 0) {
        clearInterval(timerInterval);
        // Timer hits 0, trigger actions
        uploadCanvas();
        return;
      }
      updateTimerDisplay();
    }, 1000);
  }

  // Update timer display function
  function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    timerDisplay.textContent = `${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`;
  }

  // Display the default slider value
  sliderValue.textContent = sliderRange.value;

  // Update the current slider value (each time you drag the slider handle)
  sliderRange.addEventListener("input", function () {
    sliderValue.textContent = this.value;

    // Example: Update line width based on slider value
    lineWidth = this.value;
    updateLineWidth(lineWidth);
  });

  function updateLineWidth(width) {
    ctx.lineWidth = width;
  }

  // Drawing logic
  let painting = false;
  let lineWidth = 2;
  let lineCap = "round";
  let strokeStyle = "#000000";
  // Set solid white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  canvas.addEventListener("mousedown", startPosition);
  canvas.addEventListener("mouseup", finishedPosition);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("touchstart", startPosition);
  canvas.addEventListener("touchend", finishedPosition);
  canvas.addEventListener("touchmove", draw);
  colorInput.addEventListener("input", changeColor);
  saveBtn.addEventListener("click", saveCanvas);
  uploadBtn.addEventListener("click", uploadCanvas);

  function getEventPosition(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) / scale,
        y: (e.touches[0].clientY - rect.top) / scale,
      };
    } else {
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    }
  }

  function startPosition(e) {
    e.preventDefault();
    painting = true;
    draw(e);
  }

  function finishedPosition() {
    painting = false;
    ctx.beginPath();
  }

  function draw(e) {
    if (!painting) return;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = lineCap;
    ctx.strokeStyle = strokeStyle;

    const { x, y } = getEventPosition(e);

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function changeColor(e) {
    strokeStyle = e.target.value;
  }

  function saveCanvas() {
    let pokemonName = pokemonNameDisplay.textContent.trim();
    if (!pokemonName) {
      pokemonName = "pokemon_drawing";
    }
    const dataURL = canvas.toDataURL();
    const downloadLink = document.createElement("a");
    downloadLink.href = dataURL;
    downloadLink.download = `${pokemonName}_drawing.png`;
    downloadLink.click();
  }

  function uploadCanvas() {
    const pokemonName = pokemonNameDisplay.textContent.trim();
    if (!pokemonName) {
      pokemonName = "~misingno";
    }

    //get the game id from the hidden input field
    const game_id = gameIDInput.value;

    canvas.toBlob(function (blob) {
      const formData = new FormData();
      formData.append("pokemonName", pokemonName);
      formData.append("canvasImage", blob, `${new Date().toISOString()}.png`);
      formData.append("game_id", game_id);

      fetch("/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            // alert(data.success);
            // Disable the uploadBtn button
            uploadBtn.disabled = true;

            // Check if all players have uploaded their images
            fetch(`/get_players/${game_id}`)
              .then((response) => response.json())
              .then((data) => {
                const players = data.players;
                const allUploaded = players.every(
                  (player) => player.image_url !== null
                );

                if (allUploaded) {
                  window.location.href = `/review/${game_id}`;
                }
              })
              .catch((error) =>
                console.error("Error checking players:", error)
              );
          } else {
            alert(data.error || "Failed to upload image.");
          }
        })
        .catch((error) => {
          console.error("Error uploading image:", error);
          alert("Failed to upload image.");
        });
    }, "image/png");
  }

  // Get pokemon_id from hidden input field
  const pokemonId = pokemonIdInput.value;

  function loadPokemonName() {
    const language = languageSelect.value;

    fetch(`../static/lookup/${language}.json`)
      .then((response) => response.json())
      .then((data) => {
        pokemonNameDisplay.textContent = data[pokemonId];
      })
      .catch((error) => console.error("Error loading Pokemon name:", error));
  }

  languageSelect.addEventListener("change", loadPokemonName);

  // Load the random Pokemon name on page load
  loadPokemonName();

  // Start the timer on page load
  startTimer();

  // Use ResizeObserver to update scale dynamically based on screen size
  const resizeObserver = new ResizeObserver(() => {
    scale = getScale();
  });

  // Observe changes to the body element (or any other element you want to watch)
  resizeObserver.observe(document.body);
});
