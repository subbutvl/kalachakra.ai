# KalaChakra phase 1: demo guide

A 15-minute walk through everything phase 1 does, for showing KalaChakra to a
numerologist, a partner or a customer. Everything runs on this computer.
Nothing is sent to a server.

## Before you start

1. Start everything with one command, either way:
   - with Node 22 and pnpm: `pnpm install`, then `pnpm dev`
   - with Docker: `docker compose up --build`
2. Open <http://localhost:3000>. The API and its interactive docs are at
   <http://localhost:8787/docs>.
3. Have a second browser window ready in a private tab, so the customer and
   practitioner sides can be shown with no saved data.

The people below are fictional and safe to show. Keep real clients' details
out of the demo and out of the repository (see
`packages/engine/test/local/README.md`).

## 1. The home page (2 minutes)

- Type **14 August 1991** under "Try it with your date of birth". The wheel
  turns to **5** (Mercury), and the line below gives Mulank 5 and Bhagyank 6.
- Scroll down. The Lo Shu square marks the Mulank and the Bhagyank. "Every
  number, worked out" shows the sums step by step. Change the name to
  **Meenakshi Sundaram** to show the Chaldean letters updating live.
- Press **தமிழ்** in the header. Every screen switches, and the choice is
  remembered. The Tamil and English paragraphs side by side come from the
  report itself. Switch back to English.

## 2. A customer report (4 minutes)

1. **Get your full report**, keep **Complete report**, tick **Mobile numbers**
   and **Compatibility**, then **Continue**.
2. Enter **Aarav Mehra**, **14 August 1991**, **Male**, mobile **98765 24310**,
   and partner **Diya Shah**, **22 March 1993**. Point out the checks as you type:
   try a date that does not exist, such as 31 February.
3. **Check my details** shows the name exactly as it is scored (AARAV MEHRA).
4. **Generate report**. Use the contents list to jump to _Your Lo Shu grid_,
   _Mobile number_ and _Appendix: how every number was worked out_.
5. **Download PDF**. It is ready in about a second. Open it to show the A4
   layout and fonts. Then **Start again** to clear everything.

For a Tamil or child report, choose **Child report** in step 1 and Tamil as
the report language in step 2 (try **Myra Kapoor**, **9 March 2016**).

## 3. The practitioner desk (6 minutes)

1. Switch to **Practitioner**. In **Settings**, enter a name and title (and a
   logo, if you have one). These go on every report's header and footer.
2. **Clients**, then **Add client**: Aarav Mehra as above, plus a second
   client, Diya Shah. The register shows each client's Mulank, Bhagyank and
   name number.
3. **Open** Aarav. The ink header has the core numbers. Walk through the
   tabs: Vedic, Chaldean name, Pythagorean, Lo Shu and Kua, Timing, Trace.
4. Change the rule profile in the header to **KalaChakra Classic**. Numbers
   that change are outlined in gold with their old value. **Rule profile** in
   the rail lists all 24 decisions. Change one to make a custom profile, and
   the "What changes for a client" table updates.
5. **Labs**:
   - **Name lab**: type spellings and watch the score change. Press **Try** on
     an optimiser suggestion, and pin two or three spellings to compare.
   - **Mobile lab**: paste several numbers to rank them, then enter a 6-digit
     prefix to find good endings.
   - **Compatibility**: Aarav with Diya, as a couple.
6. **Report editor** (from Aarav's page):
   - Hide _How to read this report_, then move _Mulank_ up.
   - Open _Mulank_, rewrite its first paragraph and click outside. The original
     stays visible under it, with **Restore original**.
   - Add a note, set the status to **Reviewed**, then **Preview**.
   - **Download PDF**: the report now carries your branding and your edits.
7. **Export** on the client desk saves everything as one JSON file, and
   **Import** loads it on another computer.

## 4. Questions people ask

- **Why do numbers differ from other sites?** Systems differ on master
  numbers, letter tables and Kua years. The rule profile makes every one of
  those choices visible and switchable, and the appendix shows each sum.
- **Is anything stored?** No. Customer details stay in the browser tab.
  Practitioner data stays in that browser until it is exported.
- **How fast is it?** A full report is built in under 0.1 seconds and the PDF
  in about a second, against targets of 3 and 10 seconds. The API tests check
  this on every change.

## If something goes wrong

- **"The KalaChakra API is not reachable"**: the API is not running. Start it
  with `pnpm dev` and check <http://localhost:8787/v1/health>.
- **Port 8787 or 3000 already in use**: another copy is still running. Close
  that terminal, or see the message the API prints for the command that stops
  it.
- **The PDF fails**: the API needs Microsoft Edge or Google Chrome on this
  computer (or set `KALACHAKRA_CHROME` to a Chromium path). The Docker image
  includes Chromium.
