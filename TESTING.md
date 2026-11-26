# Hive — Full project testing guide

Use this checklist after seeding demo data and starting both servers.

## Setup

### 1. Start services

```bash
# Terminal 1 — MongoDB must be running locally (or use Atlas URI in .env)

# Terminal 2 — backend
cd backend
npm install
npm run dev          # http://127.0.0.1:5001

# Terminal 3 — frontend
cd frontend
npm install
npm run dev          # http://127.0.0.1:5173
```

### 2. Load demo data

```bash
cd backend
npm run seed:demo
```

Or admin + demo together:

```bash
npm run seed
```

### 3. Test accounts (password **`123456`** for all)

| Role | Email | Purpose |
|------|--------|---------|
| Admin | `admin@gmail.com` | NGO approval, users, audit, impact moderation |
| NGO (verified) | `save@earth.org` | Events, attendance, reports, impact stories |
| NGO (pending) | `pending@ngo.org` | Cannot use dashboard until admin approves |
| Volunteer | `alex@volunteer.com` | Main volunteer flow (verified, tagging ON) |
| Volunteer | `maya@volunteer.com` | Tagging consent OFF, on waitlist demo |
| Volunteer | `sam@volunteer.com` | Joined shifts + recurring instance |

---

## Feature checklist by area

### Auth & registration

| Step | How to test | Account |
|------|-------------|---------|
| Login | `/login` → dashboard by role | Any above |
| Volunteer register + verify | `/register` → check backend console for verify link in dev | New email |
| NGO register | Upload PDF → status **pending** | New NGO email |
| Pending NGO blocked | Login `pending@ngo.org` → should fail or block dashboard | pending@ngo.org |
| Admin approve NGO | `/admin` → NGOs tab → verify **Green Hope** | admin@gmail.com |

---

### Discovery & events (volunteer)

| Step | How to test | Account |
|------|-------------|---------|
| Map & list | `/discovery` — filter, search, map pins | alex@volunteer.com |
| Event detail | Open **Urban Tree Planting** — map, description, join | alex |
| Join mission | Join **Tree Planting** (Maya already joined) | sam@volunteer.com |
| Shift slots | Open **Community Kitchen** — pick Morning or Afternoon shift | sam |
| Waitlist | Open **First Aid Workshop (FULL)** — Maya waitlisted, Alex joined | maya / alex |
| Recurring instance | Discovery/calendar → **Food Bank Friday** instance → `/instance/:id` | sam |
| Leave mission | Leave an upcoming event you joined | sam |

---

### Volunteer dashboard & profile

| Step | How to test | Account |
|------|-------------|---------|
| Dashboard | `/dashboard` — joined missions, recommendations, notifications bell | alex |
| Profile | `/profile` — edit bio, interests, skills, availability | alex |
| Tagging consent | Settings tab → toggle **Allow NGOs to tag me** | alex / maya |
| Emergency opt-in | Profile → **Emergency availability** — toggle + radius | alex (seeded ON) |
| Activity timeline | Profile → tagged impact stories + completed beach mission | alex |
| Leaderboard | `/leaderboard` — hours/rankings | alex |
| Impact resume | `/resume` — download/view volunteer impact summary | alex |
| Check-in | `/check-in/:eventId` on **Community Kitchen** with code **`HIVE2026`** | alex (after join) |

---

### Event engagement (reviews & discussion)

| Step | How to test | Account |
|------|-------------|---------|
| Event discussion | `/event/<beach-id>` → scroll to discussion — seeded thread | alex |
| Post comment | Add comment or reply on any joined upcoming event | alex |
| Leave review | `/event/<beach-id>` — review after check-in (Alex already has one seeded) | alex |
| Mission media | Beach event page → impact stories gallery section | anyone logged in |

---

### NGO operations

| Step | How to test | Account |
|------|-------------|---------|
| NGO dashboard | `/ngo-dashboard` — stats, events list, feedback, impact section | save@earth.org |
| Create event | `/ngo-create` — map location, category, capacity | save@earth.org |
| Recurring series | Event form → recurring weekly series (optional new test) | save@earth.org |
| Mission hub | `/ngo-mission/<beach-id>` — stats, actions | save@earth.org |
| Mark completed | Mission hub → **Mark mission as completed** (upcoming events) | save@earth.org |
| Attendance | `/ngo-attendance/<kitchen-id>` — roster, check-in codes, hours | save@earth.org |
| Volunteers modal | Dashboard → Volunteers on an event → joined / waitlist | save@earth.org |
| Remove volunteer | Remove with optional message | save@earth.org |
| Volunteer insight | Click volunteer name → `/ngo-volunteer/:id` — history, badges | save@earth.org |
| Impact report CSV/PDF | Dashboard → Download report buttons | save@earth.org |
| Public NGO profile | `/ngo/<save-earth-user-id>` | logged out or volunteer |

---

### Impact Stories

