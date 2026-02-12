document.documentElement.classList.add("js");

const defaultInstagramFeedItems = [
  {
    postUrl: "https://www.instagram.com/p/DUnvn9fEUbN/",
    caption: "We've come a long way!"
  },
  {
    postUrl: "https://www.instagram.com/p/DUl9UfekfYV/",
    caption: "Beam on!"
  },
  {
    postUrl: "https://www.instagram.com/p/DUl9DKkEdvm/",
    caption: "Find us here"
  },
  {
    postUrl: "https://www.instagram.com/p/DUl845SEZTl/",
    caption: "Thanks Yale Ventures!"
  },
  {
    postUrl: "https://www.instagram.com/p/DUl1VMikeV9/",
    caption: "Science reveals secrets hidden in plain sight"
  }
];

const instagramFeedItems =
  Array.isArray(window.instagramFeedItems) && window.instagramFeedItems.length > 0
    ? window.instagramFeedItems
    : defaultInstagramFeedItems;

const normalizeInstagramPostUrl = (url) => {
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^https:\/\/www\.instagram\.com\/(p|reel)\/([A-Za-z0-9_-]+)\/?(?:\?.*)?$/i);
  if (!match) return null;

  return `https://www.instagram.com/${match[1].toLowerCase()}/${match[2]}/`;
};

const getInstagramEmbedUrl = (postUrl) => `${postUrl}embed/`;

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getInstagramItemsPerPage = () => {
  if (window.matchMedia("(max-width: 640px)").matches) return 1;
  if (window.matchMedia("(max-width: 930px)").matches) return 2;
  if (window.matchMedia("(max-width: 1280px)").matches) return 3;
  return 4;
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

  const posts = instagramFeedItems
    .map((item) => {
      const postUrl = normalizeInstagramPostUrl(item.postUrl);
      if (!postUrl) return null;
      return {
        postUrl,
        embedUrl: getInstagramEmbedUrl(postUrl),
        caption: typeof item.caption === "string" ? item.caption.trim() : ""
      };
    })
    .filter(Boolean);

  if (posts.length === 0) {
    feed.innerHTML = '<p class="ig-help">Add Instagram post URLs in <code>instagramFeedItems</code> in <code>script.js</code>.</p>';
    return;
  }

  feed.innerHTML = `
    <div class="ig-slider" data-page="0">
      <button class="ig-nav ig-nav-prev" type="button" aria-label="Show previous Instagram posts">&lsaquo;</button>
      <div class="ig-viewport">
        <div class="ig-track"></div>
      </div>
      <button class="ig-nav ig-nav-next" type="button" aria-label="Show next Instagram posts">&rsaquo;</button>
    </div>
  `;

  const slider = feed.querySelector(".ig-slider");
  const track = feed.querySelector(".ig-track");
  const prevButton = feed.querySelector(".ig-nav-prev");
  const nextButton = feed.querySelector(".ig-nav-next");
  if (!slider || !track || !prevButton || !nextButton) return;

  let pageIndex = 0;
  let resizeFrame = 0;

  const render = () => {
    const itemsPerPage = getInstagramItemsPerPage();
    const totalPages = Math.max(Math.ceil(posts.length / itemsPerPage), 1);
    pageIndex = Math.min(pageIndex, totalPages - 1);
    slider.setAttribute("data-page", String(pageIndex));

    const pages = [];
    for (let page = 0; page < totalPages; page += 1) {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const pagePosts = posts.slice(start, end);
      const tiles = pagePosts
        .map((post, idx) => {
          const captionText = post.caption || "View post on Instagram";
          const safeCaption = escapeHtml(captionText);
          const safeAlt = escapeHtml(`Instagram post ${start + idx + 1}`);
          return `<a class="ig-tile" href="${post.postUrl}" target="_blank" rel="noopener noreferrer">
            <span class="ig-media-shell" aria-hidden="true">
              <iframe class="ig-embed-frame" src="${post.embedUrl}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="${safeAlt}"></iframe>
            </span>
            <span class="ig-overlay"><span class="ig-caption">${safeCaption}</span></span>
          </a>`;
        })
        .join("");
      pages.push(`<div class="ig-page">${tiles}</div>`);
    }

    track.innerHTML = pages.join("");
    track.style.transform = `translateX(-${pageIndex * 100}%)`;
    prevButton.disabled = pageIndex <= 0;
    nextButton.disabled = pageIndex >= totalPages - 1;
    slider.classList.toggle("is-static", totalPages <= 1);
  };

  prevButton.addEventListener("click", () => {
    pageIndex = Math.max(pageIndex - 1, 0);
    render();
  });

  nextButton.addEventListener("click", () => {
    const itemsPerPage = getInstagramItemsPerPage();
    const maxPage = Math.max(Math.ceil(posts.length / itemsPerPage) - 1, 0);
    pageIndex = Math.min(pageIndex + 1, maxPage);
    render();
  });

  window.addEventListener("resize", () => {
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(render);
  });

  render();
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
