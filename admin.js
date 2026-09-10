import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";
import { getDownloadURL, ref as storageRef, uploadBytes } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import { auth, realtimeDb, storage } from "./firebase-config.js";

const loginPanel = document.getElementById("loginPanel");
const dashboard = document.getElementById("dashboard");
const contentSection = document.getElementById("contentSection");
const toast = document.getElementById("toast");
const loginMessage = document.getElementById("loginMessage");
let activeSection = "services";
let dataCache = {};
let toastTimer;

const definitions = {
  services: { title: "Dịch vụ", singular: "dịch vụ", fields: [
    ["name", "Tên dịch vụ", "text", true], ["category", "Danh mục", "select", true, [["nail", "Nail"], ["goi-dau", "Gội đầu"], ["massage", "Massage"]]],
    ["description", "Mô tả", "textarea", true], ["price", "Giá (VNĐ)", "number", true], ["duration", "Thời lượng (phút)", "number", true], ["imageUrl", "URL hình ảnh", "url", false],
    ["featured", "Nổi bật", "checkbox", false], ["active", "Đang hiển thị", "checkbox", false], ["sortOrder", "Thứ tự", "number", false]
  ]},
  combos: { title: "Combo", singular: "combo", fields: [
    ["name", "Tên combo", "text", true], ["description", "Mô tả", "textarea", true], ["price", "Giá (VNĐ)", "number", true], ["duration", "Thời lượng (phút)", "number", true], ["imageUrl", "URL hình ảnh", "url", false], ["featured", "Nổi bật", "checkbox", false], ["active", "Đang hiển thị", "checkbox", false], ["sortOrder", "Thứ tự", "number", false]
  ]},
  gallery: { title: "Gallery", singular: "ảnh", fields: [["title", "Tên ảnh", "text", true], ["category", "Danh mục", "text", true], ["imageUrl", "URL hình ảnh", "url", true], ["active", "Đang hiển thị", "checkbox", false], ["sortOrder", "Thứ tự", "number", false]]},
  reviews: { title: "Reviews", singular: "review", fields: [["name", "Tên khách hàng", "text", true], ["rating", "Số sao", "number", true], ["content", "Nội dung", "textarea", true], ["avatarUrl", "URL avatar", "url", false], ["active", "Đang hiển thị", "checkbox", false], ["sortOrder", "Thứ tự", "number", false]]}
};

function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function showToast(message) { toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 2600); }
function formatPrice(value) { return `${Number(value || 0).toLocaleString("vi-VN")}đ`; }
function itemsFromValue(value) { return Object.entries(value || {}).map(([id, item]) => ({ id, ...item })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)); }

