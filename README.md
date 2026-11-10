# Syed Usman's portfolio

This is a static HTML, CSS, and JavaScript site. No build step is required.

## Preview locally

Use VS Code's Live Server, or run this command from the portfolio directory:

```powershell
python -m http.server 5500 --bind 127.0.0.1
```

Open http://127.0.0.1:5500. The contact form needs HTTP or HTTPS; opening
`index.html` directly as a `file://` URL cannot send messages.

## Activate contact email delivery once

The form uses [FormSubmit](https://formsubmit.co/) to forward messages to
**syedusman8299@gmail.com**. It does not need an API key or a mail app.

1. Submit a test message from the hosted site or local HTTP preview.
2. Open the FormSubmit confirmation email in that inbox. Check Spam too.
3. Click **Activate Form**. FormSubmit can then forward submissions.
4. Verify a submission arrives in the inbox before sharing the contact form.

FormSubmit requires that confirmation before forwarding messages. Its
[help page](https://formsubmit.co/help) explains activation and pending submissions.
Activation has not been completed or inbox delivery verified by the code checks.

The form posts in the background using `js/contact.js`. Success appears only
when the service explicitly accepts the request. Activation errors, failed
requests, and timeouts preserve the visitor's text. Without JavaScript, the
form uses a standard POST to FormSubmit.

The recipient is configured in the form's `action` in `index.html`. Changing
that address requires activation again.

## Page entrance

The existing navbar logo appears at the viewport center, travels into its
measured navbar position, then navigation and initially visible content enter
individually. `js/intro-boot.js` gates visibility before paint; `js/intro.js`
coordinates one GSAP timeline after fonts load. GSAP is served from `js/vendor/`.
The page keeps its original layout and background throughout.

Reduced motion, fragment links, restored scroll positions, and user interaction
skip or finish the intro immediately. Resizing during the logo's flight updates
its measurements; crossing the mobile menu breakpoint finishes the intro safely.
A failed script or stalled font load restores visibility through a safety deadline.

## Checks

```powershell
node --check js/main.js
node --check js/intro-boot.js
node --check js/intro.js
node --check js/contact.js
node --test tests/contact-form.test.cjs
```

The automated contact tests mock the email service and do not send real email.

Browser regressions use Playwright and Chromium (or installed Chrome/Edge):

```powershell
node --test tests/intro.test.cjs
```

The tests detect this Codex environment's bundled Playwright, or use a locally
installed `playwright` package. Set `CHROME_PATH` for another browser location.
They check three viewport sizes, logo alignment, reveal order, unchanged final
layout, reduced motion, interruption, resizing, and initialization recovery.
