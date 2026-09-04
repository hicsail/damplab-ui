# DAMPLab Canvas — Claude notes

## Repos
- `hicsail/damplab-ui` (this repo) — Vite/React frontend
- `hicsail/damplab-backend` — NestJS/MongoDB backend, sibling checkout at `../damplab-backend`

## Environments

| Env | EC2 (us-east-1c) | UI | Backend (Cloudflare → :3000) | Image tag |
| --- | --- | --- | --- | --- |
| **Staging** | `i-0f1c9bf9cfc90bf9a` (t2.small) | (legacy upstream) | `https://damplab-backend.sail.codes` | `:main` |
| **Production** | `i-05c55b9d6ae3de229` (t3.small) | `https://damplab-canvas.sail.codes/` | `https://damplab-canvas-backend.sail.codes` | `:prod` |

Both share auth via the staging Keycloak at `https://damplab-keycloak.sail.codes`
(realm `damplab`, client `damplabclient`). Prod compose runs **only** UI +
backend + Mongo + Mongo-backup; staging additionally runs Keycloak + Postgres +
Keycloak-backup. Authoritative compose files in [`ops/`](./ops/).

## Deploy / release flow

```
push to main  ──►  CI builds :main  ──►  staging EC2: docker compose pull && up -d
git tag v*    ──►  release-prod CI promotes :main → :prod (and :v*)
manual run    ──►  same workflow with workflow_dispatch
```

The promotion is a no-rebuild `docker buildx imagetools create` — same digest,
new tag. Workflow files:
- [`.github/workflows/docker-image.yml`](./.github/workflows/docker-image.yml) — builds `:main` on push
- [`.github/workflows/release-prod.yml`](./.github/workflows/release-prod.yml) — promotes to `:prod`

After a release-prod run, deploy on the prod EC2:
```bash
aws ssm send-command --region us-east-1 \
  --instance-ids i-05c55b9d6ae3de229 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /home/ubuntu/damplab && sudo docker compose pull && sudo docker compose up -d"]'
```

(Staging uses the same command with instance ID `i-0f1c9bf9cfc90bf9a`.)

## Running a database migration

Backend migrations are one-shot CLI scripts under `damplab-backend/src/**/migrate-*.ts`,
compiled into the image (`dist/<dir>/migrate-*.js` — the layout is pinned by
`rootDir` in `tsconfig.build.json`, so it matches `start:prod`'s `node dist/main`).
They are never run at startup.

**Mongo is not reachable from a workstation** — neither `ops/docker-compose.prod.yml`
nor the staging compose publishes a port for `backend-db`. Migrations must run
inside the compose network, via SSM.

Run the migration from a **throwaway container on the new image, before swapping
the running app**. That way the new code never sees un-migrated data, and a bad
dry-run costs nothing because the running app has not changed.

```bash
TAG=main                        # :main for staging, :prod for production
INSTANCE=i-0f1c9bf9cfc90bf9a    # staging; prod is i-05c55b9d6ae3de229
SCRIPT=dist/job/migrate-job-contract-flow.js

run() {  # usage: run "<flags>"
  aws ssm send-command --region us-east-1 --instance-ids "$INSTANCE" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=[\"sudo docker run --rm --network damplab_default \
      -e MONGO_URI=mongodb://backend-db:27017/damplab \
      hicsail/damplab-backend:$TAG node $SCRIPT $1\"]"
}

# 1. Pull the new image. Does not restart anything.
aws ssm send-command --region us-east-1 --instance-ids "$INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /home/ubuntu/damplab && sudo docker compose pull"]'

run "--verify"   # 2. read-only: what would be blocked today
run "--dry"      # 3. read-only: what the migration would write
run ""           # 4. apply — read the report first
run "--verify"   # 5. confirm only the known-unfixable residue remains

# 6. Now start the new app.
aws ssm send-command --region us-east-1 --instance-ids "$INSTANCE" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /home/ubuntu/damplab && sudo docker compose up -d"]'
```

Read the dry-run report before applying. Every migration here is idempotent — a
second run reports `writes: 0` — and exits non-zero when its `failed` list is
non-empty. Those entries are rows no script can complete; hand that list to the
lab rather than letting them discover it.

Order: merge → `:main` → staging (steps 1–6) → smoke-test on staging → tag `v*`
→ `:prod` → prod (steps 1–6) → deploy prod UI.

## AWS access

IAM user `asad2` (account `135854645631`) has SSM access to both instances and
EC2/IAM rights used during the prod bootstrap. The bootstrap is documented in
[`ops/README.md`](./ops/README.md).

## Known gaps to clean up later

- Staging Mongo data is **not** backed up — only the Keycloak Postgres volume
  is. Prod has Mongo backup wired up to
  `s3://sail-data-backups/damplab-mongo-prod/`.
- Shared Keycloak still physically lives on the staging EC2. Tearing staging
  down takes auth for both envs. Movable if it becomes a concern.
- No auto-deploy after a `release-prod` workflow run — still need a follow-up
  `aws ssm send-command` to pull & recreate. Future: GH→AWS OIDC role.
- `ops/` lives in this repo for now; intent is to migrate to a dedicated
  `hicsail/damplab-ops` repo once the layout is stable.
