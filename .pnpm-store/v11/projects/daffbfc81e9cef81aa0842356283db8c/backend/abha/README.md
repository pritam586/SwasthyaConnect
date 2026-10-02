# Module 3: ABHA / ABDM Integration

Owner: Giriraj Partani.

`service.py` defines the ABHA-link API boundary. It validates input format and explicit consent, then fails safely with `linked: false` until a reviewed ABDM Sandbox integration exists.

Required before live integration: ABDM Sandbox client credentials, registered redirect URLs, a server-side OAuth/consent callback, encrypted secret storage, consent artefact handling, and an approved privacy/security review.
