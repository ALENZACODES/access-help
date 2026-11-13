# Content style guide (English)

For help articles, programme descriptions, event listings, and moderation messages in the App. French has its own guide. Do not translate this file with a machine and paste the result into the product.

## Voice

- Call the product **the App**. Do not invent a brand.
- Use **person with a spinal cord injury** or **person living with SCI**. Use **tetraplegia** where a clinical term is required. Do not use **wheelchair-bound**.
- An injury level is not a label for a person and not a guess about what they can do.
- Short sentences. One idea each. Say the concrete thing before the background.
- Use **Unknown** when a fact was not checked. Do not write "accessible", "step-free", or "verified" to fill a gap.
- Dates are written as 13 November 2026. A number that can change (a fare, a benefit, a phone line) carries the date it was read.

## Shape of a help article

1. What the App does.
2. What the App does not do.
3. What data it uses.

Then the sections. Safety articles say they are general information, not personal advice, and they name the reviewer once a review exists. Until then they stay marked as drafts.

## Words that do not ship

- "Endorsed by", "official SCIO app", "in partnership with", "AODA compliant", "you are eligible", a drug dose, or a catheter schedule presented as instruction.
- "Live" or "real-time" unless a source and a time are on the same screen.
- A designated-area count of 25 or 27. The count is Unknown until the current regulation is listed.
- Benefit dollar amounts. Link to the official page.
- Lumosity names, or any claim that a game is therapy.

The content audit in `@access/help` fails the build if those patterns appear.

## Peer tips

Tell people: share what worked at a place; do not give medical advice; do not share personal health information; do not name a person without consent.

A refusal message says why, in plain language, and points to 811 or 911 when the subject is health or danger. Do not edit the tip into softer advice.

## Events

Say the date, not only "tomorrow". If the organiser has not confirmed that date, say so. Do not copy last month's entrance note onto tonight. Registration is a link out. The App does not sign people up.

## Crisis and health

911 comes first, with no questions. 9-8-8 is call or text, in English or French, as published at https://988.ca/ on the date you checked. Do not ask someone to type a crisis into the App. Do not store it if they do.

Do not add autonomic dysreflexia triggers, blood-pressure cut-offs, or a symptom checker. The one sentence that a sudden dangerous rise in blood pressure can be an emergency is already as far as the unreviewed draft goes.

## French

Safety, health, legal, and benefits sentences are written by a person and reviewed. Machine translation is not used for them, and not for the rest of help either. A community tip may be machine-translated only later, with a visible label, and that feature is not built.

## Moderation messages

Say what happened, why, and what the person can do next, including an appeal. Do not say "violation detected".
