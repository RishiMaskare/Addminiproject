const FORMSPREE_URL = "<FORMSPREE_URL>";

const form = document.getElementById("contactForm");

if (form) {
  if (FORMSPREE_URL && !FORMSPREE_URL.includes("<")) {
    form.action = FORMSPREE_URL;
  } else {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      window.alert("Contact form endpoint is not configured yet.");
    });
  }
}
