const teamMembers = [
  {
    name: "Tongqing Li, PhD",
    role: "Research Scientist",
    detail: "Yale School of Medicine profile",
    link: "https://medicine.yale.edu/profile/tongqing-li/",
    linkLabel: "Profile"
  },
  {
    name: "Hengyi Li, PhD",
    role: "Associate Research Scientist",
    detail: "Yale School of Medicine profile",
    link: "https://medicine.yale.edu/profile/hengyi-li/",
    linkLabel: "Profile"
  },
  {
    name: "Pouyan Rahmani",
    role: "Research Associate (YCBI Coordinator)",
    detail: "Yale School of Medicine profile",
    link: "https://medicine.yale.edu/profile/pouyan-rahmani/",
    linkLabel: "Profile"
  },
  {
    name: "Elaine Kupec",
    role: "Senior Administrative Assistant",
    detail: "Yale School of Medicine profile",
    link: "https://medicine.yale.edu/profile/elaine-kupec/",
    linkLabel: "Profile"
  },
  {
    name: "Jackson St. Aubyn",
    role: "Yale Undergraduate Student",
    detail: "Yale student profile",
    link: "https://yalebulldogs.com/sports/football/roster/jackson-st--aubyn/22157",
    linkLabel: "Profile"
  }
];

const publications = [
  {
    citation: "Total Klein Lab publication list.",
    journal: "PubMed (sorted by date)",
    link: "https://pubmed.ncbi.nlm.nih.gov/?term=daryl+klein&sort=date",
    linkLabel: "View PubMed list"
  },
  {
    citation: "Daryl Ewald Klein publication profile.",
    journal: "Google Scholar",
    link: "https://scholar.google.com/citations?user=68S_TT8AAAAJ&hl=en",
    linkLabel: "View Google Scholar"
  },
  {
    citation: "Nature Communications paper accepted (January 2026): structural basis for regulating ROS1 oncogene activity.",
    journal: "Lab update"
  }
];

const tools = [
  {
    name: "Ewaldssphere",
    description: "Klein Lab Hugging Face resource hub.",
    link: "https://huggingface.co/Ewaldssphere",
    linkLabel: "Open Ewaldssphere"
  },
  {
    name: "MIXA (Molecular Interaction Analysis)",
    description: "Interactive space for molecular interaction analysis.",
    link: "https://huggingface.co/spaces/Ewaldssphere/MIXA_beta0.2",
    linkLabel: "Open MIXA"
  }
];

const newsItems = [
  {
    date: "February 2026",
    text: "Klein Lab receives a 2nd Blavatnik Award for developing ROS1 biologics to treat cancer, following a first-place prize in 2023.",
    links: [
      {
        label: "Award news",
        url: "https://ventures.yale.edu/news/yales-life-science-community-celebrates-innovation-2023-yale-life-science-pitchfest-4-yale"
      },
      {
        label: "Original pitch",
        url: "https://ventures.yale.edu/yale-technologies/rosevix-rosziqumab-ros1-biologic-invasive-cancers"
      }
    ]
  },
  {
    date: "January 2026",
    text: "Nature Communications paper accepted, describing the structural basis for regulating oncogene ROS1 activity."
  },
  {
    date: "December 2025",
    text: "Klein Lab awarded the Golden Token by Connecticut Innovations and Yale Ventures to support the foundation of a newco spinout.",
    links: [
      {
        label: "Pitchfest 2025 announcement",
        url: "https://ventures.yale.edu/news/yale-life-science-pitchfest-2025-breaks-records-attendance-and-awards"
      }
    ]
  }
];

const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const initialsFromName = (name) => {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "K";
  return (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
};

const renderPeople = () => {
  const peopleGrid = document.getElementById("people-grid");
  if (!peopleGrid) return;

  const cards = teamMembers.map((member) => {
    const initials = escapeHtml(initialsFromName(member.name));
    const safeName = escapeHtml(member.name);
    const safeRole = escapeHtml(member.role);
    const safeDetail = escapeHtml(member.detail);
    const safeLink = escapeHtml(member.link || "");
    const safeLinkLabel = escapeHtml(member.linkLabel || "Profile");

    return `
      <article class="person-card reveal">
        <div class="person-avatar" aria-hidden="true">${initials}</div>
        <h3>${safeName}</h3>
        <p class="person-role">${safeRole}</p>
        <p class="person-focus">${safeDetail}</p>
        ${member.link ? `<a class="person-link" href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLinkLabel}</a>` : ""}
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
    const safeLink = escapeHtml(item.link || "");
    const safeLinkLabel = escapeHtml(item.linkLabel || "Read more");

    return `
      <li class="reveal">
        <p class="pub-citation">${safeCitation}</p>
        <span class="pub-journal">${safeJournal}</span>
        ${item.link ? `<a class="pub-link" href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLinkLabel}</a>` : ""}
      </li>
    `;
  });

  pubList.innerHTML = entries.join("");
};

const renderTools = () => {
  const toolGrid = document.getElementById("tool-grid");
  if (!toolGrid) return;

  const cards = tools.map((tool) => {
    const safeName = escapeHtml(tool.name);
    const safeDescription = escapeHtml(tool.description);
    const safeLink = escapeHtml(tool.link);
    const safeLinkLabel = escapeHtml(tool.linkLabel || "Open tool");

    return `
      <article class="tool-card reveal">
        <h3>${safeName}</h3>
        <p>${safeDescription}</p>
        <a class="tool-link" href="${safeLink}" target="_blank" rel="noopener noreferrer">${safeLinkLabel}</a>
      </article>
    `;
  });

  toolGrid.innerHTML = cards.join("");
};

const renderNews = () => {
  const newsList = document.getElementById("news-list");
  if (!newsList) return;

  const entries = newsItems.map((item) => {
    const safeDate = escapeHtml(item.date);
    const safeText = escapeHtml(item.text);
    const links = Array.isArray(item.links) ? item.links : [];
    const linksMarkup = links.length
      ? `
        <div class="news-links">
          ${links.map((link) => {
            const safeLabel = escapeHtml(link.label);
            const safeUrl = escapeHtml(link.url);
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
          }).join("")}
        </div>
      `
      : "";

    return `
      <li class="news-item reveal">
        <span class="news-date">${safeDate}</span>
        <p class="news-text">${safeText}</p>
        ${linksMarkup}
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
renderTools();
renderNews();
setupRevealAnimation();
setupMobileMenu();
setCopyrightYear();
