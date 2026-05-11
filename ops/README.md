# DAMPLab Canvas — ops

Infra-as-code for the two DAMPLab Canvas environments. This directory is the
authoritative source for both compose stacks; the live files on the EC2 boxes
are deployed copies of these.

> **TODO**: migrate this to a dedicated `hicsail/damplab-ops` repo once we're
> sure the layout is stable. Living under `damplab-ui` for now to avoid a
> single-commit chicken-and-egg during the prod rollout.

## Environments

| Env | EC2 | Public IP | UI | Backend (Cloudflare → :3000) | Image tags |
| --- | --- | --- | --- | --- | --- |
| Staging | `i-0f1c9bf9cfc90bf9a` (t2.small) | `54.211.117.78` | (legacy upstream) | `https://damplab-backend.sail.codes` | `:main` |
| Production | `i-05c55b9d6ae3de229` (t3.small) | `3.94.114.93` | `https://damplab-canvas.sail.codes/` | `https://damplab-canvas-backend.sail.codes` | `:prod` |

Both live in `us-east-1c`, VPC `vpc-242ec241`, subnet `subnet-eaa3e0c2`. Auth is
shared: production's backend points at the staging-resident Keycloak at
`https://damplab-keycloak.sail.codes` (realm `damplab`, client `damplabclient`).

The backend hostnames are Cloudflare-proxied with an **Origin Rule rewriting
the destination port to `3000`** — otherwise Cloudflare would forward to :80
which is the UI's nginx. Mirror this when adding new environments.

## Promotion model

```
push to main      ──►  CI builds :main  ──►  staging EC2 pulls :main on next deploy
git tag vX.Y.Z    ──►  release-prod CI promotes :main → :prod (and :vX.Y.Z)
manual dispatch   ──►  same, with custom source/version inputs
```

