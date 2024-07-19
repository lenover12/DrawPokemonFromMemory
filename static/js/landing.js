document.addEventListener("DOMContentLoaded", function () {
  // Handle form submissions
  document
    .getElementById("create_game_form")
    .addEventListener("submit", function (event) {
      let playerName = document.getElementById("player_name").value.trim();
      if (playerName === "") {
        alert("Please enter your name.");
        event.preventDefault();
      } else {
        let input = document.createElement("input");
        input.type = "hidden";
        input.name = "player_name";
        input.value = playerName;
        this.appendChild(input);
      }

      // Add a hidden input for profile picture URL or index
      let profilePictureURL = document
        .getElementById("profile_picture_url")
        .value.trim();
      let input = document.createElement("input");
      input.type = "hidden";
      input.name = "profile_picture_url";
      input.value = profilePictureURL;
      this.appendChild(input);
    });

  document
    .getElementById("join_game_form")
    .addEventListener("submit", function (event) {
      let playerName = document.getElementById("player_name").value.trim();
      if (playerName === "") {
        alert("Please enter your name.");
        event.preventDefault();
      } else {
        let input = document.createElement("input");
        input.type = "hidden";
        input.name = "player_name";
        input.value = playerName;
        this.appendChild(input);
      }

      // Add a hidden input for profile picture URL or index
      let profilePictureURL = document
        .getElementById("profile_picture_url")
        .value.trim();
      let input = document.createElement("input");
      input.type = "hidden";
      input.name = "profile_picture_url";
      input.value = profilePictureURL;
      this.appendChild(input);
    });
});
