# DAMPLab Canvas — ops

Infra-as-code for the two DAMPLab Canvas environments. This directory is the
authoritative source for both compose stacks; the live files on the EC2 boxes
are deployed copies of these.

> **TODO**: migrate this to a dedicated `hicsail/damplab-ops` repo once we're
> sure the layout is stable. Living under `damplab-ui` for now to avoid a
> single-commit chicken-and-egg during the prod rollout.

## Environments

| Env | EC2 | Public IP | URL | Image tags |
| --- | --- | --- | --- | --- |
| Staging | `i-0f1c9bf9cfc90bf9a` (t2.small) | `54.211.117.78` | TBD (currently the legacy `canvas.damplab.org` upstream) | `:main` |
| Production | `i-05c55b9d6ae3de229` (t3.small) | `3.94.114.93` | `https://damplab-canvas.sail.codes/` | `:prod` |

Both live in `us-east-1c`, VPC `vpc-242ec241`, subnet `subnet-eaa3e0c2`. Auth is
shared: production points at the staging-resident Keycloak at
`https://damplab-keycloak.sail.codes`.

## Promotion model

```
push to main      ──►  CI builds :main  ──►  staging EC2 pulls :main on next deploy
git tag vX.Y.Z    ──►  release-prod CI promotes :main → :prod (and :vX.Y.Z)
manual dispatch   ──►  same, with custom source/version inputs
```

The release CI lives in each app repo, not here:
- [`hicsail/damplab-ui/.github/workflows/release-prod.yml`](https://github.com/hicsail/damplab-ui/blob/main/.github/workflows/release-prod.yml)
- [`hicsail/damplab-backend/.github/workflows/release-prod.yaml`](https://github.com/hicsail/damplab-backend/blob/main/.github/workflows/release-prod.yaml)

It's a no-rebuild `docker buildx imagetools create` — same digest, new tag —
so prod is **bit-identical to the tested staging image**. Side benefit: prod
promotions take ~10 seconds.

If you ever need a separate prod build with different `VITE_*` values, replace
the imagetools step with a `docker/build-push-action` and feed it from
`secrets.VITE_*_PROD`.

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

## Known gaps / follow-ups

- **No staging Mongo backup.** The staging backup service only mounts the
  Keycloak Postgres volume. We rely on staging being recreatable. Prod has
  Mongo backed up.
- **`:prod` images currently live only as local retags of `:main`** on the
  prod box. The first `release-prod` workflow run publishes them to Docker
  Hub properly. Until then, **don't run `docker compose pull` on prod** — it
  will fail with `not found` and leave the running containers untouched
  (they'd still be fine, but the recreate step won't have a fresh image).
- **Keycloak client redirect URIs** need `https://damplab-canvas.sail.codes/*`
  added before prod auth works end-to-end. Pending.
- **DNS for `damplab-canvas.sail.codes`** needs to point to `3.94.114.93`.
  Cloudflare, presumably — the existing `*.sail.codes` records are there.
- **UI build args.** The current prod UI image is identical to staging's, so
  its bundle calls whatever `VITE_BACKEND` was at CI time. If staging and prod
  need to talk to different backend hostnames, build prod separately (see the
  rationale comment in `release-prod.yml`).
