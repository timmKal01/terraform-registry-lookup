# Terraform Registry Module & Provider Lookup

Look up the latest version, download count, and source repo for any
Terraform module or provider, via the official [Terraform Registry
API](https://developer.hashicorp.com/terraform/registry/api-docs).

Built for DevOps and platform engineering teams checking module/provider
versions and adoption without checking registry.terraform.io by hand.

## Input

```json
{
  "modules": ["terraform-aws-modules/vpc/aws"],
  "providers": ["hashicorp/aws"]
}
```

| Field | Type | Description |
|---|---|---|
| `modules` | array of strings | Terraform modules to look up, each as `"namespace/name/provider"`, e.g. `"terraform-aws-modules/vpc/aws"`. Default `["terraform-aws-modules/vpc/aws"]`. |
| `providers` | array of strings | Terraform providers to look up, each as `"namespace/name"`, e.g. `"hashicorp/aws"`. Leave empty to skip provider lookups. |

At least one of `modules` or `providers` must be non-empty.

## Output

One record per requested module or provider:

```json
{
  "type": "module",
  "ref": "terraform-aws-modules/vpc/aws",
  "found": true,
  "namespace": "terraform-aws-modules",
  "name": "vpc",
  "provider": "aws",
  "latestVersion": "6.6.1",
  "description": "Terraform module to create AWS VPC resources",
  "downloads": 206669261,
  "verified": false,
  "publishedAt": "2026-04-02T20:22:11.071125Z",
  "sourceUrl": "https://github.com/terraform-aws-modules/terraform-aws-vpc"
}
```

A malformed ref (wrong number of `/`-separated segments) or an
unrecognized module/provider returns `{ "found": false, ... }` rather
than failing the whole run.

## How it works

Direct calls to the official Terraform Registry API
(`registry.terraform.io/v1`) — no proxy, no key, no scraping.

## Pricing note

Billed per **lookup** (one run) at a flat rate, regardless of how many
modules/providers are requested.

## Related products

- [Docker Hub Image Tracker](https://github.com/timmKal01/docker-hub-image-tracker)
- [Homebrew Package Lookup](https://github.com/timmKal01/homebrew-package-lookup)
