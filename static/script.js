document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const colorInput = document.getElementById("colour");
  const saveBtn = document.getElementById("saveBtn");
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
    const dataURL = canvas.toDataURL();
    const downloadLink = document.createElement("a");
    downloadLink.href = dataURL;
    downloadLink.download = "canvas_image.png";
    downloadLink.click();
  }
});