The release CI lives in each app repo, not here:
- [`hicsail/damplab-ui/.github/workflows/release-prod.yml`](https://github.com/hicsail/damplab-ui/blob/main/.github/workflows/release-prod.yml)
- [`hicsail/damplab-backend/.github/workflows/release-prod.yaml`](https://github.com/hicsail/damplab-backend/blob/main/.github/workflows/release-prod.yaml)

The two workflows differ on purpose because of how the apps are built:

- **`damplab-backend`** has no build args — the backend reads env at runtime
  from the compose file. The release workflow does a no-rebuild
  `docker buildx imagetools create` to retag `:main` → `:prod`. Fast
  (~10 s) and bit-identical to the tested staging image.
- **`damplab-ui`** is a Vite SPA, so the backend URL is baked into the JS
  bundle at build time. Retagging `:main` would give prod a bundle that calls
  the staging backend. The UI release workflow does a real `build-push-action`
  with `VITE_BACKEND=secrets.VITE_BACKEND_PROD` — currently
  `https://damplab-canvas-backend.sail.codes/graphql`. Keycloak settings are
  shared with staging so they reuse `secrets.VITE_KEYCLOAK_*` directly.

Repo secrets used by the UI release workflow:
- `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` (publish)
- `VITE_BACKEND_PROD` (prod-specific, baked into bundle)
- `VITE_KEYCLOAK_URL` / `VITE_KEYCLOAK_REALM` / `VITE_KEYCLOAK_CLIENT_ID`
  (shared with staging)

## Deploying

### Staging (auto on every push to main)
Today this is still a manual SSM `pull && up -d` from the dev's workstation:

```bash
aws ssm send-command --region us-east-1 \
  --instance-ids i-0f1c9bf9cfc90bf9a \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /home/ubuntu/damplab && sudo docker compose pull && sudo docker compose up -d"]'
```

Future work: make the build workflow auto-trigger SSM (needs a `DEPLOY_AWS_ROLE`
GH secret with `ssm:SendCommand` on the staging instance ID).

### Production (gated behind a tag or manual dispatch)
1. Promote: either push a `v*.*.*` tag on the app repo, or run the
   `Release to prod` workflow with `workflow_dispatch` (optionally pass a
   `version_tag`).
2. Once the workflow succeeds, pull on the prod EC2:

```bash
aws ssm send-command --region us-east-1 \
  --instance-ids i-05c55b9d6ae3de229 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["cd /home/ubuntu/damplab && sudo docker compose pull && sudo docker compose up -d"]'
```

Same workflow can also be triggered with a custom `source_ref` to promote a
specific feature branch or SHA tag.

## Layout

- `docker-compose.staging.yml` — staging stack (UI + backend + Mongo + Keycloak +
  Postgres + backup). **Image tags `:main`.**
- `docker-compose.prod.yml` — prod stack (UI + backend + Mongo + backup;
  **no Keycloak**, shared with staging). **Image tags `:prod`.**

Any change here that affects the live stack needs to be `scp`'d (or written via
SSM) to `/home/ubuntu/damplab/docker-compose.yml` on the matching box.

## Initial bootstrap of prod (already done, for reference)

```bash
# 1. SG with 22/80/443/3000 ingress
aws ec2 create-security-group --region us-east-1 \
  --group-name damplab-canvas-prod-security-group \
  --description "Ingress for damplab-canvas-prod" \
  --vpc-id vpc-242ec241

# 2. Launch instance (32 GB gp3, same VPC/subnet/AMI as staging)
aws ec2 run-instances --region us-east-1 \
  --image-id ami-084568db4383264d4 \
  --instance-type t3.small \
  --key-name zlch-sail-ec2 \
  --subnet-id subnet-eaa3e0c2 \
  --security-group-ids sg-09d81a19f57f2ece9 \
  --iam-instance-profile Name=instanceRole \
  --associate-public-ip-address \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":32,"VolumeType":"gp3"}}]'

# 3. Install Docker + Compose (via SSM, see ../scripts/bootstrap-ec2.sh if extracted)

# 4. Create external Mongo volume and write compose + .env to /home/ubuntu/damplab/
sudo docker volume create damplab-mongo
```

## Initial data seed

When the prod EC2 first came up its Mongo was empty. The catalog
(`damplabservices`, 60 docs) and bundle definitions (`bundles`, 6 docs) were
copied from staging via `mongodump --archive --gzip` → base64 over SSM →
`mongorestore`. Jobs, workflows, workflownodes, SOWs, invoices, comments, and
everything else started clean. Staging was read-only throughout — `mongodump`
doesn't mutate the source.

If you ever need to re-sync the catalog from staging to prod, the same
approach works. Stage:

```bash
aws ssm send-command --region us-east-1 --instance-ids i-0f1c9bf9cfc90bf9a \
  --document-name AWS-RunShellScript --parameters 'commands=[
    "sudo docker exec damplab-backend-db-1 mongodump --quiet --db damplab --collection damplabservices --archive --gzip > /tmp/services.archive 2>/dev/null",
    "sudo base64 -w0 /tmp/services.archive"
  ]'
```

Capture the base64 from the output, then on prod base64-decode into the
container and run `mongorestore --archive=... --gzip --nsInclude 'damplab.damplabservices'`.

## Known gaps / follow-ups

- **No staging Mongo backup.** The staging backup service only mounts the
  Keycloak Postgres volume. We rely on staging being recreatable. Prod has
  Mongo backed up to `s3://sail-data-backups/damplab-mongo-prod/`.
- **Shared Keycloak is on staging.** Tearing down the staging EC2 takes auth
  for both environments. If this becomes a real concern, move Keycloak to its
  own tiny instance (the compose service is portable).
- **No auto-deploy after a release-prod workflow.** We still need to manually
  `aws ssm send-command` to pull and recreate on the prod EC2 after the
  workflow succeeds. Future work: add a GH→AWS OIDC role with
  `ssm:SendCommand` on the two instance IDs and chain the SSM step into the
  workflow.
