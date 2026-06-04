#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

USER_PRD_CUSTOM_DOMAIN_SET="${PRD_CUSTOM_DOMAIN+x}"
USER_PRD_CUSTOM_DOMAIN="${PRD_CUSTOM_DOMAIN-}"

if [[ -f ".env" ]]; then
    set -a
    # shellcheck disable=SC1091
    source ".env"
    set +a
fi

if [[ -n "$USER_PRD_CUSTOM_DOMAIN_SET" ]]; then
    PRD_CUSTOM_DOMAIN="$USER_PRD_CUSTOM_DOMAIN"
fi

PROJECT_NAME="${PRD_PAGES_PROJECT:-cofeplus-prd}"
PRODUCTION_BRANCH="${PRD_PAGES_BRANCH:-main}"
DIST_DIR="${PRD_DIST_DIR:-prd-site}"
CUSTOM_DOMAIN="${PRD_CUSTOM_DOMAIN-prd.cofeplus.dpdns.org}"
NPM_CACHE_DIR="${NPM_CONFIG_CACHE:-$ROOT_DIR/.tmp-npm-cache}"
WRANGLER_HOME="${WRANGLER_HOME:-$ROOT_DIR/.tmp-wrangler-home}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
    cat <<'MSG' >&2
Missing CLOUDFLARE_API_TOKEN.

Create a Cloudflare API token with:
- Account > Cloudflare Pages: Edit
- Zone > DNS: Edit, if you want the script/API to bind or verify a custom domain

Then put it in .env or export it before running this script.
MSG
    exit 1
fi

echo "Preparing PRD direct-upload bundle: $DIST_DIR"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/tasks" "$DIST_DIR/screenshots"

cp "tasks/prd-product-management-user-flow.html" "$DIST_DIR/tasks/"
cp "tasks/prd-product-management-user-flow.md" "$DIST_DIR/tasks/"
cp "tasks/prd-staff-management-user-flow.html" "$DIST_DIR/tasks/"
cp "tasks/prd-staff-management-user-flow.md" "$DIST_DIR/tasks/"
cp -R "screenshots/product-prd" "$DIST_DIR/screenshots/"
cp -R "screenshots/staff-prd" "$DIST_DIR/screenshots/"

cat > "$DIST_DIR/index.html" <<'HTML'
<!doctype html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>COFE+ PRD</title>
    <style>
        :root {
            color-scheme: light;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #17202a;
            background: #f6f7f8;
        }
        body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
        }
        main {
            width: min(720px, calc(100vw - 48px));
        }
        h1 {
            margin: 0 0 12px;
            font-size: 32px;
            line-height: 1.2;
        }
        p {
            margin: 0 0 24px;
            color: #5b6670;
            font-size: 16px;
            line-height: 1.7;
        }
        .links {
            display: grid;
            gap: 12px;
        }
        a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 44px;
            padding: 0 18px;
            border-radius: 6px;
            background: #0b6bcb;
            color: #fff;
            text-decoration: none;
            font-weight: 600;
        }
        a.secondary {
            background: #109c93;
        }
    </style>
</head>
<body>
    <main>
        <h1>COFE+ PRD</h1>
        <p>这里是独立的产品需求文档站点，和运营后台原型页面分开部署。</p>
        <div class="links">
            <a href="/tasks/prd-staff-management-user-flow.html" class="secondary">查看人员管理用户流程 PRD</a>
            <a href="/tasks/prd-product-management-user-flow.html">查看商品管理用户流程 PRD</a>
        </div>
    </main>
</body>
</html>
HTML

WRANGLER_ENV=(
    "HOME=$WRANGLER_HOME"
    "npm_config_cache=$NPM_CACHE_DIR"
    "CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN"
)

