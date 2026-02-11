document.documentElement.classList.add("js");

const setupRevealAnimation = () => {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((node) => node.classList.add("in-view"));
    return;
  }

  const revealNodes = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12
    }
  );

  revealNodes.forEach((node) => observer.observe(node));
};

const setupMobileMenu = () => {
  const toggle = document.querySelector(".menu-toggle");
  const links = document.getElementById("nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
};

const setupTopLinks = () => {
  const topLinks = document.querySelectorAll(".brand, a[href='#top']");
  topLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (window.location.hash !== "#top") {
        window.history.replaceState(null, "", "#top");
      }
    });
  });
};

const setupHeroVideoAudio = () => {
  const video = document.querySelector(".hero-video");
  const toggle = document.querySelector(".hero-audio-toggle");
  if (!video || !toggle) return;

  const syncState = () => {
    const isMuted = video.muted;
    toggle.textContent = isMuted ? "Enable Audio" : "Mute Audio";
    toggle.setAttribute("aria-pressed", String(!isMuted));
  };

  toggle.addEventListener("click", async () => {
    video.muted = !video.muted;
    try {
      await video.play();
    } catch (_) {
      // Ignore autoplay errors if browser requires another user gesture.
    }
    syncState();
  });

  syncState();
};

const setCopyrightYear = () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
};

setupRevealAnimation();
setupMobileMenu();
setupTopLinks();
setupHeroVideoAudio();
setCopyrightYear();
