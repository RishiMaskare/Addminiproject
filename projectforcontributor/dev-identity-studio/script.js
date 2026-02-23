(function initDevIdentityStudio() {
  "use strict";

  const THEME_STORAGE_KEY = "dev_identity_theme";
  const CARD_PALETTE_STORAGE_KEY = "dev_identity_palette";

  const PALETTES = [
    { a: "#ff8aa6", b: "#8f97ff", c: "#63d9d4" },
    { a: "#ff9b86", b: "#7ca4ff", c: "#86e0bf" },
    { a: "#fca5d5", b: "#96a8ff", c: "#7de3f0" },
    { a: "#ff84c6", b: "#9db2ff", c: "#8adcb0" },
    { a: "#ff9fac", b: "#7dcfff", c: "#b9e36e" },
  ];

  const elements = {
    body: document.body,
    canvas: document.getElementById("particles"),
    form: document.getElementById("identityForm"),
    nameInput: document.getElementById("nameInput"),
    roleInput: document.getElementById("roleInput"),
    skillsInput: document.getElementById("skillsInput"),
    githubInput: document.getElementById("githubInput"),
    linkedinInput: document.getElementById("linkedinInput"),
    imageUpload: document.getElementById("imageUpload"),
    themeToggle: document.getElementById("themeToggle"),
    fetchGithubBtn: document.getElementById("fetchGithubBtn"),
    clearImageBtn: document.getElementById("clearImageBtn"),
    copyBtn: document.getElementById("copyBtn"),
    randomizeBtn: document.getElementById("randomizeBtn"),
    downloadBtn: document.getElementById("downloadBtn"),
    statusMessage: document.getElementById("statusMessage"),
    card: document.getElementById("card"),
    avatar: document.getElementById("avatar"),
    cardName: document.getElementById("cardName"),
    cardRole: document.getElementById("cardRole"),
    cardSkills: document.getElementById("cardSkills"),
    cardGithub: document.getElementById("cardGithub"),
    cardLinkedin: document.getElementById("cardLinkedin"),
    cardBadge: document.getElementById("cardBadge"),
    cardStamp: document.getElementById("cardStamp"),
    footerYear: document.getElementById("footerYear"),
  };

  const state = {
    customAvatarDataUrl: "",
    githubAvatarDataUrl: "",
    githubAvatarUrl: "",
    githubFetchId: 0,
    particleFill: "rgba(255, 175, 206, 0.55)",
    particleLineRgb: "128, 173, 255",
    isDownloading: false,
  };

  initTheme();
  initPalette();
  initParticles();
  initTilt();
  renderFooterYear();
  bindEvents();
  renderCard();
  maybeFetchGithubAvatar({ silent: true });

  function bindEvents() {
    elements.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      renderCard();
      await maybeFetchGithubAvatar({ silent: true });
      setStatus("Identity card generated.", "success");
      resetFormForNextUser();
    });

    [elements.nameInput, elements.roleInput, elements.skillsInput, elements.githubInput, elements.linkedinInput].forEach((input) => {
      input.addEventListener("input", () => {
        renderCard();
      });
    });

    elements.githubInput.addEventListener("blur", async () => {
      renderCard();
      await maybeFetchGithubAvatar({ silent: true });
    });

    elements.imageUpload.addEventListener("change", handleImageUpload);
    elements.themeToggle.addEventListener("click", handleThemeToggle);
    elements.fetchGithubBtn.addEventListener("click", handleGithubFetchClick);
    elements.clearImageBtn.addEventListener("click", handleClearImageClick);
    elements.copyBtn.addEventListener("click", copyCardInfo);
    elements.randomizeBtn.addEventListener("click", randomizePalette);
    elements.downloadBtn.addEventListener("click", downloadCard);

    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        downloadCard();
      }
    });
  }

  function renderCard() {
    const name = safeText(elements.nameInput.value, "Developer");
    const role = safeText(elements.roleInput.value, "Software Developer");

    elements.cardName.textContent = name;
    elements.cardRole.textContent = role;
    renderSkills();
    renderBadge(role);
    renderStamp();

    const username = normalizeGithubUsername(elements.githubInput.value);
    if (username) {
      elements.cardGithub.href = `https://github.com/${username}`;
      elements.cardGithub.textContent = `GitHub | @${username}`;
    } else {
      elements.cardGithub.href = "#";
      elements.cardGithub.textContent = "GitHub | username";
    }

    const linkedinUrl = normalizeLinkedinProfile(elements.linkedinInput.value);
    if (linkedinUrl) {
      elements.cardLinkedin.href = linkedinUrl;
      const linkedinSlug = extractLinkedinSlugFromUrl(linkedinUrl);
      elements.cardLinkedin.textContent = linkedinSlug ? `LinkedIn | in/${linkedinSlug}` : "LinkedIn | profile";
    } else {
      elements.cardLinkedin.href = "#";
      elements.cardLinkedin.textContent = "LinkedIn | username";
    }

    updateAvatarPreview();
  }

  function renderSkills() {
    const rawSkills = elements.skillsInput.value.trim();
    const skills = rawSkills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
      .slice(0, 8);

    elements.cardSkills.innerHTML = "";
    if (!skills.length) {
      const chip = document.createElement("span");
      chip.className = "skill-chip";
      chip.textContent = "Skills";
      elements.cardSkills.appendChild(chip);
      return;
    }

    skills.forEach((skill) => {
      const chip = document.createElement("span");
      chip.className = "skill-chip";
      chip.textContent = skill;
      elements.cardSkills.appendChild(chip);
    });
  }

  function renderBadge(role) {
    const lowercase = role.toLowerCase();
    let label = "Developer Professional";
    if (lowercase.includes("frontend")) {
      label = "Frontend Specialist";
    } else if (lowercase.includes("backend")) {
      label = "Backend Specialist";
    } else if (lowercase.includes("full")) {
      label = "Full Stack Specialist";
    } else if (lowercase.includes("ui") || lowercase.includes("ux")) {
      label = "Design-Minded Builder";
    } else if (lowercase.includes("mobile")) {
      label = "Mobile App Developer";
    } else if (lowercase.includes("devops")) {
      label = "DevOps Engineer";
    } else if (lowercase.includes("data")) {
      label = "Data Specialist";
    }
    elements.cardBadge.textContent = label;
  }

  function renderStamp() {
    const date = new Date();
    const stamp = date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
    elements.cardStamp.textContent = stamp;
  }

  function renderFooterYear() {
    if (elements.footerYear) {
      elements.footerYear.textContent = String(new Date().getFullYear());
    }
  }

  async function handleGithubFetchClick() {
    renderCard();
    const fetched = await maybeFetchGithubAvatar({ silent: false, force: true });
    if (fetched) {
      setStatus("Fetched avatar from GitHub.", "success");
    }
  }

  async function handleClearImageClick() {
    if (!state.customAvatarDataUrl) {
      setStatus("No uploaded image to clear.", "error");
      return;
    }

    state.customAvatarDataUrl = "";
    elements.imageUpload.value = "";
    await maybeFetchGithubAvatar({ silent: true, force: true });
    updateAvatarPreview();
    setStatus("Uploaded image cleared.", "success");
  }

  function resetFormForNextUser() {
    elements.form.reset();
    elements.imageUpload.value = "";
    state.customAvatarDataUrl = "";
    state.githubAvatarDataUrl = "";
    state.githubAvatarUrl = "";
  }

  async function handleImageUpload() {
    const [file] = elements.imageUpload.files || [];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus("Please upload a valid image file.", "error");
      elements.imageUpload.value = "";
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setStatus("Image is too large. Maximum size is 5 MB.", "error");
      elements.imageUpload.value = "";
      return;
    }

    const dataUrl = await fileToDataUrl(file).catch(() => "");
    if (!dataUrl) {
      setStatus("Could not read the uploaded image.", "error");
      return;
    }

    state.customAvatarDataUrl = dataUrl;
    updateAvatarPreview();
    setStatus("Custom avatar uploaded.", "success");
  }

  async function maybeFetchGithubAvatar(options) {
    const { silent = false, force = false } = options || {};
    const username = normalizeGithubUsername(elements.githubInput.value);

    if (!username) {
      state.githubAvatarDataUrl = "";
      state.githubAvatarUrl = "";
      if (!silent && elements.githubInput.value.trim()) {
        setStatus("GitHub value is invalid. Use username or github.com URL.", "error");
      }
      if (!state.customAvatarDataUrl || force) {
        updateAvatarPreview();
      }
      return false;
    }

    if (state.customAvatarDataUrl && !force) {
      return true;
    }

    const fetchId = ++state.githubFetchId;
    try {
      const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: {
          Accept: "application/vnd.github+json",
        },
      });
      if (!response.ok) {
        throw new Error(`GitHub request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (fetchId !== state.githubFetchId) {
        return true;
      }

      const avatarUrl = typeof data.avatar_url === "string" ? data.avatar_url : "";
      const avatarDataUrl = avatarUrl ? await remoteImageToDataUrl(avatarUrl).catch(() => "") : "";
      if (fetchId !== state.githubFetchId) {
        return true;
      }

      state.githubAvatarDataUrl = avatarDataUrl;
      state.githubAvatarUrl = avatarUrl;
      updateAvatarPreview();
      return !!avatarUrl;
    } catch {
      state.githubAvatarDataUrl = "";
      state.githubAvatarUrl = "";
      updateAvatarPreview();
      if (!silent) {
        setStatus("Could not fetch GitHub avatar right now.", "error");
      }
      return false;
    }
  }

  function normalizeGithubUsername(rawValue) {
    if (!rawValue) {
      return "";
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.startsWith("@")) {
      return validateGithubUsername(trimmed.slice(1));
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const url = new URL(trimmed);
        if (!/^(www\.)?github\.com$/i.test(url.hostname)) {
          return "";
        }

        const pathParts = url.pathname.split("/").filter(Boolean);
        return validateGithubUsername(pathParts[0] || "");
      } catch {
        return "";
      }
    }

    return validateGithubUsername(trimmed);
  }

  function normalizeLinkedinProfile(rawValue) {
    if (!rawValue) {
      return "";
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return "";
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const url = new URL(trimmed);
        if (!/^(www\.)?linkedin\.com$/i.test(url.hostname)) {
          return "";
        }

        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2 && pathParts[0].toLowerCase() === "in") {
          const slug = sanitizeLinkedinSlug(pathParts[1]);
          return slug ? `https://www.linkedin.com/in/${slug}/` : "";
        }
        return "";
      } catch {
        return "";
      }
    }

    const slug = sanitizeLinkedinSlug(trimmed.replace(/^@/, ""));
    return slug ? `https://www.linkedin.com/in/${slug}/` : "";
  }

  function sanitizeLinkedinSlug(value) {
    const slug = value.trim().replace(/^\/+|\/+$/g, "");
    if (!slug) {
      return "";
    }

    return /^[a-z0-9][a-z0-9\-]{2,100}$/i.test(slug) ? slug : "";
  }

  function extractLinkedinSlugFromUrl(urlValue) {
    try {
      const url = new URL(urlValue);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length >= 2 && parts[0].toLowerCase() === "in") {
        return sanitizeLinkedinSlug(parts[1]);
      }
      return "";
    } catch {
      return "";
    }
  }

  function validateGithubUsername(value) {
    const username = value.trim().replace(/\/+$/, "");
    const isValid = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username);
    return isValid ? username : "";
  }

  function updateAvatarPreview() {
    const fallbackLetter = safeText(elements.nameInput.value, "D").charAt(0).toUpperCase();
    if (state.customAvatarDataUrl) {
      setAvatarImage(state.customAvatarDataUrl, "Uploaded profile", false, fallbackLetter);
      return;
    }

    if (state.githubAvatarDataUrl) {
      setAvatarImage(state.githubAvatarDataUrl, "GitHub profile", false, fallbackLetter);
      return;
    }

    if (state.githubAvatarUrl) {
      setAvatarImage(state.githubAvatarUrl, "GitHub profile", true, fallbackLetter);
      return;
    }

    elements.avatar.textContent = fallbackLetter;
  }

  function setAvatarImage(src, alt, isRemote, fallbackLetter) {
    const img = document.createElement("img");
    img.alt = alt;
    img.src = src;
    if (isRemote) {
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
    }
    img.addEventListener("error", () => {
      elements.avatar.textContent = fallbackLetter;
    });
    elements.avatar.replaceChildren(img);
  }

  async function copyCardInfo() {
    const githubHref = elements.cardGithub.getAttribute("href");
    const linkedinHref = elements.cardLinkedin.getAttribute("href");
    const skillText = Array.from(elements.cardSkills.querySelectorAll(".skill-chip"))
      .map((chip) => chip.textContent)
      .join(", ");

    const text = [
      `Name: ${elements.cardName.textContent}`,
      `Role: ${elements.cardRole.textContent}`,
      `Skills: ${skillText}`,
      `GitHub: ${githubHref === "#" ? "N/A" : elements.cardGithub.href}`,
      `LinkedIn: ${linkedinHref === "#" ? "N/A" : elements.cardLinkedin.href}`,
    ].join("\n");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }

      setStatus("Card details copied to clipboard.", "success");
    } catch {
      setStatus("Copy failed. Please copy manually.", "error");
    }
  }

  async function downloadCard() {
    if (state.isDownloading) {
      return;
    }

    setDownloadBusy(true);
    const previousTransform = elements.card.style.transform;
    try {
      setStatus("Preparing card download...", "success");
      elements.card.style.transform = "rotateX(0deg) rotateY(0deg)";
      await nextAnimationFrame();

      const fileName = `${safeText(elements.cardName.textContent, "developer")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "developer"}-identity-card.png`;

      let primaryError = null;
      let canvas = null;
      try {
        canvas = await captureCardCanvas();
        if (!canvasHasVisiblePixels(canvas)) {
          canvas = await createProgrammaticCardCanvas();
        }
        await saveCanvasAsPng(canvas, fileName);
      } catch (error) {
        primaryError = error;
      }

      if (primaryError) {
        const fallbackCanvas = await createProgrammaticCardCanvas();
        await saveCanvasAsPng(fallbackCanvas, fileName);
      }

      setStatus("Card downloaded successfully.", "success");
    } catch {
      setStatus("Download failed in this browser. Please try another browser.", "error");
    } finally {
      elements.card.style.transform = previousTransform;
      setDownloadBusy(false);
    }
  }

  async function captureCardCanvas() {
    await waitForFonts(1200);
    const hasHtml2Canvas = await ensureHtml2CanvasAvailable();

    if (hasHtml2Canvas) {
      try {
        return await window.html2canvas(elements.card, {
          backgroundColor: null,
          scale: Math.max(2, window.devicePixelRatio || 1),
          useCORS: true,
          allowTaint: false,
          imageTimeout: 12000,
          logging: false,
          foreignObjectRendering: true,
          removeContainer: true,
          onclone: (doc) => {
            const clonedCard = doc.getElementById("card");
            if (!clonedCard) {
              return;
            }
            clonedCard.style.transform = "none";
          },
        });
      } catch {}
    }

    try {
      return await captureCardWithSvgFallback(elements.card);
    } catch {}

    return createProgrammaticCardCanvas();
  }

  async function ensureHtml2CanvasAvailable() {
    if (typeof window.html2canvas === "function") {
      return true;
    }

    const sources = [
      "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
      "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js",
    ];

    for (const src of sources) {
      try {
        await loadScript(src, 7000);
      } catch {}
      if (typeof window.html2canvas === "function") {
        return true;
      }
    }

    return false;
  }

  function captureCardWithSvgFallback(cardElement) {
    return new Promise((resolve, reject) => {
      try {
        const rect = cardElement.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const clone = cardElement.cloneNode(true);
        inlineComputedStyles(cardElement, clone);
        sanitizeCloneForCapture(clone);
        clone.style.width = `${width}px`;
        clone.style.height = `${height}px`;
        clone.style.margin = "0";

        const wrapper = document.createElement("div");
        wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        wrapper.style.width = `${width}px`;
        wrapper.style.height = `${height}px`;
        wrapper.style.overflow = "hidden";
        wrapper.style.margin = "0";
        wrapper.style.padding = "0";
        wrapper.appendChild(clone);

        const serialized = new XMLSerializer().serializeToString(wrapper);
        const svg = [
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
          `<foreignObject x="0" y="0" width="100%" height="100%">`,
          serialized,
          "</foreignObject>",
          "</svg>",
        ].join("");

        const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const image = new Image();

        image.onload = () => {
          const scale = Math.max(2, window.devicePixelRatio || 1);
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);

          const context = canvas.getContext("2d");
          if (!context) {
            URL.revokeObjectURL(url);
            reject(new Error("Canvas context unavailable"));
            return;
          }

          context.scale(scale, scale);
          context.drawImage(image, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve(canvas);
        };

        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("SVG fallback failed"));
        };

        image.src = url;
      } catch (error) {
        reject(error);
      }
    });
  }

  function sanitizeCloneForCapture(clone) {
    clone.style.transform = "none";
    clone.style.animation = "none";
    clone.querySelectorAll("*").forEach((node) => {
      node.style.animation = "none";
      node.style.transition = "none";
    });

    const avatarImage = clone.querySelector(".avatar img");
    if (avatarImage && !avatarImage.src.startsWith("data:")) {
      const avatarRoot = clone.querySelector(".avatar");
      if (avatarRoot) {
        const fallbackLetter = safeText(elements.cardName.textContent, "D").charAt(0).toUpperCase();
        avatarRoot.textContent = fallbackLetter;
      }
    }
  }

  function inlineComputedStyles(sourceNode, targetNode) {
    if (!(sourceNode instanceof Element) || !(targetNode instanceof Element)) {
      return;
    }

    const computed = window.getComputedStyle(sourceNode);
    for (const property of computed) {
      targetNode.style.setProperty(
        property,
        computed.getPropertyValue(property),
        computed.getPropertyPriority(property),
      );
    }
    clonePseudoElement(sourceNode, targetNode, "::before");
    clonePseudoElement(sourceNode, targetNode, "::after");

    const sourceChildren = Array.from(sourceNode.children);
    const targetChildren = Array.from(targetNode.children);
    for (let index = 0; index < sourceChildren.length; index += 1) {
      inlineComputedStyles(sourceChildren[index], targetChildren[index]);
    }
  }

  function clonePseudoElement(sourceNode, targetNode, pseudo) {
    const pseudoComputed = window.getComputedStyle(sourceNode, pseudo);
    const content = pseudoComputed.getPropertyValue("content");
    if (!content || content === "none") {
      return;
    }

    const pseudoNode = document.createElement("span");
    pseudoNode.setAttribute("aria-hidden", "true");
    pseudoNode.style.pointerEvents = "none";
    for (const property of pseudoComputed) {
      pseudoNode.style.setProperty(
        property,
        pseudoComputed.getPropertyValue(property),
        pseudoComputed.getPropertyPriority(property),
      );
    }

    const normalized = content
      .replace(/^"(.*)"$/, "$1")
      .replace(/^'(.*)'$/, "$1")
      .replace(/\\A/g, "\n");
    if (normalized) {
      pseudoNode.textContent = normalized;
    }

    if (pseudo === "::before") {
      targetNode.insertBefore(pseudoNode, targetNode.firstChild);
    } else {
      targetNode.appendChild(pseudoNode);
    }
  }

  async function saveCanvasAsPng(canvas, fileName) {
    const blob = await canvasToBlobSafe(canvas).catch(() => null);

    if (blob && blob.size > 0) {
      const url = URL.createObjectURL(blob);
      triggerAnchorDownload(url, fileName);
      setTimeout(() => URL.revokeObjectURL(url), 1200);
      return;
    }

    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl || dataUrl.length < 120) {
      throw new Error("Empty export payload");
    }
    triggerAnchorDownload(dataUrl, fileName);
  }

  function canvasToBlobSafe(canvas) {
    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob !== "function") {
        reject(new Error("toBlob not available"));
        return;
      }

      try {
        canvas.toBlob((result) => {
          if (!result) {
            reject(new Error("PNG conversion failed"));
            return;
          }
          resolve(result);
        }, "image/png");
      } catch (error) {
        reject(error);
      }
    });
  }

  function triggerAnchorDownload(url, fileName) {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = url;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);

    try {
      link.click();
    } catch {
      link.dispatchEvent(
        new MouseEvent("click", {
          view: window,
          bubbles: true,
          cancelable: true,
        }),
      );
    }

    link.remove();
  }

  function canvasHasVisiblePixels(canvas) {
    if (!canvas || canvas.width < 2 || canvas.height < 2) {
      return false;
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return false;
    }

    const checks = 16;
    const stepX = Math.max(1, Math.floor(canvas.width / checks));
    const stepY = Math.max(1, Math.floor(canvas.height / checks));

    try {
      for (let y = 0; y < canvas.height; y += stepY) {
        for (let x = 0; x < canvas.width; x += stepX) {
          const pixel = context.getImageData(x, y, 1, 1).data;
          if (pixel[3] > 6) {
            return true;
          }
        }
      }
      return false;
    } catch {
      return true;
    }
  }

  function setDownloadBusy(isBusy) {
    state.isDownloading = isBusy;
    elements.downloadBtn.disabled = isBusy;
    elements.downloadBtn.textContent = isBusy ? "Preparing..." : "Download Card";
  }

  function handleThemeToggle() {
    const nextTheme = elements.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(nextTheme);
    setStatus(nextTheme === "dark" ? "Dark mode enabled." : "Light mode enabled.", "success");
  }

  function initTheme() {
    let savedTheme = "";
    try {
      savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "";
    } catch {
      savedTheme = "";
    }

    if (savedTheme === "light" || savedTheme === "dark") {
      applyTheme(savedTheme, { save: false });
      return;
    }

    applyTheme("light", { save: false });
  }

  function applyTheme(theme, options) {
    const { save = true } = options || {};
    const isDark = theme === "dark";
    elements.body.classList.toggle("dark", isDark);
    elements.themeToggle.textContent = isDark ? "Switch to Light" : "Switch to Dark";

    state.particleFill = isDark ? "rgba(128, 214, 255, 0.53)" : "rgba(255, 173, 203, 0.52)";
    state.particleLineRgb = isDark ? "170, 188, 255" : "137, 177, 255";

    if (save) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {}
    }
  }

  function initPalette() {
    const fallbackPalette = PALETTES[0];
    let storedPalette = null;
    try {
      const raw = localStorage.getItem(CARD_PALETTE_STORAGE_KEY);
      storedPalette = raw ? JSON.parse(raw) : null;
    } catch {
      storedPalette = null;
    }

    if (
      storedPalette &&
      typeof storedPalette.a === "string" &&
      typeof storedPalette.b === "string" &&
      typeof storedPalette.c === "string"
    ) {
      applyPalette(storedPalette, false);
      return;
    }

    applyPalette(fallbackPalette, false);
  }

  function randomizePalette() {
    const randomPalette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    applyPalette(randomPalette, true);
    setStatus("Card style randomized.", "success");
  }

  function applyPalette(palette, save) {
    elements.card.style.setProperty("--card-a", palette.a);
    elements.card.style.setProperty("--card-b", palette.b);
    elements.card.style.setProperty("--card-c", palette.c);

    if (save) {
      try {
        localStorage.setItem(CARD_PALETTE_STORAGE_KEY, JSON.stringify(palette));
      } catch {}
    }
  }

  function initTilt() {
    const finePointerQuery = window.matchMedia("(pointer: fine)");
    if (!finePointerQuery.matches) {
      return;
    }

    const maxTilt = 8;
    elements.card.addEventListener("mousemove", (event) => {
      const rect = elements.card.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width;
      const relativeY = (event.clientY - rect.top) / rect.height;
      const rotateY = (relativeX - 0.5) * maxTilt * 2;
      const rotateX = (0.5 - relativeY) * maxTilt * 2;

      elements.card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
    });

    elements.card.addEventListener("mouseleave", () => {
      elements.card.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
  }

  function initParticles() {
    const canvas = elements.canvas;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = [];

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      seedParticles();
    }

    function seedParticles() {
      particles.length = 0;
      const density = Math.max(24, Math.floor((canvas.width * canvas.height) / 28000));
      for (let index = 0; index < density; index += 1) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55,
          radius: Math.random() * 1.7 + 0.9,
        });
      }
    }

    function draw() {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = state.particleFill;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        if (!reduceMotion) {
          particle.x += particle.vx;
          particle.y += particle.vy;
        }

        if (particle.x < -4) particle.x = canvas.width + 4;
        if (particle.x > canvas.width + 4) particle.x = -4;
        if (particle.y < -4) particle.y = canvas.height + 4;
        if (particle.y > canvas.height + 4) particle.y = -4;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fill();

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 95) {
            context.strokeStyle = `rgba(${state.particleLineRgb}, ${(1 - distance / 95) * 0.25})`;
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(particle.x, particle.y);
            context.lineTo(other.x, other.y);
            context.stroke();
          }
        }
      }

      window.requestAnimationFrame(draw);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    draw();
  }

  function setStatus(message, type) {
    elements.statusMessage.textContent = message || "";
    elements.statusMessage.classList.remove("success", "error");
    if (type === "success" || type === "error") {
      elements.statusMessage.classList.add(type);
    }
  }

  function safeText(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function remoteImageToDataUrl(url) {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      throw new Error("Image request failed");
    }

    const blob = await response.blob();
    return fileToDataUrl(blob);
  }

  function loadScript(src, timeoutMs) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error("Script load timed out"));
      }, timeoutMs);

      script.src = src;
      script.async = true;
      script.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error("Script load failed"));
      };
      document.head.appendChild(script);
    });
  }

  function nextAnimationFrame() {
    return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  async function createProgrammaticCardCanvas() {
    await waitForFonts(1000);

    const isDark = elements.body.classList.contains("dark");
    const width = 1200;
    const height = 760;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context unavailable");
    }

    const colorA = getCssVar(elements.card, "--card-a") || "#ff8aa6";
    const colorB = getCssVar(elements.card, "--card-b") || "#8f97ff";
    const colorC = getCssVar(elements.card, "--card-c") || "#63d9d4";
    const textColor = isDark ? "#f0f4ff" : "#24314c";
    const softText = isDark ? "#bcc7e2" : "#6f7994";
    const pillTextColor = isDark ? "#eef3ff" : "#2a3552";
    const bgBaseA = isDark ? "#131b31" : "#fff7fb";
    const bgBaseB = isDark ? "#1a1330" : "#edf3ff";
    const panelA = isDark ? "rgba(22, 34, 62, 0.94)" : "rgba(255,255,255,0.95)";
    const panelB = isDark ? "rgba(17, 24, 46, 0.86)" : "rgba(247,250,255,0.92)";

    const bgGradient = context.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, bgBaseA);
    bgGradient.addColorStop(1, bgBaseB);
    context.fillStyle = bgGradient;
    roundedRect(context, 18, 18, width - 36, height - 36, 42);
    context.fill();

    context.shadowColor = isDark ? "rgba(0,0,0,0.45)" : "rgba(70, 56, 126, 0.18)";
    context.shadowBlur = 34;
    context.shadowOffsetY = 16;
    context.fillStyle = "rgba(0,0,0,0.1)";
    roundedRect(context, 32, 32, width - 64, height - 64, 36);
    context.fill();
    context.shadowColor = "transparent";
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;

    const panelGradient = context.createLinearGradient(40, 40, width - 40, height - 40);
    panelGradient.addColorStop(0, panelA);
    panelGradient.addColorStop(1, panelB);
    context.fillStyle = panelGradient;
    roundedRect(context, 32, 32, width - 64, height - 64, 36);
    context.fill();

    const accentGradient = context.createLinearGradient(0, 0, width, 0);
    accentGradient.addColorStop(0, hexToRgba(colorA, isDark ? 0.2 : 0.18));
    accentGradient.addColorStop(1, hexToRgba(colorB, isDark ? 0.23 : 0.2));
    context.fillStyle = accentGradient;
    roundedRect(context, 28, 28, width - 56, height - 56, 38);
    context.fill();

    context.strokeStyle = hexToRgba("#ffffff", isDark ? 0.2 : 0.62);
    context.lineWidth = 2;
    roundedRect(context, 28, 28, width - 56, height - 56, 38);
    context.stroke();

    context.fillStyle = hexToRgba(colorB, isDark ? 0.24 : 0.18);
    context.beginPath();
    context.arc(width - 80, 95, 130, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = hexToRgba(colorA, isDark ? 0.24 : 0.18);
    context.beginPath();
    context.arc(75, height - 75, 112, 0, Math.PI * 2);
    context.fill();

    await drawAvatarToCanvas(context, 74, 74, 180, {
      ring: colorC,
      bgA: isDark ? "#273a64" : "#d8e8ff",
      bgB: isDark ? "#1b2543" : "#f7f2ff",
      text: textColor,
    });

    const name = safeText(elements.cardName.textContent, "Developer");
    const role = safeText(elements.cardRole.textContent, "Software Developer");
    const githubText = safeText(elements.cardGithub.textContent, "GitHub | username");
    const linkedinText = safeText(elements.cardLinkedin.textContent, "LinkedIn | username");
    const badge = safeText(elements.cardBadge.textContent, "Developer Professional");
    const stamp = safeText(elements.cardStamp.textContent, "");

    context.fillStyle = softText;
    context.font = "600 26px Poppins, Segoe UI, Arial";
    context.fillText("Developer Identity", 286, 118);

    context.fillStyle = textColor;
    context.font = `${fitFontSize(context, name, 62, 44, 680, "700", "Poppins, Segoe UI, Arial")} Poppins, Segoe UI, Arial`;
    context.fillText(name, 286, 186);

    context.fillStyle = softText;
    context.font = "600 33px Poppins, Segoe UI, Arial";
    const roleLines = wrapTextLines(context, role, 680, 2);
    roleLines.forEach((line, index) => {
      context.fillText(line, 286, 236 + index * 40);
    });

    context.fillStyle = softText;
    context.font = "700 26px Poppins, Segoe UI, Arial";
    context.fillText("Skills", 74, 338);

    const skills = getSkillLabels();
    drawSkillChips(context, skills, 74, 365, width - 148, {
      fill: hexToRgba(colorC, isDark ? 0.24 : 0.2),
      border: hexToRgba(colorC, isDark ? 0.52 : 0.44),
      text: pillTextColor,
    });

    const socialX = 74;
    const socialY = 546;
    const socialH = 58;
    const socialGap = 18;
    const socialTotalW = width - 148;
    const socialW = Math.floor((socialTotalW - socialGap) / 2);
    const socialPadX = 24;
    const socialTextY = socialY + socialH / 2 + 1;
    const tokenSize = 30;
    const tokenGap = 10;
    const tokenY = socialY + (socialH - tokenSize) / 2;
    const labelMaxWidth = socialW - socialPadX * 2 - tokenSize - tokenGap;

    context.font = "600 25px Poppins, Segoe UI, Arial";
    const githubLabel = truncateTextToWidth(context, githubText, labelMaxWidth);
    const linkedinLabel = truncateTextToWidth(context, linkedinText, labelMaxWidth);

    context.fillStyle = hexToRgba(colorB, isDark ? 0.22 : 0.17);
    roundedRect(context, socialX, socialY, socialW, socialH, 30);
    context.fill();
    context.strokeStyle = hexToRgba(colorB, isDark ? 0.56 : 0.42);
    context.lineWidth = 2;
    roundedRect(context, socialX, socialY, socialW, socialH, 30);
    context.stroke();

    const linkedinX = socialX + socialW + socialGap;
    context.fillStyle = hexToRgba(colorA, isDark ? 0.22 : 0.17);
    roundedRect(context, linkedinX, socialY, socialW, socialH, 30);
    context.fill();
    context.strokeStyle = hexToRgba(colorA, isDark ? 0.56 : 0.42);
    context.lineWidth = 2;
    roundedRect(context, linkedinX, socialY, socialW, socialH, 30);
    context.stroke();

    context.fillStyle = pillTextColor;
    context.font = "600 25px Poppins, Segoe UI, Arial";
    context.textBaseline = "middle";
    drawSocialToken(context, socialX + socialPadX, tokenY, tokenSize, "GH", {
      fill: hexToRgba("#ffffff", isDark ? 0.22 : 0.34),
      border: hexToRgba("#ffffff", isDark ? 0.48 : 0.58),
      text: pillTextColor,
    });
    drawSocialToken(context, linkedinX + socialPadX, tokenY, tokenSize, "in", {
      fill: hexToRgba("#ffffff", isDark ? 0.22 : 0.34),
      border: hexToRgba("#ffffff", isDark ? 0.48 : 0.58),
      text: pillTextColor,
    });
    context.fillText(githubLabel, socialX + socialPadX + tokenSize + tokenGap, socialTextY);
    context.fillText(linkedinLabel, linkedinX + socialPadX + tokenSize + tokenGap, socialTextY);
    context.textBaseline = "alphabetic";

    const badgeW = measureRoundedLabel(context, badge, "600 22px Poppins, Segoe UI, Arial", 24);
    const badgeX = 74;
    const badgeY = 672;
    context.fillStyle = hexToRgba(colorA, isDark ? 0.22 : 0.18);
    roundedRect(context, badgeX, badgeY, badgeW, 44, 22);
    context.fill();
    context.strokeStyle = hexToRgba(colorA, isDark ? 0.5 : 0.36);
    context.lineWidth = 1.6;
    roundedRect(context, badgeX, badgeY, badgeW, 44, 22);
    context.stroke();
    context.fillStyle = pillTextColor;
    context.font = "600 22px Poppins, Segoe UI, Arial";
    context.fillText(badge, badgeX + 14, badgeY + 30);

    if (stamp) {
      context.fillStyle = softText;
      context.font = "600 21px Poppins, Segoe UI, Arial";
      context.fillText(stamp, width - 240, 711);
    }

    return canvas;
  }

  async function drawAvatarToCanvas(context, x, y, size, options) {
    const ringColor = options.ring || "#63d9d4";
    const bgA = options.bgA || "#d8e8ff";
    const bgB = options.bgB || "#f7f2ff";
    const textColor = options.text || "#24314c";
    const initials = safeText(elements.cardName.textContent, "D").charAt(0).toUpperCase();
    const previewAvatarImage = elements.avatar.querySelector("img");
    const previewAvatarSrc = previewAvatarImage ? previewAvatarImage.src : "";
    const avatarSrc = state.customAvatarDataUrl || state.githubAvatarDataUrl || previewAvatarSrc || "";

    context.save();
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    context.closePath();
    context.clip();

    if (avatarSrc) {
      const image = await loadImage(avatarSrc).catch(() => null);
      if (image) {
        context.drawImage(image, x, y, size, size);
        context.restore();
        context.strokeStyle = hexToRgba(ringColor, 0.7);
        context.lineWidth = 5;
        context.beginPath();
        context.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2);
        context.stroke();
        return;
      }
    }

    const avatarGradient = context.createLinearGradient(x, y, x + size, y + size);
    avatarGradient.addColorStop(0, bgA);
    avatarGradient.addColorStop(1, bgB);
    context.fillStyle = avatarGradient;
    context.fillRect(x, y, size, size);
    context.restore();

    context.strokeStyle = hexToRgba(ringColor, 0.7);
    context.lineWidth = 5;
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2);
    context.stroke();

    context.fillStyle = textColor;
    context.font = "700 76px Poppins, Segoe UI, Arial";
    context.fillText(initials, x + size / 2 - 24, y + size / 2 + 28);
  }

  function drawSkillChips(context, skills, x, startY, maxWidth, options) {
    const fillColor = options.fill;
    const borderColor = options.border;
    const textColor = options.text;
    context.font = "600 22px Poppins, Segoe UI, Arial";
    const horizontalPadding = 18;
    const chipHeight = 40;
    const rowGap = 10;
    const colGap = 10;

    let cursorX = x;
    let cursorY = startY;
    const widthLimit = x + maxWidth;

    const effectiveSkills = skills.length ? skills : ["Skills"];
    for (const skill of effectiveSkills) {
      const textWidth = context.measureText(skill).width;
      const chipWidth = Math.ceil(textWidth + horizontalPadding * 2);

      if (cursorX + chipWidth > widthLimit) {
        cursorX = x;
        cursorY += chipHeight + rowGap;
      }

      context.fillStyle = fillColor;
      roundedRect(context, cursorX, cursorY, chipWidth, chipHeight, 20);
      context.fill();

      context.strokeStyle = borderColor;
      context.lineWidth = 1.4;
      roundedRect(context, cursorX, cursorY, chipWidth, chipHeight, 20);
      context.stroke();

      context.fillStyle = textColor;
      context.fillText(skill, cursorX + horizontalPadding, cursorY + 27);
      cursorX += chipWidth + colGap;
    }
  }

  function drawSocialToken(context, x, y, size, text, options) {
    const fill = options.fill;
    const border = options.border;
    const color = options.text;

    context.fillStyle = fill;
    roundedRect(context, x, y, size, size, size / 2);
    context.fill();

    context.strokeStyle = border;
    context.lineWidth = 1.4;
    roundedRect(context, x, y, size, size, size / 2);
    context.stroke();

    context.fillStyle = color;
    context.font = "700 13px Poppins, Segoe UI, Arial";
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillText(text, x + size / 2, y + size / 2 + 1);
    context.textAlign = "start";
  }

  function getSkillLabels() {
    return Array.from(elements.cardSkills.querySelectorAll(".skill-chip"))
      .map((chip) => safeText(chip.textContent, ""))
      .filter(Boolean)
      .slice(0, 8);
  }

  function measureRoundedLabel(context, text, font, horizontalPadding) {
    context.font = font;
    return Math.ceil(context.measureText(text).width + horizontalPadding);
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace("#", "").trim();
    if (!/^[\da-f]{6}$/i.test(normalized)) {
      return `rgba(127, 127, 127, ${alpha})`;
    }
    const red = parseInt(normalized.slice(0, 2), 16);
    const green = parseInt(normalized.slice(2, 4), 16);
    const blue = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  function getCssVar(node, name) {
    const value = window.getComputedStyle(node).getPropertyValue(name);
    return value ? value.trim() : "";
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function fitFontSize(context, text, maxSize, minSize, maxWidth, fontWeight, fontFamily) {
    let size = maxSize;
    while (size > minSize) {
      context.font = `${fontWeight} ${size}px ${fontFamily}`;
      if (context.measureText(text).width <= maxWidth) {
        break;
      }
      size -= 2;
    }
    return `${fontWeight} ${size}px`;
  }

  function wrapTextLines(context, text, maxWidth, maxLines) {
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [text];
    }

    const lines = [];
    let current = "";
    let wasTruncated = false;

    for (let index = 0; index < words.length; index += 1) {
      const candidate = current ? `${current} ${words[index]}` : words[index];
      if (context.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[index];
        if (lines.length >= maxLines - 1) {
          wasTruncated = index < words.length - 1;
          break;
        }
      }
    }

    if (lines.length < maxLines && current) {
      lines.push(current);
    }

    if (lines.length > maxLines) {
      wasTruncated = true;
      lines.length = maxLines;
    }

    if (!lines.length) {
      lines.push(text);
    }

    const lastIndex = lines.length - 1;
    if (lastIndex >= 0) {
      let lastLine = lines[lastIndex];
      if (context.measureText(lastLine).width > maxWidth) {
        while (context.measureText(lastLine).width > maxWidth && lastLine.length > 1) {
          lastLine = lastLine.slice(0, -1);
        }
      }
      lines[lastIndex] = lastLine;
    }

    if (wasTruncated && lastIndex >= 0) {
      let trimmed = lines[lastIndex].trim();
      while (context.measureText(`${trimmed}...`).width > maxWidth && trimmed.length > 0) {
        trimmed = trimmed.slice(0, -1);
      }
      lines[lastIndex] = `${trimmed}...`;
    }

    return lines;
  }

  function truncateTextToWidth(context, text, maxWidth) {
    const value = safeText(text, "");
    if (!value || maxWidth <= 0) {
      return "";
    }

    if (context.measureText(value).width <= maxWidth) {
      return value;
    }

    let trimmed = value;
    while (trimmed.length > 1 && context.measureText(`${trimmed}...`).width > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed.trimEnd()}...`;
  }

  async function waitForFonts(timeoutMs) {
    if (!document.fonts || !document.fonts.ready) {
      return;
    }

    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }
})();
