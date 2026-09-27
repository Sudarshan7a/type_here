---
description: Audit animations in a path against the motion tokens and reduced-motion rules
agent: ui-reviewer
subtask: true
---
Audit all animation and transition code under: $ARGUMENTS

Load `typing-motion-tokens` (and `review-animations` if installed). Check the review checklist in `typing-motion-tokens`, confirm nothing animates in the typing surface beyond the caret, and confirm a tested reduced-motion path. Output the findings table.
