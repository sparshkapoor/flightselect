import type { BookingOption } from '@flightselect/shared';

// Google Travel booking links are POST-only — the redirect token lives in
// post_data (format: "u=<base64>"). A plain href GET to the same URL returns
// nothing. We create a transient hidden form, submit it into a new tab, then
// remove it immediately.
export function openBooking(opt: BookingOption): void {
  if (opt.postData && opt.url) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = opt.url;
    form.target = '_blank';
    form.rel = 'noopener noreferrer';

    // post_data is "key=value[&key=value...]" — split and add each as a hidden input
    for (const pair of opt.postData.split('&')) {
      const eq = pair.indexOf('=');
      if (eq === -1) continue;
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = pair.slice(0, eq);
      input.value = pair.slice(eq + 1);
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  } else if (opt.url) {
    window.open(opt.url, '_blank', 'noopener,noreferrer');
  }
}
