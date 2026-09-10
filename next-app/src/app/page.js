"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";

const money = value => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
const ordered = value => Object.entries(value || {}).map(([id, item]) => ({ id, ...item })).filter(item => item.active !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
const categoryLabel = { nail: "Nail", "goi-dau": "Gội đầu", headspa: "Gội đầu", massage: "Massage" };

function Media({ src, alt, fallback }) {
  return src ? <img className="media-image" src={src} alt={alt} /> : <div className="media-fallback">{fallback}</div>;
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [combos, setCombos] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [settings, setSettings] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const subscriptions = [
      ["services", setServices], ["combos", setCombos], ["gallery", setGallery], ["reviews", setReviews], ["settings/salon", setSettings]
    ].map(([path, setter]) => onValue(ref(realtimeDb, path), snapshot => setter(path === "settings/salon" ? snapshot.val() || {} : ordered(snapshot.val()))));
    return () => subscriptions.forEach(unsubscribe => unsubscribe());
  }, []);

  const visibleServices = services.filter(item => filter === "all" || item.category === filter || (filter === "headspa" && item.category === "goi-dau"));
  const salonName = settings.name || "Nail Studio";

  return <main>
    <header className="site-header"><a className="brand" href="#home"><strong>{salonName}</strong><span>Beauty & Relax</span></a><nav><a href="#services">Dịch vụ</a><a href="#pricing">Bảng giá</a><a href="#gallery">Bộ sưu tập</a><a href="#contact">Liên hệ</a></nav><a className="button" href="#booking">Đặt lịch</a></header>
    <section className="hero" id="home"><div className="hero-copy"><p className="eyebrow">NAIL • HEAD SPA • MASSAGE</p><h1>Đẹp từ đôi tay,<br /><em>thư giãn từ tâm hồn.</em></h1><p>Không gian làm đẹp và thư giãn dành cho bạn, với dịch vụ nail, gội đầu dưỡng sinh và massage.</p><a className="button" href="#services">Khám phá dịch vụ</a></div><div className="hero-art"><Media src={settings.heroImageUrl} alt="Không gian salon" fallback="ẢNH SALON" /></div></section>
    <section className="intro"><div><b>01</b><h3>Nail Care</h3><p>Chăm sóc và làm đẹp móng.</p></div><div><b>02</b><h3>Head Spa</h3><p>Gội đầu thư giãn, dưỡng sinh.</p></div><div><b>03</b><h3>Massage</h3><p>Thư giãn cơ thể trọn vẹn.</p></div></section>
    <section className="section soft" id="services"><div className="section-heading"><p className="eyebrow">SERVICES</p><h2>Dịch vụ nổi bật</h2><p>Những lựa chọn được cập nhật trực tiếp từ Firebase.</p></div><div className="filters">{[["all", "Tất cả"], ["nail", "Nail"], ["headspa", "Gội đầu"], ["massage", "Massage"]].map(([value, label]) => <button className={filter === value ? "active" : ""} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="card-grid">{visibleServices.map(item => <article className="card" key={item.id}><div className="card-media"><Media src={item.imageUrl} alt={item.name} fallback={`ẢNH ${categoryLabel[item.category] || "DỊCH VỤ"}`} /><span>{categoryLabel[item.category] || item.category}</span></div><div className="card-content"><small>Từ {money(item.price)} · {item.duration || 0} phút</small><h3>{item.name}</h3><p>{item.description}</p><a href="#booking">Đặt dịch vụ →</a></div></article>)}</div></section>
    <section className="section" id="pricing"><div className="section-heading"><p className="eyebrow">PRICE LIST</p><h2>Bảng giá</h2></div><div className="price-grid">{["nail", "goi-dau", "massage"].map(category => <div className="price-box" key={category}><h3>{categoryLabel[category]}</h3>{services.filter(item => item.category === category || (category === "goi-dau" && item.category === "headspa")).map(item => <div className="price-row" key={item.id}><span>{item.name}</span><b>{money(item.price)}</b></div>)}</div>)}</div></section>
    <section className="section dark" id="combo"><div className="section-heading light"><p className="eyebrow">COMBO</p><h2>Combo thư giãn & làm đẹp</h2></div><div className="card-grid">{combos.map(item => <article className="combo" key={item.id}><Media src={item.imageUrl} alt={item.name} fallback="ẢNH COMBO" /><p className="eyebrow">COMBO</p><h3>{item.name}</h3><p>{item.description}</p><strong>{money(item.price)}</strong><a className="button light-button" href="#booking">Đặt combo</a></article>)}</div></section>
    <section className="section" id="gallery"><div className="section-heading"><p className="eyebrow">GALLERY</p><h2>Bộ sưu tập & không gian</h2></div><div className="gallery">{gallery.map(item => <figure key={item.id}><Media src={item.imageUrl} alt={item.title} fallback="ẢNH SALON" /><figcaption>{item.title}</figcaption></figure>)}</div></section>
    <section className="section soft" id="reviews"><div className="section-heading"><p className="eyebrow">REVIEWS</p><h2>Khách hàng nói gì?</h2></div><div className="card-grid">{reviews.map(item => <blockquote className="review" key={item.id}><div>★★★★★</div><p>“{item.content}”</p><strong>{item.name}</strong></blockquote>)}</div></section>
    <section className="booking" id="booking"><div><p className="eyebrow">BOOKING</p><h2>Đặt lịch trải nghiệm</h2><p>Gọi {settings.phone || "salon"} để được tư vấn và giữ lịch.</p></div><a className="button" href={`tel:${settings.phone || ""}`}>Gọi đặt lịch</a></section>
    <footer id="contact"><div><strong>{salonName}</strong><p>{settings.description || "Nail • Gội đầu dưỡng sinh • Massage"}</p></div><p>{settings.address || "Địa chỉ salon"}<br />{settings.openingTime || "08:00"} – {settings.closingTime || "21:00"}</p></footer>
  </main>;
}
