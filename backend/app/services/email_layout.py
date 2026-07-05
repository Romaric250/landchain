"""Responsive HTML email shell for LandChain (table-based, client-safe)."""

from app.core.config import settings

# Brand tokens (match frontend globals.css)
PRIMARY = "#111827"
SECONDARY = "#b45309"
ACCENT = "#f5e6c8"
BACKGROUND = "#ebe6dc"
SURFACE = "#faf7f2"
TEXT = "#374151"
MUTED = "#6b7280"

STRINGS = {
    "en": {
        "tagline": "Verify land before you pay",
        "footer_made": "Proudly built in Cameroon",
        "footer_disclaimer": (
            "LandChain is a verification and record-integrity platform. "
            "It does not replace the official government land registry or your legal land title."
        ),
        "visit_site": "Visit LandChain",
        "need_help": "Questions? Reply to this email or contact us via the website.",
    },
    "fr": {
        "tagline": "Vérifiez un terrain avant de payer",
        "footer_made": "Fièrement conçu au Cameroun",
        "footer_disclaimer": (
            "LandChain est une plateforme de vérification et d'intégrité des registres. "
            "Elle ne remplace ni le registre foncier officiel de l'État ni votre titre foncier légal."
        ),
        "visit_site": "Visiter LandChain",
        "need_help": "Des questions ? Répondez à cet e-mail ou contactez-nous via le site.",
    },
}


def cta_button(href: str, label: str) -> str:
    """Primary call-to-action button."""
    return f"""
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
  <tr>
    <td align="center" bgcolor="{SECONDARY}" style="border-radius:8px;background-color:{SECONDARY};">
      <a href="{href}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;
                font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
        {label}
      </a>
    </td>
  </tr>
</table>"""


def info_box(html: str, *, tone: str = "neutral") -> str:
    """Highlighted info / warning box."""
    borders = {
        "neutral": ACCENT,
        "success": "#bbf7d0",
        "warning": "#fde68a",
        "danger": "#fecaca",
    }
    bgs = {
        "neutral": "#fffbeb",
        "success": "#f0fdf4",
        "warning": "#fffbeb",
        "danger": "#fef2f2",
    }
    border = borders.get(tone, borders["neutral"])
    bg = bgs.get(tone, bgs["neutral"])
    return f"""
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:20px 0;border-left:4px solid {SECONDARY};background-color:{bg};border-radius:0 8px 8px 0;">
  <tr>
    <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:{TEXT};">
      {html}
    </td>
  </tr>
</table>"""


def wrap_email(content_html: str, *, locale: str, preheader: str = "") -> str:
    """Wrap inner HTML in a branded LandChain email layout."""
    loc = locale if locale in STRINGS else "fr"
    s = STRINGS[loc]
    site = settings.FRONTEND_URL.rstrip("/")
    logo_url = settings.EMAIL_LOGO_URL
    preheader_text = preheader.replace('"', "&quot;")

    return f"""<!DOCTYPE html>
<html lang="{loc}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>LandChain</title>
  <!--[if mso]><style type="text/css">body,table,td{{font-family:Arial,Helvetica,sans-serif!important;}}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:{BACKGROUND};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">{preheader_text}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:{BACKGROUND};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;width:100%;background-color:{SURFACE};border-radius:12px;
                      overflow:hidden;box-shadow:0 4px 24px rgba(17,24,39,0.08);">
          <!-- Header -->
          <tr>
            <td bgcolor="{PRIMARY}" style="background-color:{PRIMARY};padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="52" valign="middle" style="padding-right:14px;">
                    <img src="{logo_url}" alt="LandChain" width="48" height="48"
                         style="display:block;border:0;border-radius:10px;" />
                  </td>
                  <td valign="middle">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;
                              color:#ffffff;letter-spacing:-0.3px;">LandChain</p>
                    <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;
                              color:{ACCENT};letter-spacing:0.3px;">{s["tagline"]}</p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
                <tr><td height="3" bgcolor="{SECONDARY}" style="background-color:{SECONDARY};border-radius:2px;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;
                       line-height:1.65;color:{TEXT};">
              {content_html}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td bgcolor="#f3f0ea" style="background-color:#f3f0ea;padding:24px 32px;border-top:1px solid #e5e0d6;">
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:{MUTED};">
                {s["need_help"]}
              </p>
              <p style="margin:0 0 16px;">
                <a href="{site}" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;
                   color:{SECONDARY};text-decoration:none;">{s["visit_site"]} →</a>
              </p>
              <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:{MUTED};">
                {s["footer_disclaimer"]}
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:{MUTED};">
                © LandChain · {s["footer_made"]} 🇨🇲
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
