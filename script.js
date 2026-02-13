// Create butterfly cursor
const cursor = document.querySelector(".cursor");

document.addEventListener("mousemove", (e) => {
    // Move butterfly
    cursor.style.left = e.pageX + "px";
    cursor.style.top = e.pageY + "px";

    // Create sparkle
    const sparkle = document.createElement("div");
    sparkle.classList.add("sparkle");

    sparkle.style.left = e.pageX + "px";
    sparkle.style.top = e.pageY + "px";

    document.body.appendChild(sparkle);

    // Remove sparkle after animation
    setTimeout(() => {
        sparkle.remove();
    }, 800);
});


// Floating decorative butterflies
function createFloatingButterfly() {
    const floatButterfly = document.createElement("div");
    floatButterfly.innerHTML = "🦋";
    floatButterfly.style.position = "fixed";
    floatButterfly.style.left = Math.random() * window.innerWidth + "px";
    floatButterfly.style.bottom = "-30px";
    floatButterfly.style.fontSize = "20px";
    floatButterfly.style.opacity = "0.6";
    floatButterfly.style.animation = "floatUp 8s linear forwards";
    document.body.appendChild(floatButterfly);

    setTimeout(() => {
        floatButterfly.remove();
    }, 8000);
}

setInterval(createFloatingButterfly, 3000);

// Add float animation dynamically
const style = document.createElement("style");
style.innerHTML = `
@keyframes floatUp {
    from { transform: translateY(0); }
    to { transform: translateY(-110vh); }
}`;
document.head.appendChild(style);
