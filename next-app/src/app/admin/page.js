"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { onValue, ref, remove, set, update } from "firebase/database";
import { auth, realtimeDb } from "@/lib/firebase";

const tabs = { services: "Dịch vụ", combos: "Combo thư giãn", gallery: "Bộ sưu tập & không gian", reviews: "Reviews", bookings: "Booking", settings: "Thông tin salon" };
const fields = {
  services: [["name", "Tên dịch vụ"], ["category", "Danh mục"], ["description", "Mô tả"], ["price", "Giá", "number"], ["duration", "Phút", "number"], ["imageUrl", "URL ảnh"]],
  combos: [["name", "Tên combo"], ["description", "Mô tả"], ["price", "Giá", "number"], ["duration", "Phút", "number"], ["imageUrl", "URL ảnh"]],
  gallery: [["title", "Tên ảnh"], ["category", "Danh mục"], ["imageUrl", "URL ảnh"]],
  reviews: [["name", "Tên khách hàng"], ["rating", "Số sao", "number"], ["content", "Nội dung"]],
};
const toItems = value => Object.entries(value || {}).map(([id, item]) => ({ id, ...item })).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
const money = value => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState("services");
  const [data, setData] = useState({});
  const [login, setLogin] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    if (!user) return undefined;
    const paths = Object.keys(tabs).map(path => onValue(ref(realtimeDb, path), snapshot => setData(current => ({ ...current, [path]: snapshot.val() || {} }))));
    return () => paths.forEach(stop => stop());
  }, [user]);

  async function submitLogin(event) {
    event.preventDefault(); setMessage("");
    try { await signInWithEmailAndPassword(auth, login.email, login.password); } catch (error) { setMessage(error.code || "Đăng nhập thất bại"); }
  }
  async function saveItem(event) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const payload = {};
    fields[active].forEach(([key, , type]) => { const value = form.get(key) || ""; payload[key] = type === "number" ? Number(value) : value; });
    payload.active = true; payload.sortOrder = editing?.sortOrder || toItems(data[active]).length + 1;
    try { await set(ref(realtimeDb, `${active}/${editing?.id || `item_${Date.now()}`}`), payload); setEditing(null); setMessage("Đã lưu"); } catch (error) { setMessage(error.message); }
  }
  async function saveSettings(event) { event.preventDefault(); const payload = Object.fromEntries(new FormData(event.currentTarget)); await set(ref(realtimeDb, "settings/salon"), payload); setMessage("Đã lưu thông tin salon"); }
  async function deleteItem(id) { if (window.confirm("Xóa mục này?")) await remove(ref(realtimeDb, `${active}/${id}`)); }
  async function changeBooking(id, status) { await update(ref(realtimeDb, `bookings/${id}`), { status }); }

  if (!user) return <main className="admin-page"><form className="login-card" onSubmit={submitLogin}><p className="eyebrow">NAIL STUDIO ADMIN</p><h1>Đăng nhập quản trị</h1><input type="email" placeholder="Email" value={login.email} onChange={event => setLogin({ ...login, email: event.target.value })} required /><input type="password" placeholder="Mật khẩu" value={login.password} onChange={event => setLogin({ ...login, password: event.target.value })} required /><button className="button" type="submit">Đăng nhập</button><p className="error">{message}</p></form></main>;

  const items = toItems(data[active]);
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">NAIL STUDIO ADMIN</p><h1>Trung tâm quản trị</h1><p>{user.email}</p></div><div><a className="admin-link" href="/">Xem website</a><button className="admin-link" onClick={() => signOut(auth)}>Đăng xuất</button></div></header><nav className="admin-tabs">{Object.entries(tabs).map(([key, label]) => <button className={active === key ? "active" : ""} key={key} onClick={() => { setActive(key); setMessage(""); }}>{label}</button>)}</nav>{message && <p className="notice">{message}</p>}
    {active === "settings" ? <form className="settings-card" onSubmit={saveSettings}>{[["name", "Tên salon"], ["phone", "Điện thoại"], ["address", "Địa chỉ"], ["openingTime", "Giờ mở cửa"], ["closingTime", "Giờ đóng cửa"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["zalo", "Zalo"], ["description", "Mô tả"]].map(([key, label]) => <label key={key}>{label}<input name={key} defaultValue={data.settings?.salon?.[key] || ""} /></label>)}<button className="button">Lưu thông tin</button></form> : active === "bookings" ? <section className="admin-table"><h2>Booking</h2><table><thead><tr><th>Khách</th><th>Dịch vụ</th><th>Ngày giờ</th><th>Trạng thái</th></tr></thead><tbody>{items.map(item => <tr key={item.id}><td>{item.name}<br />{item.phone}</td><td>{item.service}</td><td>{item.date} {item.time}</td><td><select value={item.status || "pending"} onChange={event => changeBooking(item.id, event.target.value)}><option value="pending">Chờ xử lý</option><option value="confirmed">Đã xác nhận</option><option value="completed">Hoàn thành</option><option value="cancelled">Đã hủy</option></select></td></tr>)}</tbody></table></section> : <section className="admin-table"><div className="admin-title"><div><h2>{tabs[active]}</h2><p>{items.length} mục trong Firebase</p></div><button className="button" onClick={() => setEditing({})}>+ Thêm</button></div><table><thead><tr>{(fields[active] || []).slice(0, 4).map(([key, label]) => <th key={key}>{label}</th>)}<th>Thao tác</th></tr></thead><tbody>{items.map(item => <tr key={item.id}>{(fields[active] || []).slice(0, 4).map(([key]) => <td key={key}>{key === "price" ? money(item[key]) : item[key]}</td>)}<td><button className="text-button" onClick={() => setEditing(item)}>Sửa</button><button className="text-button danger" onClick={() => deleteItem(item.id)}>Xóa</button></td></tr>)}</tbody></table></section>}
    {editing && <div className="admin-modal"><form className="editor-card" onSubmit={saveItem}><button className="close" type="button" onClick={() => setEditing(null)}>×</button><h2>{editing.id ? "Sửa" : "Thêm"} {tabs[active]}</h2>{(fields[active] || []).map(([key, label, type]) => <label key={key}>{label}{key === "description" || key === "content" ? <textarea name={key} defaultValue={editing[key] || ""} required /> : <input name={key} type={type || "text"} defaultValue={editing[key] || ""} required={key === "name"} />}</label>)}<button className="button">Lưu</button></form></div>}
  </main>;
}