if [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    WRANGLER_ENV+=("CLOUDFLARE_ACCOUNT_ID=$CLOUDFLARE_ACCOUNT_ID")
fi

mkdir -p "$WRANGLER_HOME" "$NPM_CACHE_DIR"

echo "Checking Cloudflare auth"
env "${WRANGLER_ENV[@]}" npx wrangler whoami

echo "Ensuring Pages project exists: $PROJECT_NAME"
if ! env "${WRANGLER_ENV[@]}" npx wrangler pages project create "$PROJECT_NAME" --production-branch "$PRODUCTION_BRANCH"; then
    echo "Project create was skipped or already exists; continuing with deploy."
fi

echo "Deploying $DIST_DIR to Cloudflare Pages project: $PROJECT_NAME"
env "${WRANGLER_ENV[@]}" npx wrangler pages deploy "$DIST_DIR" \
    --project-name "$PROJECT_NAME" \
    --branch "$PRODUCTION_BRANCH"

if [[ -n "$CUSTOM_DOMAIN" ]]; then
    if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
        echo "Skipped custom domain binding because CLOUDFLARE_ACCOUNT_ID is not set."
        echo "Bind manually in Cloudflare Pages: $CUSTOM_DOMAIN"
    else
        echo "Ensuring custom domain is attached: $CUSTOM_DOMAIN"
        domains_url="https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT_NAME/domains"
        domains_json="$(curl --http1.1 -sS \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            "$domains_url")"

        domain_exists="$(printf '%s' "$domains_json" | DOMAIN_NAME="$CUSTOM_DOMAIN" node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); console.log((j.result||[]).some(d=>d.name===process.env.DOMAIN_NAME) ? "yes" : "no")})')"

        if [[ "$domain_exists" == "yes" ]]; then
            echo "Custom domain already exists: $CUSTOM_DOMAIN"
        else
            curl --http1.1 -sS \
                -X POST \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                --data "{\"name\":\"$CUSTOM_DOMAIN\"}" \
                "$domains_url"
            echo
            domains_json="$(curl --http1.1 -sS \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                "$domains_url")"
        fi

        zone_id="$(printf '%s' "$domains_json" | DOMAIN_NAME="$CUSTOM_DOMAIN" node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); const d=(j.result||[]).find(item=>item.name===process.env.DOMAIN_NAME); console.log(d?.zone_tag||"")})')"
        if [[ -z "$zone_id" ]]; then
            echo "Could not determine Cloudflare zone id for $CUSTOM_DOMAIN."
            exit 1
        fi

        echo "Ensuring DNS CNAME exists: $CUSTOM_DOMAIN -> $PROJECT_NAME.pages.dev"
        dns_url="https://api.cloudflare.com/client/v4/zones/$zone_id/dns_records"
        dns_json="$(curl --http1.1 -sS \
            -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            -H "Content-Type: application/json" \
            "$dns_url?name=$CUSTOM_DOMAIN")"
        dns_success="$(printf '%s' "$dns_json" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); console.log(j.success ? "yes" : "no")})')"

        if [[ "$dns_success" != "yes" ]]; then
            echo "Could not read DNS records. Make sure the token has Zone > DNS: Edit and Zone > Zone: Read."
            printf '%s\n' "$dns_json"
            exit 1
        fi

        dns_record_id="$(printf '%s' "$dns_json" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); console.log(j.result?.[0]?.id||"")})')"
        if [[ -z "$dns_record_id" ]]; then
            curl --http1.1 -sS \
                -X POST \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                --data "{\"type\":\"CNAME\",\"name\":\"$CUSTOM_DOMAIN\",\"content\":\"$PROJECT_NAME.pages.dev\",\"proxied\":true,\"ttl\":1}" \
                "$dns_url"
            echo
        else
            curl --http1.1 -sS \
                -X PUT \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                --data "{\"type\":\"CNAME\",\"name\":\"$CUSTOM_DOMAIN\",\"content\":\"$PROJECT_NAME.pages.dev\",\"proxied\":true,\"ttl\":1}" \
                "$dns_url/$dns_record_id"
            echo
        fi
    fi
fi

echo "Done."
echo "Staff PRD URL: https://$PROJECT_NAME.pages.dev/tasks/prd-staff-management-user-flow.html"
echo "Product PRD URL: https://$PROJECT_NAME.pages.dev/tasks/prd-product-management-user-flow.html"
if [[ -n "$CUSTOM_DOMAIN" ]]; then
    echo "Custom domain staff PRD URL: https://$CUSTOM_DOMAIN/tasks/prd-staff-management-user-flow.html"
fi
