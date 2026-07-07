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

# IMPORTANT: Pages direct-upload REPLACES the whole deployment. The bundle
# must contain EVERY PRD served on the domain, or the missing ones 404
# after deploy. Always copy all PRD sources — never a hand-picked subset.
cp tasks/prd-*.html tasks/prd-*.md "$DIST_DIR/tasks/"

# tasks-relative screenshots (materials PRD references screenshots/... )
if [[ -d "tasks/screenshots" ]]; then
    cp -R "tasks/screenshots" "$DIST_DIR/tasks/screenshots"
fi

# Top-level screenshot dirs referenced via ../screenshots/... from PRD htmls
for shots_dir in device-prd product-prd menu-tag-imprint-prd staff-prd; do
    if [[ -d "screenshots/$shots_dir" ]]; then
        cp -R "screenshots/$shots_dir" "$DIST_DIR/screenshots/$shots_dir"
    fi
done

# Landing page is a tracked source file, not an inline heredoc, so the
# deployed index always lists the full PRD catalog.
cp "scripts/prd_site_index.html" "$DIST_DIR/index.html"

echo "Verifying bundle: index links and screenshot references must resolve"
verify_failed=0

# 1) Every /tasks/*.html link on the landing page must exist in the bundle.
while IFS= read -r index_link; do
    [[ -z "$index_link" ]] && continue
    if [[ ! -f "$DIST_DIR${index_link}" ]]; then
        echo "MISSING page for index link: $index_link" >&2
        verify_failed=1
    fi
done < <(grep -oE 'href="/tasks/[^"]+"' "$DIST_DIR/index.html" | sed 's|href="||;s|"||' | sort -u)

# 2) Every non-inline screenshot reference in every PRD must resolve.
for prd_html in "$DIST_DIR"/tasks/prd-*.html; do
    while IFS= read -r ref; do
        [[ -z "$ref" ]] && continue
        resolved="$(python3 -c "import os,sys;print(os.path.normpath(os.path.join(sys.argv[1], sys.argv[2])))" "$DIST_DIR/tasks" "$ref")"
        if [[ ! -f "$resolved" ]]; then
            echo "MISSING asset: $(basename "$prd_html") -> $ref" >&2
            verify_failed=1
        fi
    done < <(grep -oE 'src="[^"]*screenshots/[^"]*"' "$prd_html" | grep -v 'data:image' | sed 's|src="||;s|"||' | sort -u)
done

if [[ "$verify_failed" -ne 0 ]]; then
    echo "Bundle verification failed; aborting deploy." >&2
    exit 1
fi

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
