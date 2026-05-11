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
