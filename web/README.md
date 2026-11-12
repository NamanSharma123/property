# OZFIRSTCHOICE website

A fast, secure static website. It has no database and no plugins to keep updated, and it is free to host with HTTPS.

## Pages
| File | Page |
|---|---|
| `index.html` | Home: banner, services, stats, why us, process, call to action |
| `services.html` | Services, with one section per service, plus FAQ |
| `about.html` | Company background, stats, values |
| `case-studies.html` | Case studies (**currently samples, replace before launch**) |
| `contact.html` | Enquiry form, tap-to-call phone, email |
| `privacy-policy.html` | Privacy Policy (Australian Privacy Principles template) |
| `thank-you.html`, `404.html` | Form confirmation and "page not found" |

## Before launch: things to fill in
- [ ] **ABN**: search all files for `[insert ABN]`
- [ ] **Email**: the brief said `Ozfirstchoice.gmail.com`, and we assumed this means `ozfirstchoice@gmail.com`. We recommend a domain email such as `info@ozfirstchoice.com.au`.
- [ ] **Contact form key**: see "Contact form" below
- [ ] **Services list**: check that it matches what you offer
- [ ] **Case studies**: replace the 3 samples with real projects your clients have approved
- [ ] **Stats**: confirm 20+, 60+, 10+, 100%
- [ ] **Service area**: the Contact page says "Melbourne & Australia-wide". Change it if this is wrong.
- [ ] **Privacy policy**: have it reviewed

## Contact form (spam-protected, emails you)
1. Go to https://web3forms.com, enter the business email and copy the free **Access Key** they send you.
2. In `contact.html`, replace `YOUR_WEB3FORMS_ACCESS_KEY` with that key.

Spam protection: a hidden "honeypot" field blocks bots, and Web3Forms filters spam on its side as well. You can switch on hCaptcha in the Web3Forms dashboard if you need it. After a visitor submits the form, they see a thank-you message.

## How to update content (no coding knowledge needed)
Open the `.html` file in any text editor, such as Notepad or VS Code. Change only the **words between the tags**, then upload the file again.

- **Stats** (`index.html` and `about.html`): search for `EDIT STATS`. Each stat looks like this:
  `<span class="count" data-target="60">60</span>`. Change **both** numbers.
- **Phone or email**: search for `03 8015 8978` or the email address and replace every match (use Find & Replace across all files).
- **Brand colours**: in `assets/css/styles.css`, at the top (`--teal`, `--navy-800`, etc.).
- **Logo**: currently removed (text-only brand).
- **Images**: every graphic was drawn for this site, so there are no stock-photo licensing issues. If you add photos, take them from free-licence sites such as Unsplash or Pexels, or use your own.

> If you'd prefer to edit in a visual editor (no files at all), connect this folder to a hosting platform with an online editor, or we can move the design into WordPress later.

## Hosting & domain (free HTTPS)
Recommended: **Cloudflare Pages** or **Netlify**. Both are free and fast, and HTTPS is automatic.
1. Create an account, then choose *Add new site → Deploy manually* and drag this whole folder in.
2. Add the custom domain `ozfirstchoice.com.au`. Then, at your .com.au domain registrar, point the DNS to the host by following the steps the host shows you.
3. HTTPS turns on automatically within minutes.

## SEO & Google Search Console
- Every page already has its own title, meta description, canonical URL and social share image. There is also a `sitemap.xml` and a `robots.txt`.
1. Go to https://search.google.com/search-console, then *Add property → URL prefix* → `https://ozfirstchoice.com.au/`.
2. Choose the **HTML tag** method. Paste the tag into `index.html` where the comment says `Google Search Console`, upload the file again, then click Verify.
3. Under *Sitemaps*, submit `sitemap.xml`.

## Preview locally
```
python -m http.server 8000
```
Then open http://localhost:8000
