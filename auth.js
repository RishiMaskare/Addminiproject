function getMainPagePath(fileName) {
  const normalizedPath = window.location.pathname.replace(/\\/g, "/");
  const isGuidelinesPage = normalizedPath.includes("/mini-project-guidelines/");
  return isGuidelinesPage ? `../${fileName}` : fileName;
}

const USER_STORAGE_KEY = "user";
const AUTH_SESSION_KEY = "authSession";
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000;
const HASH_ITERATIONS = 120000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function sanitizeUsername(username) {
  return String(username || "").replace(/[^a-zA-Z0-9 _-]/g, "").trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePasswordStrength(password) {
  if (password.length < 10) {
    return "Password must be at least 10 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must include at least one number.";
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return "Password must include at least one special character.";
  }
  return "";
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function safeParseJSON(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return null;
  }
}

function getStoredUser() {
  return safeParseJSON(localStorage.getItem(USER_STORAGE_KEY));
}

function storeUser(userRecord) {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userRecord));
}

async function derivePasswordHash(password, saltBytes, iterations) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBytes,
      iterations,
    },
    passwordKey,
    256
  );

  return bufferToBase64(bits);
}

async function hashPassword(password, existingSalt, existingIterations) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("Secure crypto APIs are unavailable in this browser.");
  }

  const iterations = existingIterations || HASH_ITERATIONS;
  let saltBytes;

  if (existingSalt) {
    saltBytes = base64ToBytes(existingSalt);
  } else {
    saltBytes = crypto.getRandomValues(new Uint8Array(16));
  }

  const hash = await derivePasswordHash(password, saltBytes, iterations);
  return {
    hash,
    salt: bufferToBase64(saltBytes),
    iterations,
  };
}

function createSession(userRecord) {
  const session = {
    username: userRecord.username,
    email: userRecord.email,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };
  sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}

function getSession() {
  const session = safeParseJSON(sessionStorage.getItem(AUTH_SESSION_KEY));

  if (!session || !session.expiresAt) {
    return null;
  }

  if (Date.now() > Number(session.expiresAt)) {
    clearSession();
    return null;
  }

  return session;
}

function hasActiveSession() {
  return Boolean(getSession());
}

async function verifyHashedPassword(password, userRecord) {
  if (!userRecord || !userRecord.passwordHash || !userRecord.salt) {
    return false;
  }

  const result = await hashPassword(
    password,
    userRecord.salt,
    Number(userRecord.iterations) || HASH_ITERATIONS
  );

  return result.hash === userRecord.passwordHash;
}

async function migrateLegacyUserIfNeeded(userRecord, passwordAttempt) {
  if (!userRecord || !userRecord.password || userRecord.passwordHash) {
    return userRecord;
  }

  if (userRecord.password !== passwordAttempt) {
    return null;
  }

  const hashed = await hashPassword(passwordAttempt);
  const migrated = {
    version: 2,
    username: userRecord.username,
    email: normalizeEmail(userRecord.email),
    passwordHash: hashed.hash,
    salt: hashed.salt,
    iterations: hashed.iterations,
    createdAt: userRecord.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  storeUser(migrated);
  return migrated;
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
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const usernameInput = document.getElementById("username").value;
    const emailInput = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const error = document.getElementById("signupError");

    error.textContent = "";

    const username = sanitizeUsername(usernameInput);
    const email = normalizeEmail(emailInput);

    if (!/^[a-zA-Z0-9 _-]{3,30}$/.test(username)) {
      error.textContent =
        "Username must be 3-30 characters and use only letters, numbers, spaces, underscore, or hyphen.";
      return;
    }

    if (!isValidEmail(email)) {
      error.textContent = "Please enter a valid email address.";
      return;
    }

    const passwordMessage = validatePasswordStrength(password);
    if (passwordMessage) {
      error.textContent = passwordMessage;
      return;
    }

    if (password !== confirmPassword) {
      error.textContent = "Passwords do not match!";
      return;
    }

    try {
      const hashed = await hashPassword(password);
      const user = {
        version: 2,
        username,
        email,
        passwordHash: hashed.hash,
        salt: hashed.salt,
        iterations: hashed.iterations,
        createdAt: new Date().toISOString(),
      };
      storeUser(user);
    } catch (_error) {
      error.textContent =
        "Unable to create account securely in this browser. Please try another browser.";
      return;
    }

    // if username already exists
    const userExists = users.some(user => user.email === email);

    if (userExists) {
      error.textContent = "User already exists!";
      return;
    }

    // new user
    const newUser = { username, email, password };
    users.push(newUser);
    localStorage.setItem("users", JSON.stringify(users));

    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("loggedInUser", username);
    window.location.href = getMainPagePath("index.html");
  });
}

/* Sign in */
const signinForm = document.getElementById("signinForm");

if (signinForm) {
  signinForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = normalizeEmail(document.getElementById("loginEmail").value);
    const password = document.getElementById("loginPassword").value;
    const error = document.getElementById("loginError");
    error.textContent = "";

    if (!isValidEmail(email)) {
      error.textContent = "Please enter a valid email address.";
      return;
    }

    const storedUser = getStoredUser();
    if (!storedUser) {
      error.textContent = "Invalid email or password";
      return;
    }

    try {
      const migratedUser = await migrateLegacyUserIfNeeded(storedUser, password);
      const userToVerify = migratedUser || storedUser;
      const isEmailMatch = normalizeEmail(userToVerify.email) === email;
      const isPasswordMatch = await verifyHashedPassword(password, userToVerify);

      if (isEmailMatch && isPasswordMatch) {
        createSession(userToVerify);
        window.location.href = getMainPagePath("index.html");
        return;
      }

      error.textContent = "Invalid email or password";
    } catch (_error) {
      error.textContent = "Login failed. Please try again.";
    }
  });
}

/* Session check */
function checkAuth() {
  if (!hasActiveSession()) {
    window.location.href = getMainPagePath("signin.html");
  }
}

/* Show username in navbar */
function showLoggedInUser() {
  const session = getSession();
  const userElement = document.getElementById("navUsername");

  if (userElement && session && session.username) {
    userElement.textContent = session.username;
  }
}

function redirectIfAuthenticated() {
  if (hasActiveSession()) {
    window.location.href = getMainPagePath("index.html");
  }
}

/* Logout */
function logout() {
  clearSession();
  window.location.href = getMainPagePath("signin.html");
}

// Remove outdated keys from older auth versions.
localStorage.removeItem("loggedIn");
localStorage.removeItem("loggedInUser");
