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
| Join crisis | Open flood mission → **Join Mission** | sam@volunteer.com |
| Rapid check-in | After join on flood mission → **Rapid check-in** (no code needed) | sam |
| NGO create crisis | `/ngo-crisis/create` or dashboard **Launch Crisis Mission** | save@earth.org |
| Broadcast alert | `/ngo-mission/<flood-id>` → **Broadcast alert** → opted-in volunteers get bell notification | save@earth.org → alex |
| Stand down / resolve | Mission hub → **Stand down** or **Resolve crisis** | save@earth.org |
| Crisis notification | Bell → crisis alert → opens event detail | alex |

---

### Admin

| Step | How to test | Account |
|------|-------------|---------|
| Stats & users | `/admin` — overview, suspend user (careful) | admin@gmail.com |
| NGO verification | Approve **Green Hope (Pending)** | admin@gmail.com |
| Impact moderation | Audit tab → report from volunteer → **Resolve** hides content | admin@gmail.com |
| Audit log | NGO status changes, deletions, flagged content | admin@gmail.com |

---

## Seeded data quick reference

| Item | Details |
|------|---------|
| **Beach Cleanup** | Completed, Alex+Maya checked-in, review, discussion, impact stories |
| **Community Kitchen** | Upcoming, shift slots, check-in code `HIVE2026` |
| **Tree Planting** | Upcoming, Maya joined, open spots |
| **First Aid Workshop** | Capacity 1 — Alex joined, **Maya waitlisted** |
| **Food Bank Friday** | Recurring series with instances, Sam on first instance |
| **Flood Relief — Colombo** | Active emergency, Alex joined, rapid check-in enabled |
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
