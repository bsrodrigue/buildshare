from __future__ import annotations

import base64
import io

import qrcode
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from app.config import settings

router = APIRouter()

LOGO_B64 = "data:image/png;base64,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"

LANDING_TEMPLATE = """\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>BuildShare — Internal Android Build Distribution</title>
<meta name="description" content="Self-hosted APK distribution platform. Upload Android builds, manage versioned releases, and distribute to your team on infrastructure you control.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #1a1a2e;
    background: #f8fafc;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }}
  .container {{ max-width: 720px; margin: 0 auto; padding: 0 24px; }}
  header {{
    padding: 24px 0;
    border-bottom: 1px solid #e2e8f0;
    background: rgba(255,255,255,0.8);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 50;
  }}
  header .container {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  header img {{ display: block; width: 40px; height: 40px; border-radius: 8px; }}
  header h1 {{
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 1.25rem;
    color: #2563eb;
  }}
  main {{ flex: 1; }}
  .hero {{
    text-align: center;
    padding: 80px 0 48px;
  }}
  .hero h2 {{
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 2.5rem;
    line-height: 1.15;
    margin-bottom: 24px;
  }}
  @media (min-width: 640px) {{
    .hero h2 {{ font-size: 3.25rem; }}
  }}
  .hero h2 span {{
    display: block;
    color: #2563eb;
  }}
  .hero p {{
    font-size: 1.125rem;
    line-height: 1.7;
    color: #64748b;
    max-width: 560px;
    margin: 0 auto 40px;
  }}
  .hero .tags {{
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-bottom: 48px;
  }}
  .hero .tags span {{
    font-size: 0.75rem;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 999px;
    background: #e0e7ff;
    color: #4338ca;
    letter-spacing: 0.01em;
    text-transform: uppercase;
  }}
  .qr-section {{
    text-align: center;
    padding: 0 0 64px;
  }}
  .qr-section h3 {{
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 1.125rem;
    margin-bottom: 8px;
    color: #1a1a2e;
  }}
  .qr-section p {{
    font-size: 0.875rem;
    color: #64748b;
    margin-bottom: 28px;
  }}
  .qr-box {{
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: #fff;
    border: 2px solid #e2e8f0;
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.04);
  }}
  .qr-box img {{
    display: block;
    width: 224px;
    height: 224px;
    border-radius: 8px;
  }}
  .qr-box .url-label {{
    font-size: 0.75rem;
    color: #94a3b8;
    font-family: 'SF Mono', 'Fira Code', monospace;
    max-width: 240px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }}
  .details {{
    padding: 64px 0;
    border-top: 1px solid #e2e8f0;
  }}
  .details h3 {{
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 1.5rem;
    margin-bottom: 24px;
    text-align: center;
  }}
  .features {{
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }}
  @media (max-width: 480px) {{
    .features {{ grid-template-columns: 1fr; }}
  }}
  .feature {{
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 24px;
    text-align: left;
  }}
  .feature h4 {{
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 8px;
  }}
  .feature p {{
    font-size: 0.875rem;
    color: #64748b;
    line-height: 1.6;
  }}
  .problem {{
    background: #fff;
    border: 1px solid #fecaca;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }}
  .problem h4 {{ font-family: 'Space Grotesk', sans-serif; font-weight: 600; margin-bottom: 12px; color: #991b1b; }}
  .problem ul {{ list-style: none; }}
  .problem li {{
    font-size: 0.875rem;
    color: #64748b;
    padding: 4px 0;
    padding-left: 20px;
    position: relative;
  }}
  .problem li::before {{
    content: "!";
    position: absolute;
    left: 0;
    font-weight: 700;
    color: #dc2626;
  }}
  footer {{
    padding: 24px 0;
    border-top: 1px solid #e2e8f0;
    text-align: center;
    font-size: 0.8125rem;
    color: #94a3b8;
  }}
</style>
</head>
<body>
<header>
  <div class="container">
    <img src="{logo}" alt="BuildShare logo" width="40" height="40">
    <h1>BuildShare</h1>
  </div>
</header>
<main>
  <section class="hero container">
    <h2>
      Internal Android Build<br>
      <span>Distribution for Teams</span>
    </h2>
    <p>
      Upload APK binaries, organize them by project, and distribute versioned
      releases to testers &mdash; all on infrastructure you control.
    </p>
    <div class="tags">
      <span>Self-hosted</span>
      <span>APK distribution</span>
      <span>Release management</span>
      <span>Access control</span>
    </div>
  </section>
  <section class="qr-section container">
    <h3>Connect your device</h3>
    <p>Scan to configure the mobile client with this server</p>
    <div class="qr-box">
      <img src="{qr_data_uri}" alt="QR Code for server URL">
      <span class="url-label">{server_url}</span>
    </div>
  </section>
  <section class="details">
    <div class="container">
      <div class="problem">
        <h4>The problem</h4>
        <ul>
          <li>No single source of truth &mdash; testers hunt through Slack threads for the latest build</li>
          <li>No version history &mdash; when a regression appears, reproducing the exact artifact is impossible</li>
          <li>No access control &mdash; anyone with a link can download internal builds</li>
          <li>Manual metadata extraction &mdash; package names and version codes verified by hand</li>
        </ul>
      </div>
      <h3>Why self-host?</h3>
      <div class="features">
        <div class="feature">
          <h4>Project-centric</h4>
          <p>Every binary belongs to a project. Access is governed by explicit membership roles &mdash; ADMIN or MEMBER.</p>
        </div>
        <div class="feature">
          <h4>Async processing</h4>
          <p>APK metadata parsing, hashing, and release creation happen in a background worker. The API stays snappy.</p>
        </div>
        <div class="feature">
          <h4>Your data, your rules</h4>
          <p>Binaries never touch third-party servers. Deploy on a LAN, a VPS, or a Raspberry Pi.</p>
        </div>
        <div class="feature">
          <h4>Storage agnostic</h4>
          <p>APK files on local disk, S3, or any S3-compatible object store &mdash; switch with a config toggle.</p>
        </div>
        <div class="feature">
          <h4>Auditable pipeline</h4>
          <p>Every upload creates a TaskJob with full lifecycle tracking: pending, processing, success, or failure.</p>
        </div>
        <div class="feature">
          <h4>Team ready</h4>
          <p>Invite collaborators, control access, and distribute builds directly to devices via a dedicated mobile client.</p>
        </div>
      </div>
    </div>
  </section>
</main>
<footer>
  <div class="container">BuildShare &mdash; open source APK distribution platform</div>
</footer>
</body>
</html>
"""


def _generate_qr_data_uri(data: str) -> str:
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a1a2e", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


@router.get("/", response_class=HTMLResponse, include_in_schema=False)
async def landing(request: Request):
    server_url = settings.PUBLIC_URL or str(request.base_url).rstrip("/")
    qr_data_uri = _generate_qr_data_uri(server_url)
    html = LANDING_TEMPLATE.format(
        logo=LOGO_B64,
        qr_data_uri=qr_data_uri,
        server_url=server_url,
    )
    return HTMLResponse(content=html)