| Step | How to test | Account |
|------|-------------|---------|
| Open feed | `/impact-feed` or dashboard **Impact Feed** | alex |
| All / My missions / Saved | Feed tabs — Alex saved beach story | alex |
| Like & comment | On **Beach Cleanup** public story | alex |
| Save & share | Save toggles; Share copies link | alex |
| Community story | **Behind the scenes** — visible if you joined beach mission | alex |
| Report post | Flag icon → admin moderation queue | alex |
| Volunteer addition | Submit text on beach story → NGO approves | maya → save@earth.org |
| Publish story | Dashboard → **Publish Impact Story** → pick mission | save@earth.org |
| Or mission hub | **Publish impact story** with `?eventId=` | save@earth.org |
| Quick wizard | Composer → **Quick: draft + tag all** | save@earth.org |
| Tag volunteers | Search name + **Tag all** (Alex yes, Maya consent OFF) | save@earth.org |
| Edit story | Pencil on own post — edit text, visibility, retag | save@earth.org |
| Notifications | Bell → click impact notification → opens feed focus | alex |

---

### Crisis Hub (Phase E-1)

| Step | How to test | Account |
|------|-------------|---------|
| Crisis Hub map | `/crisis` — active emergencies on map + mission list | alex |
| Discovery badge | `/discovery` — **Flood Relief — Colombo** shows Emergency badge, pinned first | alex |
| Dashboard banner | `/dashboard` — crisis banner when active missions exist | alex |
| Emergency opt-in | `/profile` → enable **Available for emergency deployments** | maya (off by default) |
| Join crisis | Open flood mission → acknowledge **field conditions** → **Join Mission** | sam@volunteer.com |
| Rapid check-in | After join on flood mission → **Rapid check-in** (no code needed) | sam |
| NGO create crisis | `/ngo-crisis/create` or dashboard **Launch Crisis Mission** | save@earth.org |
| Broadcast alert | `/ngo-mission/<flood-id>` → **Broadcast alert** → opted-in volunteers get bell notification | save@earth.org → alex |
| Stand down / resolve | Mission hub → **Stand down** or **Resolve crisis** | save@earth.org |
| Crisis notification | Bell → crisis alert → opens event detail | alex |

---

### Crisis Hub (Phase E-2)

| Step | How to test | Account |
|------|-------------|---------|
| Matched volunteers | `/ngo-mission/<flood-id>` → see match count before broadcast | save@earth.org |
| Targeted alert | Toggle **Target only volunteers with required skills** → broadcast | save@earth.org |
| Resource requests | Mission hub or event page → view food/blanket/water needs | alex |
| Pledge resources | Event detail → **Pledge support** on a resource | sam@volunteer.com |
| Post new need | Mission hub → **Post resource need** | save@earth.org |
| Deployment role | Join flood mission → select **How can you help?** role | sam |
| Partner NGOs | Mission hub → see **Red Cross Demo** as accepted partner | save@earth.org |
| Invite partner | Enter verified NGO email → **Invite** | save@earth.org → redcross@demo.org |
| Accept partner invite | Login **redcross@demo.org** → dashboard banner or bell → **Accept** | redcross@demo.org |

---

### Crisis Hub (Phase E-3)

| Step | How to test | Account |
|------|-------------|---------|
| Live updates | Mission hub → post situation update → volunteers see on event page | save@earth.org |
| Update notification | Joined volunteer receives **crisis_update** bell notification | alex |
| Emergency analytics | Mission hub → view deployed count, hours, response times | save@earth.org |
| Public summary | `/crisis/<flood-id>/summary` — transparency page (no login required) | anyone |
| Crisis Hub feed | `/crisis` — latest update snippet on mission card | alex |
| Resolve + draft | Mission hub → **Resolve crisis** → prompt to publish impact story | save@earth.org |
| Admin oversight | `/admin` → **Active Crises** tab → national view | admin@gmail.com |

---

### Admin

| Step | How to test | Account |
|------|-------------|---------|
| Stats & users | `/admin` — overview, suspend user (careful) | admin@gmail.com |
| NGO verification | Approve **Green Hope (Pending)** | admin@gmail.com |
| Impact moderation | Audit tab → report from volunteer → **Resolve** hides content | admin@gmail.com |
| Audit log | NGO status changes, deletions, flagged content | admin@gmail.com |

---

### Security logging & monitoring (R5)

Control C5 for risk R5 (OWASP A09:2025 – Security Logging & Alerting Failures, STRIDE: Repudiation), implementing Hive Information Security Policy §8 "Logging and Monitoring Policy". Automated tests: `cd backend && npm test` (`tests/r5-security-logging.test.js`).

