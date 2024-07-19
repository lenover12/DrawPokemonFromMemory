document.addEventListener("DOMContentLoaded", function () {
  const pokemonIdInputs = JSON.parse(
    document.getElementById("pokemonIds").value
  );
  const round_count = parseInt(document.getElementById("round_count").value);
  const languageSelect = document.querySelector("#languageSelect"); // Ensure this selector is correct

  function loadPokemonName(round) {
    const pokemonNameDisplay = document.querySelector(
      `[data-pokemon-id="${round}"]`
    );
    const language = languageSelect.value;

    fetch(`../static/localisation/pokemon_names/${language}.json`)
      .then((response) => response.json())
      .then((data) => {
        pokemonNameDisplay.textContent = data[pokemonIdInputs[round - 1]];
      })
      .catch((error) => console.error("Error loading Pokemon name:", error));
  }

  // Load the rounds' Pokemon names on page load
  for (let round = 1; round <= round_count; round++) {
    loadPokemonName(round);
  }

  // Reload names on language change
  languageSelect.addEventListener("change", function () {
    for (let round = 1; round <= round_count; round++) {
      loadPokemonName(round);
    }
  });
});
