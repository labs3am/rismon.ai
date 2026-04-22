// Shared Rismon.ai email brand helpers.
// Keep tokens in sync with src/index.css (dark theme, orange #f97316 accent, Inter).

export const BRAND = {
  name: "Rismon.ai",
  tagline: "Intent verification for AI-built apps",
  url: "https://rismon.ai",
  dashboardUrl: "https://rismon.ai/dashboard",
  privacyUrl: "https://rismon.ai/privacy",
  termsUrl: "https://rismon.ai/terms",
  sourceUrl: "https://github.com/labs3am/rismon.ai",
  fromAddress: "Rismon.ai <hello@rismon.ai>",
  replyTo: "hello@rismon.ai",
  // Palette
  bg: "#000000",
  card: "#0a0a0a",
  cardInner: "#111111",
  border: "#1a1a1a",
  borderSubtle: "#242424",
  text: "#f5f5f5",
  textMuted: "#a1a1aa",
  textDim: "#71717a",
  textFaint: "#52525b",
  accent: "#f97316",
  accentHover: "#ea580c",
  font: "'Inter','Helvetica Neue',Arial,sans-serif",
};

/** Wordmark — matches the site Logo: white "Rismon" + orange "." + white "ai". */
export function wordmark(size = 22): string {
  return `<span style="font-family:${BRAND.font};font-weight:700;font-size:${size}px;letter-spacing:-0.02em;color:#ffffff;line-height:1;">Rismon<span style="color:${BRAND.accent};">.</span>ai</span>`;
}

export function emailHeader(): string {
  return `
    <tr><td style="padding:28px 40px;text-align:center;border-bottom:1px solid ${BRAND.border};">
      ${wordmark(22)}
      <p style="margin:8px 0 0;font-family:${BRAND.font};font-size:11px;color:${BRAND.textMuted};letter-spacing:0.5px;text-transform:uppercase;">${BRAND.tagline}</p>
    </td></tr>`;
}

export function emailFooter(): string {
  return `
    <tr><td style="padding:24px 40px;text-align:center;border-top:1px solid ${BRAND.border};">
      <div style="margin:0 0 8px;">${wordmark(14)}</div>
      <p style="margin:0;font-family:${BRAND.font};font-size:12px;color:${BRAND.textFaint};">
        <a href="${BRAND.privacyUrl}" style="color:${BRAND.textFaint};text-decoration:underline;">Privacy</a>
        &nbsp;·&nbsp;
        <a href="${BRAND.termsUrl}" style="color:${BRAND.textFaint};text-decoration:underline;">Terms</a>
        &nbsp;·&nbsp;
        <a href="${BRAND.sourceUrl}" style="color:${BRAND.textFaint};text-decoration:underline;">Source</a>
      </p>
    </td></tr>`;
}

/** Wraps body content (a string of <tr>...</tr>) in the standard shell. */
export function emailShell(bodyRows: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};font-family:${BRAND.font};">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bg};padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:${BRAND.card};border-radius:14px;overflow:hidden;border:1px solid ${BRAND.border};">
        ${emailHeader()}
        ${bodyRows}
        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function ctaButton(label: string, url: string): string {
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:4px 0 8px;">
        <a href="${url}" style="display:inline-block;background-color:${BRAND.accent};color:#ffffff;font-family:${BRAND.font};font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px;">${label}</a>
      </td></tr>
    </table>`;
}