function fieldMarkup(field, item = {}) {
  const [key, label, type, required, options] = field;
  if (type === "checkbox") return `<label class="checkbox-label"><input type="checkbox" name="${key}" ${item[key] !== false ? "checked" : ""}> ${label}</label>`;
  if (type === "textarea") return `<label>${label}<textarea name="${key}" rows="3" ${required ? "required" : ""}>${escapeHtml(item[key] || "")}</textarea></label>`;
  if (type === "select") return `<label>${label}<select name="${key}" ${required ? "required" : ""}>${options.map(([value, text]) => `<option value="${value}" ${item[key] === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>`;
  if (type === "url" && (key === "imageUrl" || key === "avatarUrl")) return `<label>${label}<input type="url" name="${key}" value="${escapeHtml(item[key] ?? "")}"><span class="upload-label">Hoặc tải ảnh từ máy<input type="file" name="${key}File" accept="image/*"></span></label>`;
  return `<label>${label}<input type="${type}" name="${key}" value="${escapeHtml(item[key] ?? "")}" ${required ? "required" : ""}></label>`;
}

async function uploadImage(file, section, itemId) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) throw new Error("Chỉ được tải file hình ảnh");
  if (file.size > 5 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 5MB");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const imageRef = storageRef(storage, `images/${section}/${itemId}-${Date.now()}-${safeName}`);
  const snapshot = await uploadBytes(imageRef, file);
  return getDownloadURL(snapshot.ref);
}

function openEditor(section, id = "") {
  const definition = definitions[section];
  const item = id ? dataCache[section]?.[id] || {} : { active: true, sortOrder: Object.keys(dataCache[section] || {}).length + 1 };
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `<div class="modal-card"><button class="close-button" type="button" aria-label="Đóng">×</button><h2>${id ? "Sửa" : "Thêm"} ${definition.singular}</h2><form class="editor-form"><div class="form-grid">${definition.fields.map(field => fieldMarkup(field, item)).join("")}</div><div class="modal-actions"><button class="ghost-button cancel-button" type="button">Hủy</button><button class="primary-button" type="submit">Lưu</button></div></form></div>`;
  document.body.append(modal);
  const close = () => modal.remove();
  modal.querySelector(".close-button").onclick = close;
  modal.querySelector(".cancel-button").onclick = close;
  modal.addEventListener("click", event => { if (event.target === modal) close(); });
  modal.querySelector("form").onsubmit = async event => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {};
    definition.fields.forEach(([key, , type]) => {
      if (type === "checkbox") payload[key] = formData.has(key);
      else if (type === "number") payload[key] = Number(formData.get(key) || 0);
      else payload[key] = String(formData.get(key) || "").trim();
    });
    const targetId = id || `item_${Date.now()}`;
    try {
      for (const key of ["imageUrl", "avatarUrl"]) {
        const file = formData.get(`${key}File`);
        if (file instanceof File && file.size > 0) payload[key] = await uploadImage(file, section, targetId);
      }
      await set(ref(realtimeDb, `${section}/${targetId}`), payload);
      close(); showToast("Đã lưu thay đổi");
    }
    catch (error) { showToast(`Không thể lưu: ${error.message}`); }
  };
}

async function deleteItem(section, id) {
  if (!window.confirm("Bạn chắc chắn muốn xóa mục này?")) return;
  try { await remove(ref(realtimeDb, `${section}/${id}`)); showToast("Đã xóa"); }
  catch (error) { showToast(`Không thể xóa: ${error.message}`); }
}

function renderCollection(section) {
  const definition = definitions[section];
  const items = itemsFromValue(dataCache[section]);
  const columns = section === "services" ? ["name", "category", "price", "active"] : section === "combos" ? ["name", "price", "active"] : section === "gallery" ? ["title", "category", "active"] : ["name", "rating", "active"];
  contentSection.innerHTML = `<div class="section-toolbar"><div><h2>${definition.title}</h2><p class="muted">${items.length} mục trong Firebase Realtime Database</p></div><button class="primary-button" id="addButton">+ Thêm ${definition.singular}</button></div><div class="table-wrap">${items.length ? `<table class="data-table"><thead><tr>${columns.map(column => `<th>${column}</th>`).join("")}<th>Thao tác</th></tr></thead><tbody>${items.map(item => `<tr>${columns.map(column => `<td>${column === "price" ? formatPrice(item[column]) : column === "active" ? `<span class="status ${item[column] === false ? "cancelled" : "confirmed"}">${item[column] === false ? "Ẩn" : "Hiện"}</span>` : escapeHtml(item[column])}</td>`).join("")}<td><div class="actions"><button class="ghost-button edit-button" data-id="${item.id}" type="button">Sửa</button><button class="danger-button delete-button" data-id="${item.id}" type="button">Xóa</button></div></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Chưa có dữ liệu.</div>`}</div>`;
  document.getElementById("addButton").onclick = () => openEditor(section);
  contentSection.querySelectorAll(".edit-button").forEach(button => button.onclick = () => openEditor(section, button.dataset.id));
  contentSection.querySelectorAll(".delete-button").forEach(button => button.onclick = () => deleteItem(section, button.dataset.id));
}

function renderBookings() {
  const items = itemsFromValue(dataCache.bookings);
  contentSection.innerHTML = `<div class="section-toolbar"><div><h2>Booking</h2><p class="muted">${items.length} yêu cầu đặt lịch</p></div></div><div class="table-wrap">${items.length ? `<table class="data-table"><thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Ngày giờ</th><th>Liên hệ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${items.map(item => `<tr><td><strong>${escapeHtml(item.name)}</strong><br><small>${escapeHtml(item.note)}</small></td><td>${escapeHtml(item.service)}</td><td>${escapeHtml(item.date)}<br>${escapeHtml(item.time)}</td><td>${escapeHtml(item.phone)}</td><td><span class="status ${escapeHtml(item.status)}">${escapeHtml(item.status || "pending")}</span></td><td><div class="actions"><select class="booking-status" data-id="${item.id}"><option value="pending" ${item.status === "pending" ? "selected" : ""}>Chờ xử lý</option><option value="confirmed" ${item.status === "confirmed" ? "selected" : ""}>Đã xác nhận</option><option value="completed" ${item.status === "completed" ? "selected" : ""}>Hoàn thành</option><option value="cancelled" ${item.status === "cancelled" ? "selected" : ""}>Đã hủy</option></select><button class="danger-button delete-button" data-id="${item.id}" type="button">Xóa</button></div></td></tr>`).join("")}</tbody></table>` : `<div class="empty">Chưa có booking.</div>`}</div>`;
  contentSection.querySelectorAll(".booking-status").forEach(select => select.onchange = async () => { await update(ref(realtimeDb, `bookings/${select.dataset.id}`), { status: select.value }); showToast("Đã cập nhật trạng thái"); });
  contentSection.querySelectorAll(".delete-button").forEach(button => button.onclick = () => deleteItem("bookings", button.dataset.id));
}

function renderSettings() {
  const settings = dataCache.settings?.salon || {};
  const fields = [["name", "Tên salon", "text"], ["phone", "Điện thoại", "tel"], ["email", "Email", "email"], ["address", "Địa chỉ", "text"], ["openingTime", "Giờ mở cửa", "time"], ["closingTime", "Giờ đóng cửa", "time"], ["facebook", "Facebook", "url"], ["zalo", "Zalo", "text"], ["instagram", "Instagram", "url"], ["mapUrl", "Google Maps URL", "url"]];
  contentSection.innerHTML = `<div class="section-toolbar"><div><h2>Thông tin salon</h2><p class="muted">Dữ liệu lưu tại settings/salon</p></div></div><form class="settings-form" id="settingsForm"><div class="form-grid">${fields.map(([key, label, type]) => `<label>${label}<input type="${type}" name="${key}" value="${escapeHtml(settings[key] || "")}"></label>`).join("")}</div><label>Mô tả<textarea name="description" rows="4">${escapeHtml(settings.description || "")}</textarea></label><button class="primary-button" type="submit">Lưu thông tin</button></form>`;
  document.getElementById("settingsForm").onsubmit = async event => { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget).entries()); await set(ref(realtimeDb, "settings/salon"), payload); showToast("Đã lưu thông tin salon"); };
}

