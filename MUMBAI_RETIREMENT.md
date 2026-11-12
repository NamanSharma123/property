# Mumbai OCR server retirement

User explicitly requested complete deletion, including all recovery backups,
on 12 November 2026. This supersedes the earlier backup retention request.

## Identified workload

- Instance: `i-01e1e9041ff0e343e`, name `certificateOCRMahinder`
- Region / zone: `ap-south-1` / `ap-south-1b`
- Previous size: `t3.large`; instance was already stopped
- Root disk: `vol-004326469fa188e77`, 50 GiB gp3
- IAM instance profile: `certificate-ocr-prod`
- SSH key name: `mahinder` (not found in the local SSH directory)
- Console output references `share-ocr.service`, an authenticated OCR browser UI.
- Disk contents and application data have not been inspected directly.

## Deleted recovery backup

- AMI: `ami-02510436596b4487f`
- AMI name: `certificateOCRMahinder-retirement-20261112`
- Snapshot: `snap-06fe728dc4030e7bc`
- AMI was deregistered and snapshot deleted at the user's explicit request.
- No recovery backup remains for this server.

The old public IP is no longer reserved. The deleted server data cannot be
restored from the AMI or snapshot listed above.

## Actions

- Released Elastic IP `13.206.161.132` (`eipalloc-042a482fb4fde47a5`).
- Mumbai Elastic IP inventory is now empty.
- Instance was terminated and its 50 GiB root volume deleted.
- Mumbai image and snapshot inventories are empty.

The Sydney EC2 instance hosting Investview and OZFIRSTCHOICE is independent
and remains in service.
