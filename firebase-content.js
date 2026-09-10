import { ref, onValue, push, set } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { realtimeDb } from "./firebase-config.js";

const categoryNames = {
  nail: "NAIL",
  "goi-dau": "HEAD SPA",
  headspa: "HEAD SPA",
  massage: "MASSAGE"
};

const categoryLabels = {
  nail: "Nail",
  "goi-dau": "Gội đầu",
  headspa: "Gội đầu",
  massage: "Massage"
};

const formatPrice = (price) => `${Number(price || 0).toLocaleString("vi-VN")}đ`;
const itemsFromSnapshot = (snapshot) => Object.entries(snapshot.val() || {})
  .map(([id, item]) => ({ id, ...item }))
  .filter(item => item.active !== false)
  .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

function imageMarkup(url, alt, fallback) {
  if (!url) return `<div class="image-fallback"><span>${fallback}</span></div>`;
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" onerror="this.remove()"><div class="image-fallback"><span>${fallback}</span></div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

function renderServices(items) {
  const grid = document.getElementById("serviceGrid");
  if (!grid || !items.length) return;
  grid.innerHTML = items.map((item, index) => {
    const category = item.category || "nail";
    const badge = categoryNames[category] || category.toUpperCase();
    return `<article class="service-card reveal" data-category="${escapeHtml(category)}">
      <div class="card-image image-placeholder">${imageMarkup(item.imageUrl, item.name, `ẢNH ${badge}`)}<span class="card-badge">${badge}</span></div>
      <div class="card-body"><div class="card-meta"><span>${String(index + 1).padStart(2, "0")}</span><span>Từ ${formatPrice(item.price)}</span></div>
      <h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><a href="#booking" class="text-link">Đặt dịch vụ →</a></div>
    </article>`;
  }).join("");
  grid.querySelectorAll(".reveal").forEach(item => item.classList.add("revealed"));
  document.querySelectorAll(".category-tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".category-tab").forEach(item => item.classList.remove("active"));
      tab.classList.add("active");
      const filter = tab.dataset.filter;
      grid.querySelectorAll(".service-card").forEach(card => {
        const category = card.dataset.category;
        const matches = filter === "all" || category === filter || (filter === "headspa" && category === "goi-dau");
        card.classList.toggle("is-hidden", !matches);
      });
    };
  });
}

function renderPricing(items) {
  const grid = document.getElementById("pricingGrid");
  if (!grid || !items.length) return;
  const groups = ["nail", "goi-dau", "massage"].map(category => ({
    category,
    items: items.filter(item => item.category === category || (category === "goi-dau" && item.category === "headspa"))
  })).filter(group => group.items.length);
  grid.innerHTML = groups.map((group, index) => `<article class="price-box reveal${index === 1 ? " featured" : ""}">
    <div class="price-head"><span>${String(index + 1).padStart(2, "0")}</span><h3>${categoryLabels[group.category]}</h3></div>
    <ul>${group.items.map(item => `<li><span>${escapeHtml(item.name)}</span><strong>${formatPrice(item.price)}</strong></li>`).join("")}</ul>
  </article>`).join("");
}

function renderCombos(items) {
  const grid = document.getElementById("comboGrid");
  if (!grid || !items.length) return;
  grid.innerHTML = items.map((item, index) => `<article class="combo-card reveal${item.featured ? " featured" : ""}">
    <div class="combo-image image-placeholder">${imageMarkup(item.imageUrl, item.name, `ẢNH COMBO ${String(index + 1).padStart(2, "0")}`)}</div>
    <span class="combo-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(item.name)}</h3>
    <p>${escapeHtml(item.description)}</p><strong>${formatPrice(item.price)}</strong>
    <button class="btn btn-light" type="button" data-open-booking>Đặt combo</button></article>`).join("");
  grid.querySelectorAll("[data-open-booking]").forEach(button => button.addEventListener("click", () => document.querySelector("[data-open-booking]")?.click()));
}

function renderGallery(items) {
  const grid = document.getElementById("galleryGrid");
  if (!grid || !items.length) return;
  grid.innerHTML = items.map((item, index) => `<div class="gallery-item${index === 0 ? " large" : ""} image-placeholder">
    ${imageMarkup(item.imageUrl, item.title, `ẢNH ${String(item.category || "SALON").toUpperCase()}`)}</div>`).join("");
}

function renderReviews(items) {
  const grid = document.getElementById("reviewGrid");
  if (!grid || !items.length) return;
  grid.innerHTML = items.map(item => `<article class="review-card reveal"><div class="stars">${"★".repeat(Math.max(0, Math.min(5, Number(item.rating) || 0)))}</div>
    <p>“${escapeHtml(item.content)}”</p><div class="review-author"><span class="avatar">${escapeHtml((item.name || "K").charAt(0).toUpperCase())}</span>
    <div><strong>${escapeHtml(item.name)}</strong><small>Khách hàng</small></div></div></article>`).join("");
}

function renderSalon(settings) {
  if (!settings) return;
  document.title = `${settings.name || "Nail Studio"} | Nail & Beauty Spa`;
  document.querySelectorAll(".logo-main").forEach(element => { element.textContent = settings.name || "Nail"; });
  const contactValues = document.querySelectorAll(".contact-list p");
  if (contactValues[0] && settings.address) contactValues[0].textContent = settings.address;
  if (contactValues[1] && settings.phone) contactValues[1].textContent = settings.phone;
  if (contactValues[2] && settings.openingTime && settings.closingTime) contactValues[2].textContent = `${settings.openingTime} – ${settings.closingTime}`;
  if (contactValues[3]) contactValues[3].textContent = [settings.facebook, settings.instagram, settings.zalo].filter(Boolean).join(" • ");
}

onValue(ref(realtimeDb, "services"), snapshot => renderServices(itemsFromSnapshot(snapshot)));
onValue(ref(realtimeDb, "services"), snapshot => renderPricing(itemsFromSnapshot(snapshot)));
onValue(ref(realtimeDb, "combos"), snapshot => renderCombos(itemsFromSnapshot(snapshot)));
onValue(ref(realtimeDb, "gallery"), snapshot => renderGallery(itemsFromSnapshot(snapshot)));
onValue(ref(realtimeDb, "reviews"), snapshot => renderReviews(itemsFromSnapshot(snapshot)));
onValue(ref(realtimeDb, "settings/salon"), snapshot => renderSalon(snapshot.val()));

document.getElementById("bookingForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const bookingRef = push(ref(realtimeDb, "bookings"));
    await set(bookingRef, { ...data, status: "pending", createdAt: Date.now() });
    form.reset();
    window.dispatchEvent(new CustomEvent("booking-saved", { detail: data.name }));
  } catch (error) {
    console.error("Không thể lưu booking vào Firebase:", error);
  }
});
