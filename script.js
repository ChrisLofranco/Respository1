/* ============================================================
   Woodbine Paving — front-end interactions
   1. Driveway visualizer + rough price range
   2. Multi-step lead form
   3. Mock live chat widget
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Year in footer ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* =========================================================
     1. DRIVEWAY VISUALIZER + ESTIMATE
     Formula: length × width = square footage, × $3.50/sq ft = price.
     Curved edges add a small premium for the extra layout/labour.
     It's a ballpark estimate, not a formal quote.
     ========================================================= */
  var lengthInput = document.getElementById("lengthInput");
  var widthInput = document.getElementById("widthInput");
  var edgeInputs = document.querySelectorAll('input[name="edge"]');
  var areaOut = document.getElementById("areaOut");
  var priceOut = document.getElementById("priceOut");
  var pathEl = document.getElementById("drivewayPath");
  var dimLabel = document.getElementById("dimLabel");

  var RATE = 3.5;          // $/sq ft of asphalt (length × width × 3.5 = price)
  var CURVE_UPLIFT = 1.10; // curved edges ~10% more for the extra layout/labour

  function money(n) {
    // round to nearest $10 so it clearly reads as a ballpark
    var r = Math.round(n / 10) * 10;
    return "$" + r.toLocaleString("en-CA");
  }

  function getEdge() {
    var checked = document.querySelector('input[name="edge"]:checked');
    return checked ? checked.value : "straight";
  }

  function clampNum(input, fallback) {
    var v = parseFloat(input.value);
    if (isNaN(v)) return null;
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    if (!isNaN(min) && v < min) v = min;
    if (!isNaN(max) && v > max) v = max;
    return v;
  }

  function drawDriveway(lenFt, widFt, edge) {
    // SVG canvas is 400x300; house strip occupies top 34px.
    var canvasW = 400, canvasH = 300;
    var houseH = 34;
    var pad = 30;
    var availW = canvasW - pad * 2;
    var availH = canvasH - houseH - pad * 2;

    // scale so the longer real dimension fills its axis (length runs vertically,
    // away from the house/garage).
    var scale = Math.min(availW / widFt, availH / lenFt);
    var wPx = Math.max(24, widFt * scale);
    var hPx = Math.max(24, lenFt * scale);

    var x0 = (canvasW - wPx) / 2;
    var y0 = houseH + 6;
    var x1 = x0 + wPx;
    var y1 = y0 + hPx;

    var d;
    if (edge === "curved") {
      // flare the bottom (street) edge outward with a gentle curve
      var flare = Math.min(26, wPx * 0.22);
      d =
        "M " + x0 + " " + y0 +
        " L " + x1 + " " + y0 +
        " L " + (x1 + flare) + " " + y1 +
        " Q " + ((x0 + x1) / 2) + " " + (y1 + 18) + " " + (x0 - flare) + " " + y1 +
        " Z";
    } else {
      d =
        "M " + x0 + " " + y0 +
        " L " + x1 + " " + y0 +
        " L " + x1 + " " + y1 +
        " L " + x0 + " " + y1 +
        " Z";
    }
    if (pathEl) pathEl.setAttribute("d", d);
    if (dimLabel) dimLabel.textContent = lenFt + " ft × " + widFt + " ft";
  }

  function update() {
    var len = clampNum(lengthInput);
    var wid = clampNum(widthInput);
    var edge = getEdge();

    if (len === null || wid === null) {
      if (areaOut) areaOut.textContent = "—";
      if (priceOut) priceOut.textContent = "Enter size";
      return;
    }

    var area = len * wid;
    var uplift = edge === "curved" ? CURVE_UPLIFT : 1;
    var price = area * RATE * uplift; // length × width × $3.50 (× curved premium)

    if (areaOut) areaOut.textContent = area.toLocaleString("en-CA") + " sq ft";
    if (priceOut) priceOut.textContent = money(price);

    drawDriveway(len, wid, edge);
  }

  if (lengthInput && widthInput) {
    [lengthInput, widthInput].forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    edgeInputs.forEach(function (el) { el.addEventListener("change", update); });
    update(); // initial render
  }

  /* =========================================================
     2. MULTI-STEP LEAD FORM
     ========================================================= */
  var leadForm = document.getElementById("leadForm");
  if (leadForm) {
    var steps = Array.prototype.slice.call(leadForm.querySelectorAll(".lead-step"));
    var totalSteps = steps.length;
    var current = 0;

    var backBtn = document.getElementById("leadBack");
    var nextBtn = document.getElementById("leadNext");
    var submitBtn = document.getElementById("leadSubmit");
    var progressBar = document.getElementById("leadProgressBar");
    var stepNum = document.getElementById("stepNum");
    var successEl = document.getElementById("leadSuccess");

    function showStep(i) {
      steps.forEach(function (s, idx) { s.classList.toggle("is-active", idx === i); });
      if (stepNum) stepNum.textContent = String(i + 1);
      if (progressBar) progressBar.style.width = ((i + 1) / totalSteps) * 100 + "%";
      if (backBtn) backBtn.hidden = i === 0;
      var last = i === totalSteps - 1;
      if (nextBtn) nextBtn.hidden = last;
      if (submitBtn) submitBtn.hidden = !last;
    }

    function validateStep(i) {
      var stepEl = steps[i];
      var fields = stepEl.querySelectorAll("input[required], textarea[required]");
      // radio groups: at least one checked
      var radioGroups = {};
      var ok = true;
      fields.forEach(function (f) {
        if (f.type === "radio") {
          radioGroups[f.name] = radioGroups[f.name] || false;
          if (f.checked) radioGroups[f.name] = true;
        } else if (!f.value.trim()) {
          ok = false;
          f.reportValidity && f.reportValidity();
        } else if (f.type === "email" && !f.checkValidity()) {
          ok = false;
          f.reportValidity && f.reportValidity();
        }
      });
      Object.keys(radioGroups).forEach(function (name) {
        if (!radioGroups[name]) {
          ok = false;
          var first = stepEl.querySelector('input[name="' + name + '"]');
          if (first) first.reportValidity && first.reportValidity();
        }
      });
      return ok;
    }

    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (!validateStep(current)) return;
      if (current < totalSteps - 1) { current++; showStep(current); }
    });
    if (backBtn) backBtn.addEventListener("click", function () {
      if (current > 0) { current--; showStep(current); }
    });

    // advance automatically when a choice is picked on the choice-only steps
    steps.forEach(function (stepEl, idx) {
      if (stepEl.querySelector(".choice-grid")) {
        stepEl.querySelectorAll('input[type="radio"]').forEach(function (r) {
          r.addEventListener("change", function () {
            if (idx === current && current < totalSteps - 1) {
              setTimeout(function () { current++; showStep(current); }, 180);
            }
          });
        });
      }
    });

    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateStep(current)) return;

      var data = {};
      new FormData(leadForm).forEach(function (v, k) { data[k] = v; });

      // Demo only — no backend. Wire this to email/CRM or a form endpoint.
      leadForm.hidden = true;
      var progress = leadForm.previousElementSibling;
      if (successEl) {
        successEl.hidden = false;
        var msg = document.getElementById("leadSuccessMsg");
        if (msg && data.name) {
          msg.innerHTML = "Thanks, " + escapeHtml(data.name.split(" ")[0]) +
            " — we'll be in touch shortly. Need us sooner? Call " +
            '<a href="tel:+14162759479">416-275-9479</a>.';
        }
      }
      // eslint-disable-next-line no-console
      console.log("[Woodbine Paving] Lead captured (demo, not sent):", data);
    });

    showStep(0);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* =========================================================
     3. AUTO-RESPONDING CHATBOT (front-end demo)
     Rule-based intent matching so it answers common pre-sale
     questions automatically. Swap for a real AI chatbot backend
     (Tidio, Intercom, custom) before launch.
     ========================================================= */
  var chatToggle = document.getElementById("chatToggle");
  var chatPanel = document.getElementById("chatPanel");
  var chatClose = document.getElementById("chatClose");
  var chatForm = document.getElementById("chatForm");
  var chatInput = document.getElementById("chatInput");
  var chatBody = document.getElementById("chatBody");
  var chatQuick = document.getElementById("chatQuick");

  function openChat() {
    if (!chatPanel) return;
    chatPanel.hidden = false;
    chatToggle.setAttribute("aria-expanded", "true");
    if (chatInput) chatInput.focus();
  }
  function closeChat() {
    if (!chatPanel) return;
    chatPanel.hidden = true;
    chatToggle.setAttribute("aria-expanded", "false");
  }

  if (chatToggle) {
    chatToggle.addEventListener("click", function () {
      chatPanel.hidden ? openChat() : closeChat();
    });
  }
  if (chatClose) chatClose.addEventListener("click", closeChat);

  function addMsg(text, cls) {
    if (!chatBody) return;
    var div = document.createElement("div");
    div.className = "chat-msg " + cls;
    div.textContent = text;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Rule-based knowledge base. Ordered most-specific → most-general; first
  // keyword hit wins. Each answer is written to actually answer the question.
  var CHAT_INTENTS = [
    {
      keys: ["hello", "hi ", "hey", "good morning", "good afternoon", "good evening", "how are you"],
      reply: "Hey there! 👋 I can answer questions about pricing, our services, timelines, how asphalt holds up, our service area, and booking an estimate. What can I help you with?"
    },
    {
      keys: ["thank", "thanks", "appreciate", "cheers"],
      reply: "You're welcome! Anything else I can help you with?"
    },
    {
      keys: ["bye", "goodbye", "see ya", "that's all", "thats all", "nothing else"],
      reply: "Thanks for stopping by! Reach us anytime at 416-275-9479, or on our direct lines 647-668-3901 and 647-326-3296. Have a great day."
    },
    {
      keys: ["financing", "finance", "payment plan", "pay", "payment", "deposit", "cash", "cheque", "credit"],
      reply: "We go over payment details when we give you your quote — just reach out and we'll walk you through it. (Note: we don't offer financing plans.)"
    },
    {
      keys: ["how much", "price", "pricing", "cost", "charge", "quote", "rate", "per square", "per sq", "expensive", "$", "ballpark"],
      reply: "As a rough guide, asphalt runs about $3.50 per square foot — so length × width gives your square footage for a ballpark. It's only an estimate, though; the real price depends on your site. Try the Driveway Visualizer on this page to get a feel for your size, and Tony or Jason will confirm an exact quote on-site."
    },
    {
      keys: ["estimator", "estimate", "calculator", "visualizer", "the tool", "how do i use", "measure"],
      reply: "Scroll up to the “Driveway Visualizer & rough estimate” section — enter your driveway's length and width, pick straight or curved edges, and it instantly shows a shape preview plus an estimated price (about $3.50/sq ft). For a firm number, tap “Get a real quote” and we'll come take a look."
    },
    {
      keys: ["snow", "plow", "plowing", "salt", "winter clear", "de-ice", "deice"],
      reply: "Yes — we offer commercial snow removal: seasonal plowing and clearing to keep your lot open and safe all winter. Call us to set up a seasonal contract for your property."
    },
    {
      keys: ["line paint", "line-paint", "striping", "stall", "markings", "fire route", "parking line"],
      reply: "We do line painting for commercial lots — parking stalls, fire routes, and directional markings, whether it's a fresh layout or a refresh of faded lines."
    },
    {
      keys: ["how long does it take", "how long will", "timeline", "how many days", "duration", "take to", "finish the", "complete the"],
      reply: "Most residential driveways are completed in a single day once we start. Bigger or commercial jobs can take longer. Exact scheduling depends on crew routing and weather, so we confirm timing after seeing the site."
    },
    {
      keys: ["drive on", "park on", "cure", "curing", "walk on", "how long before", "harden", "ready to use", "dry"],
      reply: "You can usually walk on fresh asphalt within a few hours and drive on it after about 24–48 hours. For the first couple of weeks, try not to park in the exact same spot or turn your wheels while stopped, as it's still hardening."
    },
    {
      keys: ["how long does asphalt last", "lifespan", "last for", "how long will it last", "durable", "how many years", "longevity"],
      reply: "A properly installed asphalt driveway typically lasts 15–20+ years with basic upkeep. Good drainage and sealing small cracks early are the two biggest things that extend its life — there are free tips in our maintenance guide on this page."
    },
    {
      keys: ["crack", "pothole", "repair", "patch", "fix", "damage", "worn", "resurface", "overlay"],
      reply: "We can assess cracks, potholes, and worn surfaces. Small cracks are worth sealing early before water and freeze-thaw widen them. Send us a photo or call and we'll advise whether a patch, resurface, or full replacement makes the most sense."
    },
    {
      keys: ["interlock", "sealcoat", "seal coat", "sealing", "paver", "pavers", "stone", "concrete", "brick"],
      reply: "We focus purely on asphalt — driveways, lots, line painting, and snow removal. That specialization is exactly why the asphalt work comes out clean and holds up. Happy to talk through any asphalt project."
    },
    {
      keys: ["process", "steps", "how do you", "base", "prep", "gravel", "material", "hot mix", "what kind of asphalt"],
      reply: "For a driveway we grade the area, prep and compact a solid granular base, then lay and roll hot-mix asphalt for a smooth surface with clean edges that sheds water. The base prep is what makes it last, so we don't cut corners there."
    },
    {
      keys: ["residential", "my driveway", "new driveway", "repave", "replace my", "home driveway"],
      reply: "Residential driveways are our main focus — new installs and full replacements. We handle grading, base prep, and a smooth rolled asphalt finish, usually in a day. Use the estimator on this page for a ballpark, or call for an on-site quote."
    },
    {
      keys: ["commercial", "parking lot", "lot", "business", "plaza", "property manager", "laneway", "access road"],
      reply: "We handle commercial paving — parking lots, laneways, and access roads built for real traffic and loads — plus line painting and seasonal snow removal for commercial properties. Call us and we'll arrange a site visit."
    },
    {
      keys: ["service", "services", "offer", "do you do", "what do you", "what can you", "kind of work", "type of work"],
      reply: "We handle four things, all asphalt: residential paving, commercial paving, commercial snow removal, and line painting. Which one are you interested in?"
    },
    {
      keys: ["area", "areas", "where", "serve", "servicing", "location", "gta", "near me", "toronto", "mississauga", "vaughan", "brampton", "markham", "scarborough", "oakville", "richmond hill", "etobicoke", "ajax", "pickering", "maple", "come to"],
      reply: "We're based in Brampton and work right across the Greater Toronto Area — Toronto, Vaughan, Mississauga, Brampton, Maple, Oakville, Richmond Hill, Markham, Scarborough, Etobicoke, Ajax, Pickering and other GTA municipalities. Tell me your city and I'll confirm."
    },
    {
      keys: ["book", "schedule", "appointment", "free estimate", "come out", "site visit", "get started", "sign up", "set up", "when can you"],
      reply: "Happy to set up a free on-site estimate. Fill out the quick quote form on this page (service → size → timeline → contact) or call us, and we'll arrange a time to come take a look."
    },
    {
      keys: ["hour", "hours", "open", "when are you open", "what time", "days", "weekend", "sunday", "saturday"],
      reply: "We're reachable 7 days a week, 7am–7pm — including weekends."
    },
    {
      keys: ["phone", "call", "number", "contact", "reach", "talk to", "speak", "email", "get a hold"],
      reply: "You can reach us at 416-275-9479, or on our direct lines 647-668-3901 and 647-326-3296 — 7 days a week, 7am–7pm. You can also fill out the quick quote form on this page and we'll follow up."
    },
    {
      keys: ["weather", "season", "best time", "rain", "cold", "temperature", "time of year", "spring", "fall", "summer"],
      reply: "Asphalt goes down best in warmer, dry conditions, so most paving runs spring through fall. We watch the forecast and won't lay asphalt in poor weather, since conditions affect the final finish."
    },
    {
      keys: ["warranty", "guarantee", "guaranteed", "stand behind"],
      reply: "We stand behind our work and take pride in a clean, lasting finish. For specifics on any workmanship guarantee for your job, give us a call and Tony or Jason will go over it with you."
    },
    {
      keys: ["owner", "who are you", "who runs", "tony", "jason", "experience", "trust", "reliable", "licensed", "insured", "why choose", "why should"],
      reply: "Woodbine Paving is owner-operated — Tony and Jason are hands-on and on-site for every job, from base prep to the finished surface. Customers regularly mention clear communication and a crew that shows up on time."
    }
  ];

  function botReply(text) {
    var q = " " + text.toLowerCase() + " ";
    for (var i = 0; i < CHAT_INTENTS.length; i++) {
      var intent = CHAT_INTENTS[i];
      for (var j = 0; j < intent.keys.length; j++) {
        if (q.indexOf(intent.keys[j]) !== -1) return intent.reply;
      }
    }
    return "I'm not certain on that specific one, but I can help with pricing, our services, timelines, how asphalt holds up, our service area, or booking an estimate — just ask. You can also reach us directly at 416-275-9479, 647-668-3901, or 647-326-3296.";
  }

  function handleUserMessage(text) {
    text = (text || "").trim();
    if (!text) return;
    addMsg(text, "chat-out");
    if (chatQuick) chatQuick.style.display = "none"; // hide chips after first question
    setTimeout(function () { addMsg(botReply(text), "chat-in"); }, 550);
  }

  if (chatForm) {
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = chatInput.value;
      chatInput.value = "";
      handleUserMessage(text);
    });
  }

  if (chatQuick) {
    chatQuick.querySelectorAll(".chat-chip").forEach(function (chip) {
      chip.addEventListener("click", function () { handleUserMessage(chip.textContent); });
    });
  }
})();
