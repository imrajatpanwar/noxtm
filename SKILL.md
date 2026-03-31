# Noxtm Platform - Technical Skill Reference

## Overview
Noxtm is a workspace management platform with CRM, team communication, marketing tools, and a Chrome extension (Findr) for company data extraction.

---

## Architecture

### Frontend
- **Framework**: React 18 (CRA with craco)
- **CSS**: Custom CSS modules (BEM-like naming), Bootstrap + Tailwind CSS (prefix: `tw-`)
- **UI Components**: shadcn/ui (Radix UI primitives), react-icons/fi (Feather Icons), lucide-react
- **State Management**: React Context (RoleContext, MessagingContext, ModuleContext)
- **Toasts**: sonner
- **Port**: 3000 (local), served via PM2 cluster on production

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT tokens (24-hour expiry), bcrypt password hashing, Google OAuth 2.0
- **Port**: 5001 (local), PM2 fork on production
- **Server**: Contabo VPS (185.137.122.61), PM2 process manager

### Chrome Extension (Findr)
- **Manifest**: V3 with side panel
- **Storage**: chrome.storage.local for auth tokens
- **Purpose**: Extract company data from websites, add contacts with autocomplete suggestions

---

## User Signup Flow

### Step 1: Email Entry
- Route: `/signup`
- Component: `Signup.js`
- UI: shadcn signup-05 style (centered card, logo, email input, "Create Account" button)
- Social login: Google OAuth, Apple (placeholder)

### Step 2: Account Details
- Collects: Full Name, Password (min 6 chars)
- Sends verification code via `/send-verification-code` API

### Step 3: Email Verification
- 6-digit code verification via `/verify-code` API
- On success: Stores JWT token + user data in localStorage
- Redirects to: `/company-setup`

### Step 4: Company Setup
- Route: `/company-setup`
- Component: `CompanySetup.js`
- Collects: Company Name, Email, Industry, Size, Website, Address, GSTIN
- API: `POST /api/company/setup`
- Creates Company model with user as Owner
- Redirects to: `/pricing` or `/dashboard` based on subscription

### Step 5: Pricing / Subscription
- Route: `/pricing`
- Plans: Starter (5 members), Pro+ (60 members), Advance (Unlimited)
- Payment: Razorpay integration
- Trial: 14-day free trial for Starter/Pro+

---

## Company Data Module

### Dashboard Component: `CompanyDataList.js`
- **Header**: Title + Stats (Added Today / Total) + Avatar Stack
- **Search/Filter Row**: Select-all checkbox + Search bar + Filter trigger button
- **Filter Drawer**: Industry, Assigned To, Min Contacts, Website, Date Added, Label, Sort Order
- **Active Filters Row**: Filter tags with "Clear all" + "Showing X of Y" (right-aligned)
- **Card List**: Expandable cards with company info, contacts, kebab menu
- **Card Header**: Checkbox, expand arrow, company name, labels (colored tags from contacts), industry badge, website, contact count, email/phone/linkedin, avatar, kebab menu
- **Edit Modal**: Popup modal (shadcn-style) with 2-column form grid for editing company details
- **Bulk Actions**: Multi-select with "Add Label" dropdown and "Clear" button (light minimalistic bar)

### Labels System
- **Model**: ContactLabel (name, color, companyId)
- **Management**: Workspace Settings > Labels tab (hex color picker)
- **Assignment**: Per-contact within company cards, bulk assignment via multi-select
- **Display**: Colored tags on card headers (aggregated from all contacts)

### API Endpoints
- `GET /company-data` - List companies (workspace-scoped via companyId)
- `POST /company-data` - Create company
- `PUT /company-data/:id` - Update company
- `DELETE /company-data/:id` - Delete company
- `PATCH /company-data/:id/bulk-labels` - Bulk label assignment
- `GET /company-data/labels` - List labels
- `POST /company-data/labels` - Create label
- `PUT /company-data/labels/:id` - Update label
- `DELETE /company-data/labels/:id` - Delete label

---

## Findr Chrome Extension

### Flow
1. User logs in via extension popup
2. Side panel opens with Add Company form (default view)
3. Company name input triggers autocomplete (local + API search)
4. If existing company selected: form fills with data, switches to edit mode
5. If new company: user fills details manually
6. Contacts added with name, email, phone, designation (text input), LinkedIn

### Key Files
- `panel.html` - Side panel markup
- `panel.js` - Core logic (suggestions, form handling)
- `panel.css` - Styling
- `manifest.json` - Extension config

### API Endpoints
- `GET /findr/company-data/suggestions?q=query` - Search companies by name
- `POST /findr/company-data` - Create/update company data

---

## Workspace Settings

### Tabs
- General, Members, Roles, Labels, Billing, Integrations
- **Labels Tab**: Create/edit/delete labels with hex color picker (`<input type="color">`)

---

## Authentication

### Endpoints
- `POST /api/register` - Register (invitation-based)
- `POST /api/login` - Login (returns JWT)
- `POST /api/logout` - Logout (clears cookie)
- `GET /api/auth/google` - Google OAuth redirect
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/google/one-tap` - Google One Tap
- `POST /send-verification-code` - Send email verification
- `POST /verify-code` - Verify code and create account

### Middleware
- `authenticateToken` - JWT validation
- `requireAdmin` - Admin role check
- `requirePermission(module)` - Module permission check
- `requireActiveSubscription` - Subscription validation

---

## Deployment

### Production Server
- **Host**: 185.137.122.61 (Contabo VPS)
- **SSH**: `ssh root@185.137.122.61` (password: host@admin)
- **Process Manager**: PM2
- **Processes**: noxtm-frontend (cluster), noxtm-backend (fork), noxtmstudio-backend (fork)

### Deploy Steps
```bash
cd /root/noxtm
git pull
cd Frontend && npm run build
pm2 restart all
```

### Local Development
```bash
# Frontend
cd Frontend && npm start  # Port 3000

# Backend
cd Backend && node server.js  # Port 5001
```

---

## Key Models

### User
- fullName, email, password, googleId, role, profileImage
- companyId (ref Company), subscription, permissions, access

### Company
- companyName, companyEmail, industry, size
- owner (ref User), members[], invitations[]
- subscription, billing, aiSettings

### CompanyData
- companyName, companyEmail, industry, website, linkedin, phone
- contacts[] (name, email, phone, designation, linkedin, labels)
- companyId (workspace scope), createdBy (ref User)

### ContactLabel
- name, color (hex), companyId (workspace scope)

---

## UI Design System
- **Style**: shadcn/ui inspired, minimalist black & white
- **Font**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI)
- **Colors**: Primary #09090b/#18181b, Muted #71717a, Border #e4e4e7, Background #f8fafc
- **Border Radius**: 8px (buttons/inputs), 12px (cards), 10px (logo containers)
- **Animations**: fadeIn, scale transforms for modals
