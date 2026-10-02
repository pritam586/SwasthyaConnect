# Module 2: Symptom and Speech Triage

Owner: Pratik Singh.

`service.py` exposes `POST /api/v1/triage/assess`. It accepts structured symptom answers, an optional speech transcript, and optional non-diagnostic context from Module 1.

The only current output is `inconclusive` with `clinician_review_required: true`. The service deliberately has no diagnosis, treatment, prescription, urgency, or emergency-routing logic. A future implementation must add validation evidence and clinician approval before changing this contract.
