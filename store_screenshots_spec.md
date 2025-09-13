# 🖼️ Store Screenshots Specification — SAMIA‑TAROT
_Last updated: 2025-09-13 12:09:41Z_

> Goal: Complete **required** and **recommended** screenshots for App Store (iOS/iPadOS) and Google Play (phones/tablets), **without any theme/UX changes**. Keep assets consistent with current design.

---

## 1) Apple App Store (App Store Connect)

### Required Sets (pick the devices you support; cover at least one iPhone size)
**iPhone 6.7‑inch (Pro Max)** — 1290×2796 px (portrait)  
**iPhone 6.5‑inch** — 1242×2688 px (portrait)  
**iPad Pro (6th gen) 12.9‑inch** — 2048×2732 px (portrait)

> Apple accepts either portrait or landscape, but be consistent. **Arabic (RTL)** variants must read right‑to‑left.

**Count**: 5 screenshots per device size (recommended 6–10 if available).

**Content suggestions (keep theme as‑is)**
1. Home / Daily Horoscopes (Today only, Approved)  
2. Create Order → Services list (Tarot/Coffee/Astro/Healing/Direct Call)  
3. Reader Result delivery (audio card)  
4. Monitor/Approval flow (for internal preview; if excluded from public, use generic approved views)  
5. Privacy & 18+ gating (consent/age screens)  
6. (Optional) Calls scheduling (availability)  

**File format**: PNG (no transparency), sRGB, < 10MB per image.  
**Localization**: EN & AR (RTL). Avoid tiny fonts; keep labels inside safe areas.

### Optional
- App Preview video (portrait, <30s).

---

## 2) Google Play Store

### Required Sets
**Phone** — 1080×1920 px (portrait)  
**Tablet (7")** — 600×1024 px (portrait)  
**Tablet (10")** — 1200×1920 px (portrait)

**Count**: Minimum 4 per class; recommended 8–10 across devices.

**Content suggestions**
Same as iOS list above (Home, Create Order, Delivery, Compliance).

**File format**: PNG or JPEG, < 8MB per image.  
**Localization**: EN & AR (RTL).

### 2.1 Feature Graphic
- **Size**: 1024×500 px (landscape), JPG/PNG.  
- **No UI changes** — reuse brand elements already in theme.

---

## 3) Production Notes (both stores)
- **No theme/UX changes** — screenshots must reflect the existing UI exactly.  
- Use **device frames** only if consistent with platform guidelines.  
- Ensure **age rating (18+)** and **privacy** messaging is coherent with manifests.  
- Avoid showing PII.  
- Check text legibility and contrast; keep within safe margins.  
- Validate RTL alignment (Arabic) in all AR screenshots.

---

## 4) Delivery Checklist
- [ ] iPhone 6.7" — 5+ screenshots (EN + AR)  
- [ ] iPhone 6.5" — 5+ screenshots (EN + AR)  
- [ ] iPad 12.9" — 5+ screenshots (EN + AR)  
- [ ] Android Phone — 4+ screenshots (EN + AR)  
- [ ] Android Tablet 7" — 4+ screenshots (EN + AR)  
- [ ] Android Tablet 10" — 4+ screenshots (EN + AR)  
- [ ] Google Play **Feature Graphic** 1024×500  
- [ ] Metadata captions localized (EN/AR) and RTL validated  
- [ ] Exif scrubbed; file sizes under platform limits

---

## 5) Submission Hints
- Keep captions honest (no misleading claims).  
- Make sure any 18+ references match actual gating in the app.  
- If a screen is internal‑only (e.g., Monitor), do **not** use it for store screenshots; instead show user‑facing equivalents.

