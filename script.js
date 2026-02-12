document.documentElement.classList.add("js");

const instagramProfileUrl = "https://www.instagram.com/kleinlab.yale/?hl=en";

const instagramPostUrls = [
  "https://www.instagram.com/p/DUnvn9fEUbN/",
  "https://www.instagram.com/p/DUl9UfekfYV/",
  "https://www.instagram.com/p/DUl9DKkEdvm/",
  "https://www.instagram.com/p/DUl845SEZTl/",
  "https://www.instagram.com/p/DUl1VMikeV9/"
];

const normalizeInstagramUrl = (url) => {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^https:\/\/www\.instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)\/?(?:\?.*)?$/i);
  if (!match) return null;

  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
};

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

  let previewAtEnd = true;

  const setPreviewFrameToEnd = () => {
    if (!Number.isFinite(video.duration) || video.duration <= 0) return;
    const previewTime = Math.max(video.duration - 0.15, 0);
    if (Math.abs(video.currentTime - previewTime) > 0.05) {
      video.currentTime = previewTime;
    }
    video.pause();
    previewAtEnd = true;
  };

  const ensureStartsFromBeginning = () => {
    if (!previewAtEnd) return;
    video.currentTime = 0;
    previewAtEnd = false;
  };

  const togglePlayback = async () => {
    try {
      if (video.paused) {
        ensureStartsFromBeginning();
        await video.play();
      } else {
        video.pause();
      }
    } catch (_) {
      // Ignore play interruptions; user can click again.
    }
  };

  const playWithAudio = async () => {
    video.muted = false;
    video.volume = 1;
    ensureStartsFromBeginning();
    await video.play();
  };

  const muteVideo = () => {
    video.muted = true;
  };

  const syncState = () => {
    const isMuted = video.muted;
    toggle.textContent = isMuted ? "Enable Audio" : "Mute Audio";
    toggle.setAttribute("aria-pressed", String(!isMuted));
  };

  toggle.addEventListener("click", async () => {
    try {
      if (video.muted) {
        await playWithAudio();
      } else {
        muteVideo();
      }
    } catch (_) {
      // Ignore autoplay errors if browser requires another user gesture.
    }
    syncState();
  });

  video.addEventListener("click", () => {
    void togglePlayback();
  });

  if (video.readyState >= 1) {
    setPreviewFrameToEnd();
  } else {
    video.addEventListener("loadedmetadata", setPreviewFrameToEnd, { once: true });
  }

  syncState();
};

const setupInstagramFeed = () => {
  const feed = document.getElementById("instagram-feed");
  if (!feed) return;

  const postUrls = instagramPostUrls.map(normalizeInstagramUrl).filter(Boolean);

  if (postUrls.length === 0) {
    feed.innerHTML = `<p class="ig-help">Add your Instagram post URLs in <code>script.js</code> (<code>instagramPostUrls</code>) to render embedded posts here. For now, view the profile at <a href="${instagramProfileUrl}" target="_blank" rel="noopener noreferrer">@kleinlab.yale</a>.</p>`;
    return;
  }

  feed.innerHTML = `<div class="ig-carousel" data-current-index="0">
    <button class="ig-arrow ig-arrow-prev" type="button" aria-label="Show previous Instagram posts">&larr;</button>
    <div class="ig-viewport">
      <div class="ig-track">${postUrls
    .map(
      (url) =>
        `<div class="ig-item"><blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"><a href="${url}" target="_blank" rel="noopener noreferrer">View this post on Instagram</a></blockquote></div>`
    )
    .join("")}</div>
    </div>
    <button class="ig-arrow ig-arrow-next" type="button" aria-label="Show next Instagram posts">&rarr;</button>
  </div>`;

  const carousel = feed.querySelector(".ig-carousel");
  const track = feed.querySelector(".ig-track");
  const prevButton = feed.querySelector(".ig-arrow-prev");
  const nextButton = feed.querySelector(".ig-arrow-next");
  if (!carousel || !track || !prevButton || !nextButton) return;

  const getSlidesPerView = () => {
    if (window.matchMedia("(max-width: 640px)").matches) return 1;
    if (window.matchMedia("(max-width: 930px)").matches) return 2;
    return 3;
  };

  const getSlideStepPx = () => {
    const item = track.querySelector(".ig-item");
    if (!item) return 0;
    const trackStyles = window.getComputedStyle(track);
    const gap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || "0");
    return item.getBoundingClientRect().width + gap;
  };

  const setCurrentIndex = (nextIndex) => {
    carousel.setAttribute("data-current-index", String(nextIndex));
  };

  const getCurrentIndex = () => {
    const raw = Number.parseInt(carousel.getAttribute("data-current-index") || "0", 10);
    if (!Number.isFinite(raw)) return 0;
    return Math.max(raw, 0);
  };

  const updateCarousel = () => {
    const slidesPerView = getSlidesPerView();
    const maxIndex = Math.max(postUrls.length - slidesPerView, 0);
    const currentIndex = Math.min(getCurrentIndex(), maxIndex);
    const stepPx = getSlideStepPx();
    setCurrentIndex(currentIndex);
    track.style.transform = `translateX(-${currentIndex * stepPx}px)`;
    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= maxIndex;
    carousel.classList.toggle("is-static", maxIndex === 0);
  };

  const moveBy = (delta) => {
    const slidesPerView = getSlidesPerView();
    const maxIndex = Math.max(postUrls.length - slidesPerView, 0);
    const currentIndex = getCurrentIndex();
    const nextIndex = Math.min(Math.max(currentIndex + delta, 0), maxIndex);
    setCurrentIndex(nextIndex);
    updateCarousel();
  };

  prevButton.addEventListener("click", () => moveBy(-1));
  nextButton.addEventListener("click", () => moveBy(1));
  window.addEventListener("resize", updateCarousel);

  if (window.instgrm && window.instgrm.Embeds) {
    window.instgrm.Embeds.process();
    window.requestAnimationFrame(updateCarousel);
    return;
  }

  const existingScript = document.querySelector("script[data-instgrm-embed-loader='true']");
  if (existingScript) {
    window.requestAnimationFrame(updateCarousel);
    return;
  }

  const script = document.createElement("script");
  script.src = "https://www.instagram.com/embed.js";
  script.async = true;
  script.setAttribute("data-instgrm-embed-loader", "true");
  script.addEventListener("load", () => {
    window.instgrm?.Embeds?.process();
    window.requestAnimationFrame(updateCarousel);
  });
  document.body.appendChild(script);

  window.requestAnimationFrame(updateCarousel);
};

const setCopyrightYear = () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
};

setupRevealAnimation();
setupMobileMenu();
setupTopLinks();
setupHeroVideoAudio();
setupInstagramFeed();
setCopyrightYear();
