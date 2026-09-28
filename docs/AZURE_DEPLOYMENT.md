# Azure deployment — isolated PeopleMatrix lab

> **THIS APPLICATION IS INTENTIONALLY VULNERABLE. DO NOT EXPOSE IT TO THE PUBLIC INTERNET OR CONNECT IT TO PRODUCTION SYSTEMS.**

This guide describes a **single dedicated Azure VM** for an authorized, isolated assessment lab. It is an infrastructure plan, not an instruction to deploy now; no Azure resources should be created as part of this documentation task. Do not use production subscriptions, networks, identity providers, data, or shared production hosts.

## Required network shape

- Place the VM in a dedicated, isolated Virtual Network (VNet) and private subnet used only for this lab.
- Do not assign a public IP to the lab VM. Do not create a public load balancer, public application endpoint, or route that exposes the VM to the Internet.
- Reach the VM through an approved private connectivity path, such as the organization's VPN or a separately managed private access/bastion arrangement.
- Apply a Network Security Group (NSG) to the appropriate subnet or VM network interface. If a management rule is needed, allow SSH (`TCP/22`) only from the VPN CIDR or specifically known assessor/administrator source IPs. Never use `Any`, `Internet`, `0.0.0.0/0`, or `::/0` as the source.
- Do not create inbound NSG rules for the application (`8088` by default), backend, or PostgreSQL. Do not publish backend/PostgreSQL ports. Keep outbound routes and rules limited to what the isolated VM requires for approved administration and image/package retrieval.
- Use subnet- and NIC-level controls consistently; verify their effective rules do not permit a broader path than intended.

## VM and application setup

Use one Azure VM sized for the expected lab load and dedicated to PeopleMatrix. Apply the organization's hardened Linux baseline, patch it before the lab, restrict administrator access, and enable appropriate host logging. Do not install unrelated workloads or attach production roles, credentials, or data stores.

Install Docker Engine and the Compose plugin using an approved source. Retrieve the application from an approved private repository or artifact source. On the VM, follow the root [`README.md`](../README.md) for `.env` creation, secret generation, Compose startup, health checks, and reset safeguards. The planned Docker exposure is strictly loopback-only: `127.0.0.1:${LAB_PORT:-8088}:8080` for nginx/React; backend and PostgreSQL have no published ports and remain on the Compose internal network.

The lab uses synthetic data only. Generate `POSTGRES_PASSWORD` and `SESSION_SECRET` independently with `openssl rand -hex 32`, store them in the VM's protected `.env`, and never commit or distribute them. Do not store the private answer key or scoring guide in the web root, container image, or candidate-accessible location.

## Authorized access through SSH tunnel

An authorized assessor first connects through the private VPN/access path and then establishes a local port forward to the VM's loopback-bound frontend:

```sh
ssh -N -L 8088:127.0.0.1:8088 <authorized-vm-user>@<private-vm-host>
```

Browse to `http://127.0.0.1:8088` on the authorized workstation while the tunnel is open. If `LAB_PORT` differs from 8088, adjust the forwarding target accordingly. A candidate access route, if required, must be explicitly approved and controlled; it must not create public ingress or bypass the isolated network boundary.

## Operations and safeguards

- Confirm the VM is the single lab VM and has no public application ingress before each assessment.
- Review the Compose health checks and verify only the loopback frontend binding is published.
- Provide candidates only Employee and Manager accounts; see [`PHASE2_SETUP.md`](PHASE2_SETUP.md). Keep administrator credentials, audit access, answer key, and scoring guide restricted.
- Review audit events using the role-protected `/api/v1/audit` endpoint or application Audit UI with a system administrator account.
- Reset only with `LAB_ISOLATED_DB=1 ./scripts/reset-lab.sh` from an interactive administrator session after verifying the dedicated lab target. The guard and confirmation are mandatory; the operation is intended to destroy only the dedicated Compose lab volume and reseed it.
- On completion, revoke candidate access, retain or delete lab data under the organization's retention policy, and decommission the dedicated resources when no longer needed.

Do not use broad volume deletion commands or point reset tooling at shared or production databases. If any required network isolation or access control cannot be confirmed, do not start the lab.