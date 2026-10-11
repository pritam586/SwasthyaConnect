SwasthyaConnect — AI-Powered Rural Health Triage App (UI Design Brief)

PRODUCT CONTEXT
Design a mobile-first healthcare app called SwasthyaConnect for rural/semi-urban
patients in India, plus a companion web dashboard for doctors. The core feature is
AI-assisted anaemia screening: a patient photographs their inner eyelid (conjunctiva)
via guided camera capture, and a CNN model analyzes it alongside an AI symptom
questionnaire, fusing both into a Green/Yellow/Red triage result that routes the
patient to self-care, a teleconsultation, or emergency care. The app integrates
India's ABHA health ID and checks Ayushman Bharat/PMJAY government insurance
eligibility. Many users are low-literacy or first-time smartphone users — design
must be simple, high-contrast, icon-led, with short copy and voice as an equal
alternative to text wherever the flow allows it. Three connected surfaces:
1. Patient App (mobile, primary)
2. Call-Agent / ASHA Worker Console (tablet/desktop, offline intake)
3. Doctor Dashboard (desktop web, case review)

VISUAL STYLE
- Light theme, high contrast, clinical-but-warm (not a dark dashboard aesthetic)
- Primary brand colour: calm teal/blue; reserve green/amber/red exclusively for
  triage status so the meaning stays consistent everywhere else
- Rounded, humanist sans-serif type, 16px+ body text, generous line height
- 48px+ tap targets, icon+label buttons, persistent language switcher in the header
- Progress indicator on every multi-step flow
- Skeleton loading states, not blank spinners (low-bandwidth users)
- Card-based layout, soft shadows, 8-12px corner radius

SCREENS — ONBOARDING
1. Splash / Open App — logo, tagline, "Get started"
2. Language Selection — grid of language names in native script, large tap cards
3. Who Needs Care Today? — "Myself" vs "Family member"
4. Select or Add Member — saved profiles (avatar+name+age) + "Add new" card
5. Call-Agent / ASHA Console — active-call indicator, language dropdown, quick-entry
   name/age/gender fields, live voice waveform showing IVR status

SCREENS — IDENTITY & PROFILE
6. Enter Phone Number — single large input, numeric keypad
7. Create Profile — Name, Age, Gender, Relationship (if adding a member)
8. Fetching Profile — loading state ("Getting your health record ready…")
9. Profile & Medical History Summary — fetched details, visit history,
   editable "current medications" chip input

SCREENS — ABHA CONSENT & ELIGIBILITY
10. ABHA Verification — ABHA number / QR entry
11. Consent to Share Health Records — plain-language checklist, Accept/Decline
12. Fetching Linked Records — loading state
13. Insurance Eligibility Result — Ayushman Bharat/PMJAY eligible/not-eligible badge

SCREENS — CAPTURE & SCREENING (core feature — give this the most design attention)
14. Guided Eye Capture — live camera view, eye-alignment oval overlay,
    colour-reference-card outline, short instructions, capture button
15. Checking Photo Quality — brief processing animation
16. Retake Photo — plain-language rejection reason (blur/glare/etc.), tip to fix,
    attempt counter, "Retake" CTA
17. Visit an ASHA Worker — escalation after failed retries: message + nearest
    facility locator (map/list)
18. Analyzing Sample — AI processing animation ("This takes about 10 seconds")
19. Screening Result — large risk-level label, confidence %, captured photo with
    a toggleable Grad-CAM heatmap overlay, one-line plain-language explanation

SCREENS — SYMPTOM QUESTIONS
20. Symptom Chat — chat-bubble UI, text/voice toggle, typing indicator, progress dots

SCREENS — TRIAGE RESULT & PATHS
21. Triage Result — full-width colour badge (green/amber/red) + headline +
    what-happens-next summary (branch point)
    Green path:
22. Self-Care Plan — advice list, prescription card
23. Nearest Pharmacy — list/map with stock-availability badges
24. Visit Saved (Green) — confirmation
    Yellow path:
25. Connecting to a Doctor — availability-status animation
26. Teleconsult Call — video call UI with patient-context sidebar
27. Book Appointment — calendar/slot picker (shown if no doctor available)
28. Callback Requested — confirmation
29. Prescription Received — view/download from doctor
30. Visit Saved (Yellow) — confirmation
    Red path:
31. Emergency Alert — urgent full-bleed red styling, "Connecting immediately"
32. Emergency Call & Details Sent — call UI + confirmation, record saved

SCREENS — DOCTOR DASHBOARD (desktop web)
33. Case Queue — incoming Yellow/Red cases, sortable by urgency and wait time
34. Patient Case Detail — captured eye photo + Grad-CAM heatmap, symptom summary,
    ABHA-linked history, Ayushman eligibility flag, prescription-writing panel

SCREENS — FOLLOW-UP
35. Schedule Follow-up — date/time picker, reminder channel (call/SMS/app)
36. Condition Check-in — "How are you feeling now?" Better/Same/Worse quick-tap
37. Case Closed — confirmation
38. Case Escalated — confirmation, routes back to doctor