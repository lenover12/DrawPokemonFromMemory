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

  // Get the scale factor from CSS variable
  const root = getComputedStyle(document.documentElement);
  const scale = parseFloat(root.getPropertyValue("--scale"));

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

  canvas.addEventListener("mousedown", startPosition);
  canvas.addEventListener("mouseup", finishedPosition);
  canvas.addEventListener("mousemove", draw);
  colorInput.addEventListener("input", changeColor);
  saveBtn.addEventListener("click", saveCanvas);
  uploadBtn.addEventListener("click", uploadCanvas);

  function startPosition(e) {
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

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

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
    downloadLink.download = `${pokemonName}.png`;
    downloadLink.click();
  }

  function uploadCanvas() {
    const pokemonName = pokemonNameInput.value.trim();
    if (!pokemonName) {
      pokemonName = "~misingno";
    }

    canvas.toBlob(function (blob) {
      const formData = new FormData();
      formData.append("pokemonName", pokemonName);
      formData.append("canvasImage", blob, `${new Date().toISOString()}.png`);

      fetch("/upload", {
        method: "POST",
        body: formData,
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            alert(data.success);
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

  // Generate a random index on page load and store it in a variable
  const randomIndex = Math.floor(Math.random() * 1026);

  function loadPokemonName() {
    const language = languageSelect.value;

    fetch(`../static/lookup/${language}.json`)
      .then((response) => response.json())
      .then((data) => {
        pokemonNameDisplay.textContent = data[randomIndex];
      })
      .catch((error) => console.error("Error loading Pokemon name:", error));
  }

  languageSelect.addEventListener("change", loadPokemonName);

  // Load a random Pokemon name on page load
  loadPokemonName();
});
