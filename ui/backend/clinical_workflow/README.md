# Module 4: Doctor Dashboard, Data Sync, Pharmacy, and Deployment

Owner: Pritam Prajapati.

`service.py` provides a safe empty clinician-case queue and refuses to create decisions until authenticated clinician access, consented patient records, audit logging, and the required integrations exist.

Required before enabling live actions: role-based clinician authentication, case storage with patient consent, immutable audit logging, prescription rules and signing, pharmacy integration approval, notification provider credentials, and deployment secrets management.
