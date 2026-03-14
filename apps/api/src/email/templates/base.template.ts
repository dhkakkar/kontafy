/**
 * Base HTML email wrapper with Kontafy branding.
 * Navy (#0F2D5E) and Green (#0A8A54) color palette.
 */
export function baseTemplate(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Kontafy</title>
  <style>
    body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { margin: 0; padding: 0; background-color: #f4f5f7; -webkit-font-smoothing: antialiased; }
    img { border: 0; display: block; outline: none; text-decoration: none; }
    a { color: #0A8A54; text-decoration: none; }
    .btn-primary {
      display: inline-block;
      padding: 12px 28px;
      background-color: #0F2D5E;
      color: #ffffff !important;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
    }
    .btn-primary:hover { background-color: #0b2249; }
    .btn-success {
      display: inline-block;
      padding: 12px 28px;
      background-color: #0A8A54;
      color: #ffffff !important;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
    }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 16px !important; }
      .content { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f4f5f7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding: 0 0 24px 0; text-align: center;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 16px 32px; background-color: #0F2D5E; border-radius: 12px 12px 0 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Kontafy</span>
                        </td>
                        <td style="text-align: right;">
                          <span style="font-size: 12px; color: #94a3b8;">Accounting made simple</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td class="content" style="background-color: #ffffff; border-radius: 0 0 12px 12px; padding: 32px; margin-top: -24px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                Sent by <a href="https://kontafy.in" style="color: #0A8A54; font-weight: 600;">Kontafy</a> — Cloud accounting for Indian businesses
              </p>
              <p style="margin: 0; font-size: 11px; color: #b0b8c4;">
                If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
