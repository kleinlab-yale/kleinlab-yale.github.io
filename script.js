const teamMembers = [
  {
    name: "Ari Patel",
    role: "Postdoctoral Fellow",
    focus: "Perturb-seq models for immune cell state transitions"
  },
  {
    name: "Maya Chen",
    role: "PhD Student",
    focus: "Interpretable machine learning for disease progression"
  },
  {
    name: "Jonah Reed",
    role: "Research Scientist",
    focus: "Spatial omics pipelines and tissue architecture analysis"
  },
  {
    name: "Lina Alvarez",
    role: "MD/PhD Student",
    focus: "Clinical cohort integration and translational biomarkers"
  },
  {
    name: "Noah Kim",
    role: "Bioinformatics Engineer",
    focus: "Scalable workflows, QC, and lab data infrastructure"
  },
  {
    name: "Sara Ibrahim",
    role: "Lab Manager",
    focus: "Operational leadership, wet-lab systems, and onboarding"
  }
];

const publications = [
  {
    citation: "Klein E, Chen M, Patel A, et al. Program-level models of cell fate in inflammatory disease.",
    journal: "Nature Biotechnology (2025)",
    link: "#"
  },
  {
    citation: "Reed J, Klein E. Spatially informed learning reveals hidden tissue states.",
    journal: "Cell Systems (2024)",
    link: "#"
  },
  {
    citation: "Alvarez L, Kim N, Klein E. Integrating longitudinal clinical data with multi-omics.",
    journal: "Science Translational Medicine (2024)",
    link: "#"
  }
];

const newsItems = [
  {
    date: "February 2026",
    text: "KLAY receives a new multi-PI award for AI-enabled biomarker discovery."
  },
  {
    date: "December 2025",
    text: "Two lab members win Yale graduate fellowships for computational medicine research."
  },
  {
    date: "September 2025",
    text: "Our latest single-cell study is now published in Nature Biotechnology."
  }
];

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const initialsFromName = (name) => {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
};

const renderPeople = () => {
  const peopleGrid = document.getElementById("people-grid");
  if (!peopleGrid) return;

  const cards = teamMembers.map((member) => {
    const initials = initialsFromName(member.name);
    const safeName = escapeHtml(member.name);
    const safeRole = escapeHtml(member.role);
    const safeFocus = escapeHtml(member.focus);

    return `
      <article class="person-card reveal">
        <div class="person-avatar" aria-hidden="true">${initials}</div>
        <h3>${safeName}</h3>
        <p class="person-role">${safeRole}</p>
        <p class="person-focus">${safeFocus}</p>
      </article>
    `;
  });

  peopleGrid.innerHTML = cards.join("");
};

const renderPublications = () => {
  const pubList = document.getElementById("pub-list");
  if (!pubList) return;

  const entries = publications.map((item) => {
    const safeCitation = escapeHtml(item.citation);
    const safeJournal = escapeHtml(item.journal);
    const safeLink = escapeHtml(item.link);

    return `
      <li class="reveal">
        <p class="pub-citation">${safeCitation}</p>
        <span class="pub-journal">${safeJournal}</span>
        <a class="pub-link" href="${safeLink}">Paper link</a>
      </li>
    `;
  });

  pubList.innerHTML = entries.join("");
};

const renderNews = () => {
  const newsList = document.getElementById("news-list");
  if (!newsList) return;

  const entries = newsItems.map((item) => {
    const safeDate = escapeHtml(item.date);
    const safeText = escapeHtml(item.text);

    return `
      <li class="news-item reveal">
        <span class="news-date">${safeDate}</span>
        <p class="news-text">${safeText}</p>
      </li>
    `;
  });

  newsList.innerHTML = entries.join("");
};

const setupRevealAnimation = () => {
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

const setCopyrightYear = () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
};

renderPeople();
renderPublications();
renderNews();
setupRevealAnimation();
setupMobileMenu();
setCopyrightYear();
