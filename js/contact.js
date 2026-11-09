/* Contact delivery is independent of the portfolio's visual enhancements. */
(() => {
    const form = document.getElementById('contact-form');
    if (!form) return;
    const button = document.getElementById('contact-submit');
    const buttonLabel = document.getElementById('contact-submit-label');
    const fields = document.getElementById('contact-fields');
    const status = document.getElementById('contact-status');
    const controls = ['name', 'email', 'message'].map(name => form.elements.namedItem(name));
    let sending = false;

    function showStatus(message, state) {
        status.textContent = message;
        status.dataset.state = state;
    }

    controls.forEach(control => {
        control.addEventListener('input', () => control.setCustomValidity(''));
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending) return;

        // Whitespace alone must not pass a required name or message field.
        controls.forEach(control => {
            control.value = control.value.trim();
            control.setCustomValidity(control.value ? '' : 'Please complete this field.');
        });
        if (!form.reportValidity()) return;
        if (!['http:', 'https:'].includes(window.location.protocol)) {
            showStatus('Open this portfolio through Live Server or its hosted website to send a message. Your text is still here.', 'error');
            return;
        }
        if (navigator.onLine === false) {
            showStatus("You're offline. Reconnect and try again. Your message is still here.", 'error');
            return;
        }

        const payload = Object.fromEntries(new FormData(form));
        if (String(payload._honey || '').trim()) {
            showStatus('Unable to submit this form. Please refresh the page and try again.', 'error');
            return;
        }
        payload._subject = 'New portfolio message for Syed Usman';
        payload._url = window.location.origin + window.location.pathname;

        // Native POST is the no-JavaScript fallback; AJAX keeps visitors here.
        const endpoint = new URL(form.action);
        endpoint.pathname = '/ajax' + endpoint.pathname;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 20000);
        sending = true;
        fields.disabled = true;
        button.disabled = true;
        buttonLabel.textContent = 'Sending…';
        form.setAttribute('aria-busy', 'true');
        showStatus('Sending your message…', 'sending');

        try {
            const response = await fetch(endpoint.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                credentials: 'omit',
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            const result = await response.json();
            const providerMessage = typeof result?.message === 'string' ? result.message : '';
            if (/activat|confirm.{0,40}(?:email|form)/i.test(providerMessage)) {
                showStatus('This contact form is awaiting email verification. Please use the email address alongside for now. Your message is still here.', 'error');
                return;
            }
            // FormSubmit can return HTTP 200 with success: "false".
            if (!response.ok || (result?.success !== true && result?.success !== 'true')) {
                throw new Error('Message was not accepted by the email service.');
            }
            form.reset();
            showStatus("Message submitted successfully. Thanks for reaching out—I'll reply by email.", 'success');
        } catch (error) {
            const message = error.name === 'AbortError'
                ? "The request timed out, so I couldn't confirm your message was sent. Your text is still here; please try again or use the email address alongside."
                : "I couldn't confirm your message was sent. Please try again or use the email address alongside. Your text is still here.";
            showStatus(message, 'error');
        } finally {
            window.clearTimeout(timeout);
            sending = false;
            fields.disabled = false;
            button.disabled = false;
            buttonLabel.textContent = 'Send message';
            form.removeAttribute('aria-busy');
        }
    });
})();
