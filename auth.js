/*
   PASSWORD TOGGLE */
function togglePassword(id, icon) {
  const input = document.getElementById(id);

  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "🙈";
  } else {
    input.type = "password";
    icon.textContent = "👁";
  }
}


/*
   SIGN UP */
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", function(e){
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const error = document.getElementById("signupError");

    error.textContent = "";

    if(password !== confirmPassword){
      error.textContent = "Passwords do not match!";
      return;
    }

    const user = { username, email, password };

    // store registered user
    localStorage.setItem("user", JSON.stringify(user));

    window.location.href = "signin.html";
  });
}


/*
   SIGN IN */
const signinForm = document.getElementById("signinForm");

if (signinForm) {
  signinForm.addEventListener("submit", function(e){
    e.preventDefault();

    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    const error = document.getElementById("loginError");

    const storedUser = JSON.parse(localStorage.getItem("user"));

    if (
      storedUser &&
      storedUser.email === email &&
      storedUser.password === password
    ) {

      // create session
      localStorage.setItem("loggedIn","true");

      //  store logged-in username for navbar
      localStorage.setItem("loggedInUser", storedUser.username);

      window.location.href = "index.html";

    } else {
      error.textContent = "Invalid email or password";
    }
  });
}


/*
   SESSION CHECK */
function checkAuth(){
  if(!localStorage.getItem("loggedIn")){
    window.location.href = "signin.html";
  }
}


/*
   SHOW USER IN NAVBAR */
function showLoggedInUser(){
  const username = localStorage.getItem("loggedInUser");
  const userElement = document.getElementById("navUsername");

  if(userElement && username){
    userElement.textContent =  username;
  }
}


/*
   LOGOUT */
function logout(){
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("loggedInUser");
  window.location.href = "signin.html";
}