function renderActiveSection() { if (activeSection === "bookings") renderBookings(); else if (activeSection === "settings") renderSettings(); else renderCollection(activeSection); }

onAuthStateChanged(auth, user => { if (user) { loginPanel.classList.add("hidden"); dashboard.classList.remove("hidden"); document.getElementById("userLabel").textContent = user.email; renderActiveSection(); } else { loginPanel.classList.remove("hidden"); dashboard.classList.add("hidden"); } });

Object.keys({ services: true, combos: true, gallery: true, reviews: true, bookings: true, settings: true }).forEach(section => onValue(ref(realtimeDb, section), snapshot => { dataCache[section] = snapshot.val() || {}; if (!dashboard.classList.contains("hidden")) renderActiveSection(); }));
document.querySelectorAll(".tab").forEach(tab => tab.onclick = () => { activeSection = tab.dataset.section; document.querySelectorAll(".tab").forEach(item => item.classList.toggle("active", item === tab)); renderActiveSection(); });
document.getElementById("loginForm").onsubmit = async event => { event.preventDefault(); loginMessage.textContent = ""; const form = new FormData(event.currentTarget); try { await signInWithEmailAndPassword(auth, form.get("email"), form.get("password")); } catch (error) { console.error("Firebase login error:", error); loginMessage.textContent = `Đăng nhập thất bại (${error.code || "unknown-error"}). Kiểm tra Email/Password và tài khoản Firebase.`; } };
document.getElementById("logoutButton").onclick = () => signOut(auth);
