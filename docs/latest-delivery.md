# Latest frontend delivery

Updated 2026-11-07. Brand: Nova Tale Hub.

## Changes

- Cinematic video landing, three original banners, offer ticker, particle headline and gold logo.
- Unified internal spacing, typography, forms and cards; silver personal and gold team badges.
- Member quota management, wallet overview, usage visualizations and project selection.
- Personal/team task filters and detail views; billing split into purchases, recharges, consumption and refunds.
- Canvas list and blank-canvas creation, user center, demo invoice requests, task notifications, support feedback with screenshots.

## Demo authentication

Visitors can browse the landing page. Internal features require demo login. Nonempty email and password simulate success and restore the requested feature. Registration and SMS are simulated. Session state is stored in sessionStorage for the current browser tab. This is not server authentication or access control for real data.

## Service boundaries

Payments, generation, plans, recharges, invoices and support remain frontend demos. Feedback is not sent to a support service; invoices are not issued. Member, quota and canvas changes are not backend persistence. The 7.5-discount offer is presentation copy, not connected to actual billing. Footer filing numbers, company and address are explicitly examples.

## Assets

Logo, banners, covers and the fictional support portrait were generated for this prototype. The video and poster were supplied through the user-designated reference page and are bundled in public/media without a LAN dependency. Alimama ShuHeiTi is bundled locally. Production publication can replace demonstration media and agreement placeholders with approved materials.

## Validation

- npm run build passed, including TypeScript checking.
- Production preview checks passed for landing assets/fonts, offer dialog, guest redirects, login return, refresh session, team usage/tasks, billing, membership, user center, assets, space switching and support.
- No source secret-pattern matches or machine-specific source paths found.
- Local reference screenshots, capture scripts, node_modules, dist and .hallmark records are excluded from this upload.
