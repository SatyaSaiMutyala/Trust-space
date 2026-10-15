# Deploying TruSpace to AWS EC2

One server runs everything: **nginx** serves the built web app and forwards `/api` to the **Node API** (port 5001), which uses **MongoDB installed on the same server**. No sample data is loaded — the database starts empty and you create the first administrator yourself.

```
browser ──HTTPS──▶ nginx :443 ──┬── /        → web/dist (static files)
                                └── /api/*   → Node API 127.0.0.1:5001 ──▶ MongoDB 127.0.0.1:27017
```

## 1. Launch the instance

- **AMI:** Ubuntu Server 24.04 LTS · **Type:** t3.small or larger (MongoDB wants ≥ 2 GB RAM) · **Disk:** 20 GB+ gp3
- **Security group inbound:** 22 (SSH, your IP only), 80 and 443 (anywhere). **Do not open 27017 or 5001** — MongoDB and the API are only reached from inside the server.
- Attach an **Elastic IP** and point your domain's DNS A record (e.g. `truspace.trustlab.in`) at it.

## 2. Install Node 20, MongoDB, nginx

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx curl gnupg

# Node 20 (the project requires >=20 <21)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# MongoDB 8.0 Community
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```

## 3. Secure MongoDB

Create a user for the app (pick your own strong password):

```bash
mongosh --eval '
  db.getSiblingDB("truspace").createUser({ user: "truspace", pwd: "CHANGE-ME-strong-db-password", roles: [{ role: "readWrite", db: "truspace" }] })'
```

Then edit `/etc/mongod.conf` so it only listens locally and requires a login:

```yaml
net:
  port: 27017
  bindIp: 127.0.0.1
security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod
```

## 4. Get the code and configure the API

```bash
cd /opt && sudo git clone <your-repo-url> truspace && sudo chown -R $USER /opt/truspace
cd /opt/truspace/backend
npm ci --omit=dev
cp .env.example .env
```

Edit `backend/.env`:

| Setting | Value |
| --- | --- |
| `NODE_ENV` | `production` (add this line — it turns on secure cookies and blocks the sample-data seed) |
| `PORT` | `5001` |
| `CLIENT_URL` | `https://truspace.trustlab.in` (your domain) |
| `MONGODB_URI` | `mongodb://truspace:CHANGE-ME-strong-db-password@127.0.0.1:27017/truspace?authSource=truspace` |
| `JWT_SECRET` | a new long random value: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` — **not** the one from your laptop |
| `STORAGE_DRIVER` | `s3` (recommended — give the EC2 instance an IAM role with the policy in [backend/API.md](backend/API.md) and leave the AWS keys empty), or `local` (files in `backend/uploads` — include that folder in your backups) |
| `SEED_PASSWORD` | delete the line — not used in production |

Create the first administrator (the database is empty, so this is the only way in):

```bash
NODE_ENV=production npm run create-admin -- --email you@trustlab.in --name "Your Name"
```

It prints a generated password once — save it. Or set your own: `ADMIN_PASSWORD='...' npm run create-admin -- ...`.
Everyone else (staff, owners, franchise partners) is added from the app under **Portal access**.

Start the API and keep it running across reboots:

```bash
pm2 start src/server.js --name truspace-api
pm2 save && pm2 startup     # run the command it prints
curl http://127.0.0.1:5001/api/health    # → "database is connected"
```

## 5. Build the web app

```bash
cd /opt/truspace/web
npm ci
npm run build             # → web/dist
```

The web app calls `/api` on the same domain, so no extra setting is needed.

## 6. nginx + HTTPS

`/etc/nginx/sites-available/truspace`:

```nginx
server {
  listen 80;
  server_name truspace.trustlab.in;

  root /opt/truspace/web/dist;
  index index.html;
  client_max_body_size 25m;          # uploads are up to 20 MB

  location /api/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/truspace /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Free HTTPS certificate (renews automatically)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d truspace.trustlab.in
```

**HTTPS is required:** with `NODE_ENV=production` the sign-in cookie is marked secure, so browsers only send it over HTTPS. Over plain HTTP users would be signed out on every page reload.

## 7. Backups

```bash
# nightly dump at 02:00, keep 14 days
sudo mkdir -p /var/backups/truspace && sudo chown $USER /var/backups/truspace
( crontab -l 2>/dev/null; echo '0 2 * * * mongodump --uri="mongodb://truspace:CHANGE-ME-strong-db-password@127.0.0.1:27017/truspace?authSource=truspace" --archive=/var/backups/truspace/$(date +\%F).gz --gzip && find /var/backups/truspace -mtime +14 -delete' ) | crontab -
```

Copy the dumps off the server too (e.g. `aws s3 cp` to a backup bucket) — a backup on the same disk is lost with the instance.

## Updating

```bash
cd /opt/truspace && git pull
cd backend && npm ci --omit=dev && pm2 restart truspace-api
cd ../web && npm ci && npm run build
```

## Never run on the server

`npm run seed` replaces **all data** with the sample portfolio (it refuses to run when `NODE_ENV=production`). `npm run dev:memory` is a throwaway development database — use `pm2 start src/server.js` instead.
