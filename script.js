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
     1. DRIVEWAY VISUALIZER + ROUGH ESTIMATE
     Pricing is a deliberately wide *range*, not a quote.
     GTA residential asphalt ballpark: ~$9–$15 / sq ft.
     Curved edges add layout/labour, nudging the range up.
     ========================================================= */
  var lengthInput = document.getElementById("lengthInput");
  var widthInput = document.getElementById("widthInput");
  var edgeInputs = document.querySelectorAll('input[name="edge"]');
  var areaOut = document.getElementById("areaOut");
  var priceOut = document.getElementById("priceOut");
  var pathEl = document.getElementById("drivewayPath");
  var dimLabel = document.getElementById("dimLabel");

  var RATE_LOW = 9;   // $/sq ft, low end
  var RATE_HIGH = 15; // $/sq ft, high end
  var CURVE_UPLIFT = 1.08; // curved edges ~8% more

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
    var low = area * RATE_LOW * uplift;
    var high = area * RATE_HIGH * uplift;

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
     3. MOCK LIVE CHAT WIDGET
     Front-end only. Connect Tidio / Intercom / etc. before launch.
     ========================================================= */
  var chatToggle = document.getElementById("chatToggle");
  var chatPanel = document.getElementById("chatPanel");
  var chatClose = document.getElementById("chatClose");
  var chatForm = document.getElementById("chatForm");
  var chatInput = document.getElementById("chatInput");
  var chatBody = document.getElementById("chatBody");

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

  if (chatForm) {
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = (chatInput.value || "").trim();
      if (!text) return;
      addMsg(text, "chat-out");
      chatInput.value = "";
      // canned auto-reply (demo). Real replies come from the chat backend.
      setTimeout(function () {
        addMsg(
          "Thanks for reaching out! For the fastest answer, call Tony or Jason at 416-275-9479 — or leave your number and we'll follow up.",
          "chat-in"
        );
      }, 700);
    });
  }
})();
