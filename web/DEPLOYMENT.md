# OZFIRSTCHOICE deployment

Prepared 12 November 2026 on the existing Sydney EC2 server.

- Instance: `i-027d38c918012a2f4` (`t3.small`, `ap-southeast-2`)
- Elastic IP: `3.104.70.151`
- Static files: `/var/www/ozfirstchoice`
- Nginx configuration: `/etc/nginx/sites-available/ozfirstchoice`
- Enabled through `/etc/nginx/sites-enabled/ozfirstchoice`
- Existing Investview frontend and API continue using their own virtual hosts.

## Domain and HTTPS

At the authoritative DNS provider (`pixel.dns-parking.com` and
`byte.dns-parking.com`), the user configured:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 3.104.70.151 |
| A | www | 3.104.70.151 |

Replace conflicting website A/AAAA/CNAME records, preserving email MX/TXT
records. AWS Route 53 does not currently host this domain's zone.

HTTPS was issued using Certbot. For future reference:

```sh
sudo certbot --nginx -d ozfirstchoice.com.au -d www.ozfirstchoice.com.au --redirect
sudo nginx -t
sudo certbot renew --dry-run
```

HTTP host routing was verified externally with curl's `--resolve` option;
home and contact returned 200, and a nonexistent page returned 404.
Public DNS was subsequently updated to `3.104.70.151` for both hostnames.
Certbot installed HTTPS with HTTP redirects for both hostnames. The current
certificate expires on 10 February 2027; automatic renewal is scheduled.

## Content outstanding

The contact form still contains `YOUR_WEB3FORMS_ACCESS_KEY` and cannot email
submissions until configured. Review the launch checklist in README.md,
including sample case studies and business details.

## Cost audit findings

- Cost Explorer denied `ce:GetCostAndUsage`, so actual billed totals are unavailable.
- Sydney CPU averaged approximately 0.3% over the preceding 14 days.
- Server memory usage was approximately 1.1 GiB of 3.8 GiB at inspection.
- A `t3.small` could reduce compute cost, but has only 2 GiB RAM and requires
  an instance stop/start. Load and memory should be monitored after resizing.
- Three unattached Mumbai Elastic IPs were identified: `13.235.169.146`,
  `3.6.13.50`, `43.204.63.223`. At $0.005/hour each, releasing all three
  would avoid approximately US$10.95 per 730-hour month, before taxes/credits.
  All three were released on 12 November 2026 with user approval.
- The separate Mumbai OCR instance, its 50 GiB volume, Elastic IP, and
  recovery AMI/snapshot were subsequently removed with explicit user approval.
  See `../MUMBAI_RETIREMENT.md`.
- Sydney has no NAT gateways or App Runner services. Its root volume is
  already gp3 (20 GiB).
- The frontend ECR repository has no lifecycle policy. Any cleanup should
  retain the deployed image and a useful rollback history.

With user approval, the Sydney instance was resized to `t3.small` on
12 November 2026. A persistent 1 GiB swap file was added for memory spikes.
The existing Elastic IP was retained. Compute cost is approximately half
the previous same-family size, excluding storage, IPv4, traffic, and taxes.
After restarting, both websites, the API health endpoint, and Django admin
login returned HTTP 200. HTTP on the new domain redirects to HTTPS (301).
