/* Editable content is stored in content/*.json. Keep text as text, never HTML. */
(() => {
  const text = (value) => typeof value === "string" ? value.trim() : "";
  const node = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value) element.textContent = value;
    return element;
  };
  const safeLink = (value) => {
    try {
      const url = new URL(text(value));
      return ["https:", "http:"].includes(url.protocol) ? url.href : "";
    } catch { return ""; }
  };
  const safeImage = (value) => {
    const path = text(value);
    // Uploaded photos stay in this repository; no arbitrary remote image fetches.
    return /^\/?images\/[A-Za-z0-9_./% -]+\.(?:jpe?g|png|webp|gif|avif)$/i.test(path)
      && !path.includes("..") ? path : "";
  };
  const link = (value, label, className) => {
    const element = node("a", className, text(label));
    element.href = safeLink(value);
    element.target = "_blank";
    element.rel = "noopener noreferrer";
    return element;
  };
  const photo = (path, alt, className) => {
    const image = node("img", className);
    image.src = safeImage(path);
    image.alt = text(alt);
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => image.remove(), { once: true });
    return image;
  };
  const requireItems = (data, key, valid) => {
    if (!Array.isArray(data?.[key]) || !data[key].every(item => item && valid(item))) {
      throw new Error(`Invalid ${key} content`);
    }
    return data[key];
  };
  const renderTools = (data) => {
    const items = requireItems(data, "items", item => text(item.title) && text(item.description) && safeLink(item.url) && text(item.linkLabel));
    const cards = items.map(item => {
      const card = node("article", `tool-card${item.featured === true ? " tool-featured" : ""}`);
      if (item.featured === true) card.append(node("p", "eyebrow", "Run online"));
      card.append(node("h3", "", item.title), node("p", "", item.description),
        link(item.url, item.linkLabel, item.featured === true ? "btn btn-primary tool-link" : "tool-link"));
      return card;
    });
    document.querySelector(".tool-grid").replaceChildren(...cards);
  };
  const renderNews = (data) => {
    const items = requireItems(data, "items", item => text(item.date) && text(item.text)
      && (item.links == null || (Array.isArray(item.links) && item.links.every(value => value && text(value.label) && safeLink(value.url)))));
    const cards = items.map(item => {
      const card = node("li", "news-item");
      card.append(node("span", "news-date", item.date), node("p", "news-text", item.text));
      const links = node("div", "news-links");
      (item.links || []).forEach(value => links.append(link(value.url, value.label)));
      if (links.children.length) card.append(links);
      return card;
    });
    document.querySelector(".news-list").replaceChildren(...cards);
  };
  const renderPeople = (data) => {
    const items = requireItems(data, "items", item => text(item.name) && text(item.role) && text(item.initials)
      && (!text(item.url) || (safeLink(item.url) && text(item.linkLabel)))
      && (!text(item.photo) || safeImage(item.photo)));
    const cards = items.map(item => {
      const card = node("article", "person-card");
      const avatar = node("div", "person-avatar", item.initials);
      avatar.setAttribute("aria-hidden", "true");
      if (safeImage(item.photo)) avatar.append(photo(item.photo, "", "person-photo"));
      card.append(avatar, node("h3", "", item.name), node("p", "person-role", item.role));
      if (safeLink(item.url)) card.append(link(item.url, item.linkLabel, "person-focus-link"));
      return card;
    });
    document.querySelector(".people-grid").replaceChildren(...cards);
  };
  const renderGallery = (data) => {
    const items = requireItems(data, "photos", item => text(item.caption) && text(item.alt) && safeImage(item.image)
      && (!text(item.url) || safeLink(item.url)));
    const gallery = document.getElementById("lab-gallery");
    const cards = items.map(item => {
      const card = node("figure", "lab-photo");
      card.append(photo(item.image, item.alt, "lab-photo-image"));
      const caption = node("figcaption", "lab-photo-caption");
      if (text(item.date)) caption.append(node("span", "news-date", item.date));
      caption.append(node("p", "", item.caption));
      if (safeLink(item.url)) caption.append(link(item.url, "Read more", "tool-link"));
      card.append(caption);
      return card;
    });
    gallery.replaceChildren(...cards);
    gallery.hidden = cards.length === 0;
  };
  const load = async (file, render) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`content/${file}.json`, { cache: "no-cache", signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      render(await response.json());
    } catch (error) {
      // Preserve the readable HTML fallback if a content request fails.
      console.warn(`Could not load ${file} content; keeping the page fallback.`, error);
    } finally { clearTimeout(timer); }
  };
  void Promise.all([
    load("tools", renderTools), load("news", renderNews),
    load("people", renderPeople), load("lab", renderGallery)
  ]);
})();
