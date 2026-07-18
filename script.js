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
     LEAD DELIVERY
     Paste your free Web3Forms access key (https://web3forms.com — "Create
     Access Key", takes 30 seconds) below to start receiving leads by email.
     Leave it "" and the site runs in demo mode (logs to the console only).
     ========================================================= */
  var WEB3FORMS_ACCESS_KEY = ""; // <-- paste key here to go live

  // Fire a GA4 / dataLayer event if analytics is present (safe no-op otherwise)
  function track(name, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); } catch (e) {}
    try { (window.dataLayer = window.dataLayer || []).push(assign({ event: name }, params || {})); } catch (e) {}
  }

  function assign(target, src) {
    for (var k in src) { if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k]; }
    return target;
  }

  // Send a lead to Web3Forms. Returns a Promise. Demo mode when no key is set.
  function sendLead(payload) {
    if (!WEB3FORMS_ACCESS_KEY) {
      // eslint-disable-next-line no-console
      console.log("[Woodbine Paving] Lead captured (demo — set WEB3FORMS_ACCESS_KEY to send):", payload);
      return Promise.resolve({ demo: true });
    }
    var body = assign({
      access_key: WEB3FORMS_ACCESS_KEY,
      from_name: "Woodbine Paving website"
    }, payload);
    return fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.success) throw new Error(json.message || "submit failed");
      return json;
    });
  }

  // Attribution: track every click-to-call (website + sticky bar)
  Array.prototype.forEach.call(document.querySelectorAll('a[href^="tel:"]'), function (a) {
    a.addEventListener("click", function () {
      track("click_to_call", { location: a.getAttribute("data-cta") || "link" });
    });
  });

  /* ---------- Mobile menu (hamburger) ---------- */
  var navToggle = document.getElementById("navToggle");
  var mainNav = document.getElementById("mainNav");
  if (navToggle && mainNav) {
    function setMenu(open) {
      mainNav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    navToggle.addEventListener("click", function () {
      setMenu(!mainNav.classList.contains("open"));
    });
    // Close after tapping a link
    mainNav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    // Close on Escape or when tapping outside the header
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    document.addEventListener("click", function (e) {
      if (mainNav.classList.contains("open") &&
          !mainNav.contains(e.target) && !navToggle.contains(e.target)) {
        setMenu(false);
      }
    });
  }

  /* =========================================================
     1. DRIVEWAY VISUALIZER + ESTIMATE
     Base formula: length × width = square footage, × $3.50/sq ft.
     Shown as a ±15% range around that base, plus a flat $1000–$1500 for
     labour/fuel/crew/utilities (curved edges add a small premium).
     It's a ballpark estimate, not a formal quote.
     ========================================================= */
  var lengthInput = document.getElementById("lengthInput");
  var widthInput = document.getElementById("widthInput");
  var edgeInputs = document.querySelectorAll('input[name="edge"]');
  var areaOut = document.getElementById("areaOut");
  var priceOut = document.getElementById("priceOut");
  var pathEl = document.getElementById("drivewayPath");
  var dimLabel = document.getElementById("dimLabel");

  var RATE = 3.5;           // $/sq ft of asphalt (length × width × 3.5 = base)
  var CURVE_UPLIFT = 1.10;  // curved edges ~10% more for the extra layout/labour
  var SPREAD = 0.15;        // ±15% band around the formula → a price *range*, not a fixed number
  var OVERHEAD_LOW = 1000;  // flat add for labour, fuel, crew, utilities (low end)
  var OVERHEAD_HIGH = 1500; // flat add for labour, fuel, crew, utilities (high end)

  function money(n) {
    // round to nearest $100 so the range reads as a clean ballpark
    var r = Math.round(n / 100) * 100;
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
    var base = area * RATE * uplift; // length × width × $3.50 (× curved premium)
    var low = base * (1 - SPREAD) + OVERHEAD_LOW;   // add overhead so it's not asphalt-only
    var high = base * (1 + SPREAD) + OVERHEAD_HIGH;

    if (areaOut) areaOut.textContent = area.toLocaleString("en-CA") + " sq ft";
    if (priceOut) priceOut.textContent = money(low) + " – " + money(high);

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

  // Estimator lead capture: "text/email me this estimate" → send at peak intent
  var estForm = document.getElementById("estimatorForm");
  var estContact = document.getElementById("estContact");
  var estCaptureMsg = document.getElementById("estCaptureMsg");
  var estCaptureBtn = document.getElementById("estCaptureBtn");
  if (estForm) {
    estForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var contact = estContact ? estContact.value.trim() : "";
      if (!contact) { if (estContact) estContact.focus(); return; }
      var payload = {
        subject: "Driveway estimate request (website tool)",
        lead_type: "Estimate request from driveway visualizer",
        contact: contact,
        dimensions: (lengthInput ? lengthInput.value : "") + " x " + (widthInput ? widthInput.value : "") + " ft",
        area: areaOut ? areaOut.textContent : "",
        edge_style: getEdge(),
        estimate_range: priceOut ? priceOut.textContent : ""
      };
      if (estCaptureBtn) { estCaptureBtn.disabled = true; estCaptureBtn.textContent = "Sending…"; }
      sendLead(payload).then(function () {
        track("generate_lead", { form: "estimator" });
        if (estContact) estContact.value = "";
        if (estCaptureMsg) {
          estCaptureMsg.hidden = false;
          estCaptureMsg.style.color = "#35c759";
          estCaptureMsg.textContent = "Sent! We'll be in touch with your estimate.";
        }
      }).catch(function () {
        if (estCaptureMsg) {
          estCaptureMsg.hidden = false;
          estCaptureMsg.style.color = "#ff8a8a";
          estCaptureMsg.textContent = "Couldn't send — please call 416-275-9479.";
        }
      }).then(function () {
        if (estCaptureBtn) { estCaptureBtn.disabled = false; estCaptureBtn.textContent = "Send it"; }
      });
    });
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

    var leadErr = document.getElementById("leadError");
    var honeypot = document.getElementById("leadHoneypot");

    leadForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validateStep(current)) return;
      if (honeypot && honeypot.value) return; // bot — silently drop

      var data = {};
      new FormData(leadForm).forEach(function (v, k) { data[k] = v; });
      delete data._gotcha;
      data.subject = "New quote request — " + (data.service || "Paving");

      if (leadErr) leadErr.hidden = true;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }

      sendLead(data).then(function (res) {
        track("generate_lead", { form: "multi_step", service: data.service });
        leadForm.hidden = true;
        if (successEl) {
          successEl.hidden = false;
          var msg = document.getElementById("leadSuccessMsg");
          if (msg && data.name) {
            msg.innerHTML = "Thanks, " + escapeHtml(String(data.name).split(" ")[0]) +
              " — we'll be in touch shortly. Need us sooner? Call " +
              '<a href="tel:+14162759479">416-275-9479</a>.';
          }
          var demoNote = document.getElementById("leadDemoNote");
          if (demoNote && res && !res.demo) demoNote.hidden = true;
        }
      }).catch(function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Send to Tony & Jason"; }
        if (leadErr) leadErr.hidden = false;
      });
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
      reply: "Hi there! 👋 I can point you in the right direction on our services, service area, hours, and booking an estimate. For anything specific to your driveway, a quick call is best — what can I help with?"
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
      reply: "Every driveway is different, so we don't quote a set price online — it depends on your size, site, and prep. You can try the Driveway Visualizer on this page for a rough range, but the best way to get a real number is a quick call to Tony or Jason at 416-275-9479 for a free quote."
    },
    {
      keys: ["estimator", "estimate", "calculator", "visualizer", "the tool", "how do i use", "measure"],
      reply: "Scroll up to the “Driveway Visualizer” section — enter your driveway's length and width and pick straight or curved edges to see a shape preview and a rough estimated range. For a real price, tap “Get a real quote” or give us a call."
    },
    {
      keys: ["snow", "plow", "plowing", "salt", "winter clear", "de-ice", "deice"],
      reply: "Yes — we offer commercial snow removal for winter. Give us a call and we'll go over setting up a seasonal contract for your property."
    },
    {
      keys: ["line paint", "line-paint", "striping", "stall", "markings", "fire route", "parking line"],
      reply: "Yes, we do line painting for commercial lots — fresh layouts or refreshing faded lines. Call us with the details and we'll take it from there."
    },
    {
      keys: ["how long does it take", "how long will", "timeline", "how many days", "duration", "take to", "finish the", "complete the", "job take", "how long for", "to pave", "long to do"],
      reply: "It depends on the size of the job, our schedule, and the weather, so we don't put a set number on it up front. Give us a call and we'll go over what to expect for your driveway."
    },
    {
      keys: ["drive on", "park on", "cure", "curing", "walk on", "how long before", "harden", "ready to use", "dry"],
      reply: "Fresh asphalt needs some time to cure before regular use, and we'll give you clear guidance on that when we finish your job. If you have a specific concern, just give us a call."
    },
    {
      keys: ["how long does asphalt last", "lifespan", "last for", "how long will it last", "durable", "how many years", "longevity"],
      reply: "With basic upkeep, a good asphalt driveway lasts for many years. There are free care tips in our maintenance guide on this page, and we're happy to answer questions if you call."
    },
    {
      keys: ["crack", "pothole", "repair", "patch", "fix", "damage", "worn", "resurface", "overlay"],
      reply: "We can take a look at cracks, potholes, and worn areas and let you know the best way to handle them. Send us a photo or give us a call and we'll advise."
    },
    {
      keys: ["interlock", "sealcoat", "seal coat", "sealing", "paver", "pavers", "stone", "concrete", "brick"],
      reply: "We focus purely on asphalt — driveways, lots, line painting, and snow removal. Happy to talk through any asphalt project if you give us a call."
    },
    {
      keys: ["process", "steps", "how do you", "base", "prep", "gravel", "material", "hot mix", "what kind of asphalt"],
      reply: "We take care of the whole job from start to finish, and exactly what's involved depends on your site. The best way to get the details is a quick call — Tony or Jason will walk you through it."
    },
    {
      keys: ["residential", "my driveway", "new driveway", "repave", "replace my", "home driveway"],
      reply: "Residential driveways are our main focus — new installs and full replacements. Try the estimator on this page for a rough range, or call us for a free on-site quote."
    },
    {
      keys: ["commercial", "parking lot", "lot", "business", "plaza", "property manager", "laneway", "access road"],
      reply: "We handle commercial paving — parking lots, laneways, and access roads — plus line painting and seasonal snow removal. Give us a call and we'll arrange a site visit."
    },
    {
      keys: ["service", "services", "offer", "do you do", "what do you", "what can you", "kind of work", "type of work"],
      reply: "We handle four things, all asphalt: residential paving, commercial paving, commercial snow removal, and line painting. Call us and we'll help with whichever one you need."
    },
    {
      keys: ["area", "areas", "where", "serve", "servicing", "location", "gta", "near me", "toronto", "mississauga", "vaughan", "brampton", "markham", "scarborough", "oakville", "richmond hill", "etobicoke", "ajax", "pickering", "maple", "come to"],
      reply: "We're based in Brampton and work right across the Greater Toronto Area. Give us a call with your city and we'll confirm we can help."
    },
    {
      keys: ["book", "schedule", "appointment", "free estimate", "come out", "site visit", "get started", "sign up", "set up", "when can you"],
      reply: "Happy to set up a free on-site estimate. Fill out the quick quote form on this page or give us a call, and we'll arrange a time to come take a look."
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
      reply: "Weather affects paving, so timing can vary through the year. Give us a call and we'll talk about the best time to schedule your job."
    },
    {
      keys: ["warranty", "guarantee", "guaranteed", "stand behind"],
      reply: "We take pride in a clean, lasting finish and stand behind our work. For specifics on your job, give us a call and Tony or Jason will go over it with you."
    },
    {
      keys: ["owner", "who are you", "who runs", "tony", "jason", "experience", "trust", "reliable", "licensed", "insured", "why choose", "why should"],
      reply: "Woodbine Paving is owner-operated — Tony and Jason are hands-on and on-site for every job. Customers regularly mention clear communication and a crew that shows up on time."
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
    return "Sorry, I don't have an answer for that one. Your best bet is to reach us directly — give us a call at 416-275-9479 or 647-668-3901, or reach Nick at 647-326-3296, and we'll be glad to help.";
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