| Step | How to test | Expected |
|------|-------------|----------|
| Failed login | `/login` as `alex@volunteer.com` with a wrong password | `/admin` → **Security** tab → event log shows `login failure` / `wrong password`, IP, `POST /api/auth/login → 401` |
| Refused request | Log in as alex, then in the browser console run `fetch('http://127.0.0.1:5001/api/admin/stats', { headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } })` | `access denied` / `role not permitted` with `requiredRoles: ["admin"]` |
| Rejected upload | `/register` as NGO and upload a `.txt` renamed to `.pdf` | `upload rejected` / `content signature mismatch` |
| Brute-force demo | Backend running, then `cd backend && npm run security:demo -- alex@volunteer.com 12` | 12 `login failure` events, **one** open alert per kind (account + IP), sidebar badge, bell notification `security_alert` for every active admin |
| Acknowledge | Security tab → type a review note → **Acknowledge** | Alert shows reviewer + time; `security alert acknowledged` event with `minutesOpen` (§8.3.7: within 24 h). A second acknowledge is refused |
| Tamper test | MongoDB Compass → `securityevents` → edit any field (e.g. `reason`) of one document → Security tab → **Verify integrity** (or `npm run security:verify`) | **Tampering detected** with the seq and `hash mismatch`; critical `Log integrity failure` alert + admin notification; CLI exits with code 1. Deleting a document shows `sequence gap`; deleting an `auditlogs` entry shows `audit entry deleted` |
| No secrets in logs | Expand any event row; open `backend/logs/security-events.log` | No passwords, JWTs, `Authorization` headers or verification tokens (verify-email URLs show `:redacted`) |

CLI checks: `npm run security:verify` exits **0** (intact), **1** (tampered) or **2** (could not run).

Security events cannot be edited or deleted through the app: the model refuses every update/delete operation and there is no such API route. Records expire only through the `retention_ttl` index.

| Env var (backend) | Default | Purpose |
|-------------------|---------|---------|
| `SECURITY_ALERT_THRESHOLD` | `10` | Failed/refused attempts per IP or account that open an alert |
| `SECURITY_ALERT_WINDOW_MINUTES` | `5` | Sliding window for the threshold |
| `SECURITY_LOG_RETENTION_DAYS` | `400` | TTL for security events; values below **365** are raised to 365 (§8.3.8) |
| `SECURITY_LOG_FILE` | `backend/logs/security-events.log` | JSON-lines copy of every event (git-ignored); `off` disables it |
| `TRUST_PROXY` | unset | Set only behind a reverse proxy (e.g. `1` or `loopback`), otherwise `X-Forwarded-For` is ignored so the logged IP cannot be forged |
| `SECURITY_VERIFY_INTERVAL_HOURS` | `24` | Scheduled chain verification (first run 1 minute after start-up); `0` disables it |

Residual risks: deleting the **newest** records cannot be detected from the chain alone (the JSON-lines file copy is the second source of evidence), and §8.3.9 requires server clocks to be synchronised with NTP.

---

## Seeded data quick reference

| Item | Details |
|------|---------|
| **Beach Cleanup** | Completed, Alex+Maya checked-in, review, discussion, impact stories |
| **Community Kitchen** | Upcoming, shift slots, check-in code `HIVE2026` |
| **Tree Planting** | Upcoming, Maya joined, open spots |
| **First Aid Workshop** | Capacity 1 — Alex joined, **Maya waitlisted** |
| **Food Bank Friday** | Recurring series with instances, Sam on first instance |
| **Flood Relief — Colombo** | Active emergency, Alex joined, rapid check-in, 3 resource requests, Red Cross partner |
| **Impact posts** | 1 public (tags Alex), 1 community-only, 1 pending Maya contribution |
| **Pending NGO** | `pending@ngo.org` for admin approval flow |

After seeding, event IDs are printed in the terminal — use them for `/event/:id` and `/ngo-mission/:id`.

---

## Common issues

| Problem | Fix |
|---------|-----|
| Empty discovery | Run `npm run seed:demo` |
| No crisis missions on map | Re-seed; flood mission must have `crisisStatus: active` |
| Rapid check-in disabled | Mission must be emergency + rapid deployment + active + joined |
| NGO cannot publish story | Mark mission **completed** + check volunteers in |
| Alex cannot like/comment on feed | Must be email verified + checked in on at least one mission |
| Maya not in tag list | She disabled tagging in profile settings |
| API errors | Backend on port **5001**, frontend `auth.ts` points to same |
| Pending NGO login | Expected until admin verifies |

---

## Suggested test order (30–45 min full pass)

1. **Seed** → login **admin** → approve pending NGO  
2. Login **alex** → discovery → join event → profile → leaderboard → resume  
3. **alex** → impact feed (All, My missions, Saved) → like, comment, save  
4. Login **save@earth.org** → attendance → mission hub → mark complete → publish story  
5. **maya** → submit volunteer addition → **Save Earth** approves  
6. **alex** → report a post → **admin** resolves  
7. **save@earth.org** → download impact report → volunteer insight page  
8. **alex** → `/crisis` → flood mission → rapid check-in; **save@earth.org** → broadcast alert / resolve  

This covers auth, discovery, join/waitlist/shifts, recurring instances, check-in, reviews, discussion, gamification, NGO ops, impact stories, crisis hub, and admin moderation.
