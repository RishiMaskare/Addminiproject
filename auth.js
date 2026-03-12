function getMainPagePath(fileName) {
  const normalizedPath = window.location.pathname.replace(/\\/g, "/");
  const isGuidelinesPage = normalizedPath.includes("/mini-project-guidelines/");
  return isGuidelinesPage ? `../${fileName}` : fileName;
}

/* Password toggle */
function togglePassword(id, icon) {
  const input = document.getElementById(id);

  if (!input || !icon) {
    return;
  }

  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "\u{1F648}";
  } else {
    input.type = "password";
    icon.textContent = "\u{1F441}";
  }
}

/* Sign up */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const error = document.getElementById("signupError");

    error.textContent = "";

    if (password !== confirmPassword) {
      error.textContent = "Passwords do not match!";
      return;
    }

    const user = { username, email, password };
    localStorage.setItem("user", JSON.stringify(user));

    window.location.href = getMainPagePath("signin.html");
  });
}

/* Sign in */
const signinForm = document.getElementById("signinForm");

if (signinForm) {
  signinForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const error = document.getElementById("loginError");
    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (
      storedUser &&
      storedUser.email === email &&
      storedUser.password === password
    ) {
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("loggedInUser", storedUser.username);
      window.location.href = getMainPagePath("index.html");
    } else {
      error.textContent = "Invalid email or password";
    }
  });
}

/* Session check */
function checkAuth() {
  if (!localStorage.getItem("loggedIn")) {
    window.location.href = getMainPagePath("signin.html");
  }
}

/* Show username in navbar */
function showLoggedInUser() {
  const username = localStorage.getItem("loggedInUser");
  const userElement = document.getElementById("navUsername");

  if (userElement && username) {
    userElement.textContent = username;
  }
}

/* Logout */
function logout() {
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("loggedInUser");
  window.location.href = getMainPagePath("signin.html");
}