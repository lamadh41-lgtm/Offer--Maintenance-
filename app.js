/**
 * Toyota Maintenance System · Main Application Logic
 * Modular, accessible, with professional sound feedback
 */
(function () {
  "use strict";

  let fullData = [];
  let filteredData = [];
  let isUpdatingFilters = false;
  let currentLang = "ar";

  // ——— Utilities ———
  function fmtInt(n) {
    if (n === "" || n == null || isNaN(n)) return "";
    return Math.round(Number(n)).toLocaleString("en-US");
  }
  function fmt2(n) {
    if (n === "" || n == null || isNaN(n)) return "";
    return (Math.round(Number(n) * 100) / 100).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function toast(msg, type) {
    const box = document.getElementById("toastContainer");
    if (!box) return;
    const el = document.createElement("div");
    el.className = "toast" + (type ? " " + type : "");
    el.textContent = msg;
    box.appendChild(el);
    if (window.SoundEngine) {
      if (type === "error") SoundEngine.error();
      else if (type === "success") SoundEngine.success();
      else SoundEngine.notify();
    }
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.3s";
      setTimeout(() => el.remove(), 320);
    }, 2800);
  }

  // ——— Data & Filters ———
  function initData() {
    if (typeof EMBEDDED_DATA === "undefined") {
      console.error("EMBEDDED_DATA missing");
      return;
    }
    fullData = EMBEDDED_DATA.map(function (r, i) {
      var o = Object.assign({}, r);
      o._id = i;
      return o;
    });
    filteredData = [];
    initFilters();
    applyFilters();
    restoreLastFilters();
  }

  function unique(key) {
    return [
      ...new Set(
        fullData
          .map((r) => r[key])
          .filter((v) => v != null && String(v).trim() !== "")
      ),
    ].sort(function (a, b) {
      var na = parseFloat(a),
        nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a).localeCompare(String(b), "ar");
    });
  }

  function fillSelect(id, vals, countId) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var cur = sel.value;
    var keepAll = cur === "__ALL__";
    sel.innerHTML = '<option value="">اختر...</option>';
    if (id === "filterPartName") {
      var oa = document.createElement("option");
      oa.value = "__ALL__";
      oa.textContent = "الكل";
      sel.appendChild(oa);
    }
    vals.forEach(function (v) {
      var o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
    if (keepAll && id === "filterPartName") sel.value = "__ALL__";
    else if (cur && vals.indexOf(cur) >= 0) sel.value = cur;
    else sel.value = "";
    if (countId) {
      var c = document.getElementById(countId);
      if (c) c.textContent = vals.length ? "(" + vals.length + ")" : "";
    }
    if (sel.value) sel.classList.add("active-filter");
    else sel.classList.remove("active-filter");
  }

  function getFilteredBase(exclude) {
    var ct = document.getElementById("filterCarType").value;
    var my = document.getElementById("filterModelYear").value;
    var cm = document.getElementById("filterCarModel").value;
    var mt = document.getElementById("filterMaintenance").value;
    var pn = document.getElementById("filterPartName").value;
    var d = fullData.slice();
    if (exclude !== "carType" && ct) d = d.filter((r) => r.carType === ct);
    if (exclude !== "modelYear" && my) d = d.filter((r) => r.modelYear === my);
    if (exclude !== "carModel" && cm) d = d.filter((r) => r.carModel === cm);
    if (exclude !== "maintenance" && mt)
      d = d.filter((r) => String(r.maintenance) === String(mt));
    if (exclude !== "partName" && pn && pn !== "__ALL__")
      d = d.filter((r) => r.partName === pn);
    return d;
  }

  function updateFilterOptions() {
    if (isUpdatingFilters) return;
    isUpdatingFilters = true;
    var g = function (key, ex) {
      return [
        ...new Set(
          getFilteredBase(ex)
            .map((r) => r[key])
            .filter((v) => v != null && String(v).trim() !== "")
        ),
      ].sort(function (a, b) {
        var na = parseFloat(a),
          nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b), "ar");
      });
    };
    fillSelect("filterCarType", g("carType", "carType"), "typeCount");
    fillSelect("filterModelYear", g("modelYear", "modelYear"), "yearCount");
    fillSelect("filterCarModel", g("carModel", "carModel"), "modelCount");
    fillSelect(
      "filterMaintenance",
      g("maintenance", "maintenance"),
      "maintCount"
    );
    fillSelect("filterPartName", g("partName", "partName"), "partCount");
    isUpdatingFilters = false;
  }

  function allSelected() {
    var ct = document.getElementById("filterCarType").value;
    var my = document.getElementById("filterModelYear").value;
    var cm = document.getElementById("filterCarModel").value;
    var mt = document.getElementById("filterMaintenance").value;
    var pn = document.getElementById("filterPartName").value;
    return !!(ct && my && cm && mt && pn);
  }

  function getCurrentRows() {
    if (!allSelected()) return [];
    return getFilteredBase(null);
  }

  function updateTotals(rows) {
    var t = 0;
    rows.forEach(function (r) {
      t += parseFloat(r.total) || 0;
    });
    t = Math.round(t);
    var tax = Math.round(t * 1.14);
    document.getElementById("totalsContainer").innerHTML =
      '<div class="total-box"><div class="label">💵 الإجمالي (بعد الخصم)</div><div class="value total">' +
      t.toLocaleString("en-US") +
      '</div></div><div class="total-box"><div class="label">💰 بعد الضرائب (14%)</div><div class="value tax">' +
      tax.toLocaleString("en-US") +
      "</div></div>";
  }

  function discCell(r, field, fmtFn) {
    var val = r[field];
    var s = fmtFn(val);
    if (r.disc === "labor25" && field === "laborPrice" && r.origLabor) {
      return (
        '<span class="tag-disc tag-labor">25% خصم</span> ' +
        s +
        ' <span class="strike">' +
        fmtFn(r.origLabor) +
        "</span>"
      );
    }
    if (r.disc === "labor25" && field === "total" && r.origTotal) {
      return s + ' <span class="strike">' + fmtFn(r.origTotal) + "</span>";
    }
    if (r.disc === "part10" && field === "partPrice" && r.origPrice) {
      return (
        '<span class="tag-disc tag-part">10% خصم</span> ' +
        s +
        ' <span class="strike">' +
        fmtFn(r.origPrice) +
        "</span>"
      );
    }
    if (r.disc === "part10" && field === "total" && r.origTotal) {
      return s + ' <span class="strike">' + fmtFn(r.origTotal) + "</span>";
    }
    if (r.disc === "free" && (field === "partPrice" || field === "total")) {
      return '<span class="tag-disc tag-free">مجاناً</span> 0';
    }
    return s;
  }

  function renderTable(rows) {
    var tb = document.getElementById("tableBody");
    if (!rows || !rows.length) {
      tb.innerHTML =
        '<tr class="empty-row"><td colspan="13">🔍 لا توجد بيانات لهذا الاختيار</td></tr>';
      return;
    }
    tb.innerHTML = rows
      .map(function (r, i) {
        var cls =
          r.disc === "labor25"
            ? "row-labor25"
            : r.disc === "part10"
              ? "row-part10"
              : r.disc === "free"
                ? "row-free"
                : "";
        var nameCell = esc(r.partName || "");
        if (r.disc === "labor25")
          nameCell =
            '<span class="tag-disc tag-labor">25% خصم</span> ' + nameCell;
        if (r.disc === "free")
          nameCell =
            '<span class="tag-disc tag-free">مجاناً</span> ' + nameCell;
        return (
          '<tr class="' +
          cls +
          '">' +
          "<td>" +
          (i + 1) +
          "</td>" +
          "<td>" +
          esc(r.carType) +
          "</td>" +
          "<td>" +
          esc(r.modelYear) +
          "</td>" +
          "<td>" +
          esc(r.carModel) +
          "</td>" +
          "<td>" +
          esc(r.maintenance) +
          "</td>" +
          "<td>" +
          nameCell +
          "</td>" +
          "<td>" +
          esc(r.partNumber) +
          "</td>" +
          '<td class="number">' +
          fmt2(r.quantity) +
          "</td>" +
          '<td class="number">' +
          discCell(r, "laborPrice", fmtInt) +
          "</td>" +
          '<td class="number">' +
          discCell(r, "partPrice", fmtInt) +
          "</td>" +
          '<td class="number">' +
          discCell(r, "total", fmtInt) +
          "</td>" +
          '<td class="number">' +
          fmt2(r.balance) +
          "</td>" +
          "<td>" +
          esc(r.duration) +
          "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function applyFilters() {
    updateFilterOptions();
    saveLastFilters();
    if (!allSelected()) {
      filteredData = [];
      updateTotals([]);
      document.getElementById("tableBody").innerHTML =
        '<tr class="empty-row"><td colspan="13">🔒 اختر <b>جميع الفلاتر</b> لعرض البيانات</td></tr>';
      return;
    }
    filteredData = getCurrentRows();
    updateTotals(filteredData);
    renderTable(filteredData);
    if (filteredData.length && window.SoundEngine) {
      SoundEngine.confirm();
    }
  }

  function initFilters() {
    fillSelect("filterCarType", unique("carType"), "typeCount");
    fillSelect("filterModelYear", unique("modelYear"), "yearCount");
    fillSelect("filterCarModel", unique("carModel"), "modelCount");
    fillSelect("filterMaintenance", unique("maintenance"), "maintCount");
    fillSelect("filterPartName", unique("partName"), "partCount");
  }

  function clearAllFilters() {
    [
      "filterCarType",
      "filterModelYear",
      "filterCarModel",
      "filterMaintenance",
      "filterPartName",
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.value = "";
        el.classList.remove("active-filter");
      }
    });
    if (window.SoundEngine) SoundEngine.click();
    applyFilters();
    toast("تم إلغاء جميع الفلاتر");
  }

  function saveLastFilters() {
    try {
      var state = {
        carType: document.getElementById("filterCarType").value,
        modelYear: document.getElementById("filterModelYear").value,
        carModel: document.getElementById("filterCarModel").value,
        maintenance: document.getElementById("filterMaintenance").value,
        partName: document.getElementById("filterPartName").value,
      };
      localStorage.setItem("tm_filters", JSON.stringify(state));
    } catch (e) {}
  }

  function restoreLastFilters() {
    try {
      var raw = localStorage.getItem("tm_filters");
      if (!raw) return;
      var state = JSON.parse(raw);
      var map = {
        filterCarType: state.carType,
        filterModelYear: state.modelYear,
        filterCarModel: state.carModel,
        filterMaintenance: state.maintenance,
        filterPartName: state.partName,
      };
      Object.keys(map).forEach(function (id) {
        var el = document.getElementById(id);
        if (el && map[id]) {
          // Will be applied after options update
          el.dataset.pending = map[id];
        }
      });
      // Re-apply after options filled
      setTimeout(function () {
        Object.keys(map).forEach(function (id) {
          var el = document.getElementById(id);
          if (el && el.dataset.pending) {
            var val = el.dataset.pending;
            if ([...el.options].some((o) => o.value === val)) {
              el.value = val;
              el.classList.add("active-filter");
            }
            delete el.dataset.pending;
          }
        });
        applyFilters();
      }, 50);
    } catch (e) {}
  }

  // ——— Export مقايسة Excel ———
  function exportCSV() {
    exportMaqaysa();
  }

  function exportMaqaysa() {
    if (!filteredData.length) {
      toast("لا توجد بيانات للتصدير", "error");
      return;
    }
    if (!window.MAQAYSA_TEMPLATE_B64) {
      toast("قالب المقايسة غير محمّل", "error");
      return;
    }

    var carType = document.getElementById("filterCarType").value || "";
    var modelYear = document.getElementById("filterModelYear").value || "";
    var carModel = document.getElementById("filterCarModel").value || "";
    var maint = document.getElementById("filterMaintenance").value || "";
    var maintLabel = maint === "other" ? "أخرى" : maint ? "صيانة" : "";
    var maintNum = maint === "other" ? "أخرى" : maint || "";
    var maintNumVal = maintNum === "" ? "" : isNaN(Number(maintNum)) ? maintNum : Number(maintNum);

    var now = new Date();
    var dateStr =
      now.getFullYear() +
      "/" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "/" +
      String(now.getDate()).padStart(2, "0");

    var laborRows = filteredData.filter(function (r) {
      return r.partName === "مصنعيات" || r.disc === "labor25";
    });
    var partRows = filteredData.filter(function (r) {
      return r.partName !== "مصنعيات" && r.disc !== "labor25";
    });

    var laborTotal = 0;
    laborRows.forEach(function (r) {
      laborTotal += parseFloat(r.total) || 0;
    });
    laborTotal = Math.round(laborTotal);

    var partsTotal = 0;
    partRows.forEach(function (r) {
      partsTotal += parseFloat(r.total) || 0;
    });
    partsTotal = Math.round(partsTotal);

    var specialTotal = 0;
    var subTotal = laborTotal + partsTotal + specialTotal;
    var tax = Math.round(subTotal * 0.14);
    var grand = subTotal + tax;

    var fname =
      "مقايسة-" +
      (carType || "تويوتا") +
      "-" +
      (maintNum ? "صيانة_" + maintNum : "صيانة") +
      "-" +
      dateStr.replace(/\//g, "-") +
      ".xlsx";

    function b64ToArrayBuffer(b64) {
      var binary = atob(b64);
      var len = binary.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }

    function downloadBlob(buffer, name) {
      var blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      if (typeof saveAs === "function") {
        saveAs(blob, name);
      } else {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () {
          URL.revokeObjectURL(url);
        }, 1000);
      }
    }

    function fillParts(setVal) {
      var r, r2;
      for (r = 17; r <= 52; r++) {
        setVal("H" + r, null);
        setVal("I" + r, null);
        setVal("J" + r, null);
      }
      for (r2 = 18; r2 <= 52; r2++) {
        setVal("M" + r2, null);
        setVal("N" + r2, null);
        setVal("O" + r2, null);
      }
      var maxLeft = 36;
      var leftParts = partRows.slice(0, maxLeft);
      var rightParts = partRows.slice(maxLeft);
      leftParts.forEach(function (p, idx) {
        var row = 17 + idx;
        setVal("H" + row, p.partName || "");
        setVal("I" + row, p.quantity != null ? p.quantity : null);
        setVal("J" + row, Math.round(parseFloat(p.total) || 0));
      });
      rightParts.forEach(function (p, idx) {
        var rowR = 18 + idx;
        if (rowR > 52) return;
        setVal("M" + rowR, p.partName || "");
        setVal("N" + rowR, p.quantity != null ? p.quantity : null);
        setVal("O" + rowR, Math.round(parseFloat(p.total) || 0));
      });
    }

    function applyCommon(setVal) {
      setVal("E8", dateStr);
      setVal("M8", carModel || "تويوتا");
      setVal("M9", carType || "");
      setVal("M10", modelYear || "");
      setVal("D23", maintLabel);
      setVal("E23", maintNumVal);
      setVal("E35", laborTotal);
      fillParts(setVal);
      setVal("O17", 0);
      setVal("J53", partsTotal);
      setVal("E53", specialTotal);
      setVal("O44", partsTotal);
      setVal("O46", laborTotal);
      setVal("O47", specialTotal);
      setVal("O48", partsTotal);
      setVal("O49", subTotal);
      setVal("O50", 0);
      setVal("O51", subTotal);
      setVal("N52", 0.14);
      setVal("O52", tax);
      setVal("O53", grand);
    }

    function exportWithSheetJS() {
      if (typeof XLSX === "undefined") {
        throw new Error("مكتبة SheetJS غير محمّلة");
      }
      var wb = XLSX.read(b64ToArrayBuffer(window.MAQAYSA_TEMPLATE_B64), {
        type: "array",
        cellStyles: true,
      });
      var ws = wb.Sheets[wb.SheetNames[0]];
      function setVal(addr, value) {
        var cell = ws[addr];
        var t = value === null || value === undefined ? "z" : typeof value === "number" ? "n" : "s";
        if (value === null || value === undefined) {
          if (cell) {
            cell.v = "";
            cell.t = "s";
            if (cell.f) delete cell.f;
            if (cell.w) delete cell.w;
          }
          return;
        }
        if (cell) {
          cell.v = value;
          cell.t = t;
          if (cell.w) delete cell.w;
          if (cell.f) delete cell.f;
        } else {
          ws[addr] = { t: t, v: value };
        }
      }
      applyCommon(setVal);
      XLSX.writeFile(wb, fname);
    }

    function finishOk() {
      if (window.SoundEngine) SoundEngine.success();
      toast("تم تصدير المقايسة بنجاح", "success");
    }

    // جرب ExcelJS أولاً (يحافظ على القالب والألوان واللوجو)، ولو فشل استخدم SheetJS
    if (typeof ExcelJS !== "undefined") {
      var workbook = new ExcelJS.Workbook();
      workbook.xlsx
        .load(b64ToArrayBuffer(window.MAQAYSA_TEMPLATE_B64))
        .then(function () {
          var ws = workbook.worksheets[0];
          if (!ws) throw new Error("لا توجد ورقة في القالب");
          function setVal(addr, value) {
            var cell = ws.getCell(addr);
            cell.value = value === null ? null : value;
          }
          applyCommon(setVal);

          // تأكيد وجود لوجو البرجسي أعلى المقايسة
          try {
            var hasImg =
              typeof ws.getImages === "function" &&
              ws.getImages().length > 0;
            if (!hasImg && window.MAQAYSA_LOGO_B64) {
              var logoId = workbook.addImage({
                base64: window.MAQAYSA_LOGO_B64,
                extension: "png",
              });
              // نفس منطقة اللوجو تقريباً في القالب الأصلي (يمين أعلى)
              ws.addImage(logoId, {
                tl: { col: 11.2, row: 0.1 },
                ext: { width: 220, height: 66 },
              });
            }
          } catch (logoErr) {
            console.warn("logo add skipped", logoErr);
          }

          return workbook.xlsx.writeBuffer();
        })
        .then(function (buffer) {
          downloadBlob(buffer, fname);
          finishOk();
        })
        .catch(function (err) {
          console.warn("ExcelJS failed, fallback SheetJS", err);
          try {
            exportWithSheetJS();
            finishOk();
          } catch (e2) {
            console.error(e2);
            toast(
              "فشل التصدير: " +
                ((err && err.message) || "") +
                " / " +
                ((e2 && e2.message) || ""),
              "error"
            );
          }
        });
    } else if (typeof XLSX !== "undefined") {
      try {
        exportWithSheetJS();
        finishOk();
      } catch (e) {
        console.error(e);
        toast("فشل التصدير: " + (e.message || e), "error");
      }
    } else {
      toast("مكتبة التصدير غير محمّلة — تأكد من الاتصال بالإنترنت", "error");
    }
  }

  // ——— Auth & Screens ———
  function getDynamicPassword() {
    var now = new Date();
    var h = now.getHours() % 12;
    if (h === 0) h = 12;
    var d = now.getDate();
    var m = now.getMonth() + 1;
    var y = now.getFullYear();
    return String(h) + String(d) + String(m) + String(y);
  }

  function showPasswordBox() {
    var box = document.getElementById("pwBox");
    box.classList.add("show");
    document.getElementById("pwErr").classList.remove("show");
    var inp = document.getElementById("pwInput");
    inp.value = "";
    if (window.SoundEngine) SoundEngine.open();
    setTimeout(function () {
      inp.focus();
    }, 50);
  }

  function checkPassword() {
    var input = (document.getElementById("pwInput").value || "").replace(
      /\s+/g,
      ""
    );
    var expected = getDynamicPassword();
    if (input === expected) {
      document.getElementById("ipBlock").classList.remove("show");
      if (window.SoundEngine) SoundEngine.success();
      showIntro();
    } else {
      document.getElementById("pwErr").classList.add("show");
      document.getElementById("pwInput").value = "";
      document.getElementById("pwInput").focus();
      if (window.SoundEngine) SoundEngine.error();
    }
  }

  function createParticles() {
    var box = document.getElementById("particles");
    if (!box || box.childNodes.length) return;
    for (var i = 0; i < 28; i++) {
      var p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDuration = 6 + Math.random() * 10 + "s";
      p.style.animationDelay = Math.random() * 8 + "s";
      p.style.width = p.style.height = 2 + Math.random() * 3 + "px";
      box.appendChild(p);
    }
  }

  function showIntro() {
    var ipEl = document.getElementById("ipBlock");
    var tipEl = document.getElementById("lanPermTip");
    if (ipEl) ipEl.classList.remove("show");
    if (tipEl) tipEl.classList.remove("show");
    document.getElementById("introScreen").classList.add("show");
    document.getElementById("mainApp").style.display = "none";
    createParticles();
    if (window.SoundEngine) SoundEngine.open();
  }

  var networkMonitorTimer = null;
  var isDevMode = false;
  var banDelayTimer = null;
  var networkListenersAttached = false;
  var checkInProgress = false;
  var siteLocked = false;

  // reason: "offline" | "network"
  function lockSite(reason) {
    if (siteLocked && reason !== "offline") {
      // لو اتقفل بسبب offline، متغيرش الرسالة لـ network
    }
    siteLocked = true;

    if (banDelayTimer) {
      clearTimeout(banDelayTimer);
      banDelayTimer = null;
    }

    var isOffline = reason === "offline";

    var titleEl = document.getElementById("ipTitle");
    var msgEl = document.getElementById("ipMsg");
    var iconEl = document.getElementById("ipIcon");

    var specialArea = document.querySelector("#ipBlock .special-area");
    var pwBox = document.getElementById("pwBox");

    if (isOffline) {
      if (titleEl) titleEl.textContent = "انقطع الاتصال بالإنترنت";
      if (msgEl)
        msgEl.innerHTML =
          "الاتصال بالإنترنت انقطع.<br>اتأكد من الواي فاي أو بيانات الموبايل ثم أعد فتح الصفحة.";
      if (iconEl) iconEl.textContent = "📡";
      // إخفاء زر الحالة الخاصة عند انقطاع النت
      if (specialArea) specialArea.style.display = "none";
      if (pwBox) pwBox.classList.remove("show");
    } else {
      if (titleEl) titleEl.textContent = "للأسف مش هينفع تدخل الموقع";
      if (msgEl)
        msgEl.innerHTML =
          "الموقع متاح فقط من الشبكة المحددة.<br>اتأكد إنك متصل بنفس الشبكة ثم أعد فتح الصفحة.";
      if (iconEl) iconEl.textContent = "🚫";
      // إظهار زر الحالة الخاصة في حظر الشبكة
      if (specialArea) specialArea.style.display = "";
    }

    var ipEl = document.getElementById("ipBlock");
    var introEl = document.getElementById("introScreen");
    var mainEl = document.getElementById("mainApp");
    var tipEl = document.getElementById("lanPermTip");
    if (tipEl) tipEl.classList.remove("show");
    if (ipEl) ipEl.classList.add("show");
    if (mainEl) mainEl.style.display = "none";
    if (introEl) introEl.classList.remove("show");
    stopNetworkMonitor();
    if (window.SoundEngine) SoundEngine.error();
  }

  // فحص حقيقي للإنترنت (مش بس navigator.onLine)
  function probeInternet() {
    return new Promise(function (resolve) {
      if (typeof navigator.onLine === "boolean" && !navigator.onLine) {
        resolve(false);
        return;
      }
      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        resolve(!!ok);
      }
      setTimeout(function () {
        finish(false);
      }, 2500);

      // محاولة سريعة لعدة endpoints
      var urls = [
        "https://www.gstatic.com/generate_204",
        "https://connectivitycheck.gstatic.com/generate_204",
        "https://dns.google/resolve?name=example.com&type=A",
      ];
      urls.forEach(function (url) {
        try {
          fetch(url, {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
          })
            .then(function () {
              finish(true);
            })
            .catch(function () {});
        } catch (e) {}
      });

      // صورة كاحتياطي
      try {
        var img = new Image();
        img.onload = function () {
          finish(true);
        };
        img.onerror = function () {};
        img.src =
          "https://www.google.com/favicon.ico?_=" + Date.now();
      } catch (e2) {}
    });
  }

  // فحص الوصول لراوتر شبكة 192.168.1.x (مهم لـ GitHub Pages / HTTPS)
  function probeLocalLan() {
    return new Promise(function (resolve) {
      var done = false;
      function finish(ok) {
        if (done) return;
        done = true;
        resolve(!!ok);
      }
      setTimeout(function () {
        finish(false);
      }, 3000);

      var hosts = ["192.168.1.1", "192.168.1.254"];

      hosts.forEach(function (host) {
        var base = "http://" + host;

        // fetch + Local Network Access (Chrome)
        ["local", undefined].forEach(function (space) {
          try {
            var opts = { method: "GET", mode: "no-cors", cache: "no-store" };
            if (space) opts.targetAddressSpace = space;
            fetch(base + "/?_=" + Date.now(), opts)
              .then(function () {
                finish(true);
              })
              .catch(function () {});
          } catch (e) {}
        });

        // Image (محتوى مختلط سلبي)
        try {
          var img = new Image();
          img.onload = function () {
            finish(true);
          };
          img.src = base + "/favicon.ico?_=" + Date.now();
        } catch (e2) {}
      });
    });
  }

  // WebRTC — بيرجع الـ IP لما المتصفح يسمح (محلي / بعض المتصفحات)
  function detectLocalIps() {
    return new Promise(function (resolve) {
      var done = false;
      var ips = [];
      var pc = null;
      function finish() {
        if (done) return;
        done = true;
        try {
          if (pc) {
            pc.onicecandidate = null;
            pc.close();
          }
        } catch (e) {}
        var allowed = ips.some(function (ip) {
          return /^192\.168\.1\./.test(ip);
        });
        resolve({ allowed: allowed, ips: ips });
      }
      setTimeout(finish, 2000);
      try {
        var RTC =
          window.RTCPeerConnection || window.webkitRTCPeerConnection;
        if (!RTC) {
          finish();
          return;
        }
        pc = new RTC({ iceServers: [], iceCandidatePoolSize: 0 });
        pc.createDataChannel("");
        pc.onicecandidate = function (e) {
          if (done) return;
          if (!e || !e.candidate) {
            if (e && !e.candidate) finish();
            return;
          }
          // address موجود في متصفحات حديثة
          var addr = e.candidate.address || e.candidate.ip;
          if (addr && /^[0-9.]+$/.test(addr)) {
            if (ips.indexOf(addr) === -1) ips.push(addr);
            if (/^192\.168\.1\./.test(addr)) {
              finish();
              return;
            }
          }
          var cand = e.candidate.candidate || "";
          var m = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(cand);
          if (!m) return;
          var ip = m[1];
          if (ips.indexOf(ip) === -1) ips.push(ip);
          if (/^192\.168\.1\./.test(ip)) finish();
        };
        pc.createOffer()
          .then(function (o) {
            return pc.setLocalDescription(o);
          })
          .then(function () {
            // استخراج IP من الـ SDP لو موجود
            try {
              var sdp =
                (pc.localDescription && pc.localDescription.sdp) || "";
              var re = /([0-9]{1,3}(\.[0-9]{1,3}){3})/g;
              var mm;
              while ((mm = re.exec(sdp))) {
                if (ips.indexOf(mm[1]) === -1) ips.push(mm[1]);
              }
              if (
                ips.some(function (x) {
                  return /^192\.168\.1\./.test(x);
                })
              ) {
                finish();
                return;
              }
            } catch (e) {}
            if (!pc || !pc.getStats) return;
            return pc.getStats().then(function (stats) {
              stats.forEach(function (r) {
                if (!r) return;
                var ip =
                  r.ip ||
                  r.address ||
                  r.localCandidateIp ||
                  r.ipAddress ||
                  "";
                if (ip && /^[0-9.]+$/.test(ip) && ips.indexOf(ip) === -1) {
                  ips.push(ip);
                }
              });
              if (
                ips.some(function (x) {
                  return /^192\.168\.1\./.test(x);
                })
              ) {
                finish();
              }
            });
          })
          .catch(function () {
            finish();
          });
      } catch (err) {
        finish();
      }
    });
  }

  // مسموح لو WebRTC لقى 192.168.1.x أو قدَر يوصل للراوتر المحلي
  function isAllowedNetwork() {
    return Promise.all([detectLocalIps(), probeLocalLan()]).then(
      function (results) {
        var webrtc = results[0];
        var lan = results[1];
        return !!(webrtc.allowed || lan);
      }
    );
  }

  function checkNetworkAccess() {
    return Promise.all([detectLocalIps(), probeLocalLan()]).then(
      function (results) {
        return {
          allowed: !!(results[0].allowed || results[1]),
          ips: results[0].ips || [],
          lanReachable: !!results[1],
        };
      }
    );
  }

  function checkAndLockIfNeeded() {
    if (isDevMode || siteLocked || checkInProgress) return;
    checkInProgress = true;

    // 1) navigator.onLine سريع
    if (!navigator.onLine) {
      checkInProgress = false;
      lockSite("offline");
      return;
    }

    // 2) فحص نت حقيقي + الشبكة المحلية (WebRTC أو الوصول للراوتر 192.168.1.x)
    Promise.all([probeInternet(), checkNetworkAccess()])
      .then(function (results) {
        checkInProgress = false;
        if (siteLocked) return;
        var online = results[0];
        var net = results[1];
        if (!online) {
          lockSite("offline");
          return;
        }
        if (!net.allowed) {
          lockSite("network");
        }
      })
      .catch(function () {
        checkInProgress = false;
      });
  }

  function startNetworkMonitor() {
    stopNetworkMonitor();
    if (isDevMode) return;
    siteLocked = false;

    // فحص كل ثانيتين
    networkMonitorTimer = setInterval(checkAndLockIfNeeded, 2000);
    // فحص فوري
    checkAndLockIfNeeded();

    if (!networkListenersAttached) {
      networkListenersAttached = true;
      window.addEventListener("offline", function () {
        lockSite("offline");
      });
      window.addEventListener("online", function () {
        if (!siteLocked) checkAndLockIfNeeded();
      });
      if (navigator.connection) {
        try {
          navigator.connection.addEventListener("change", function () {
            if (!siteLocked) checkAndLockIfNeeded();
          });
        } catch (e) {}
      }
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && !siteLocked) {
          checkAndLockIfNeeded();
        }
      });
    }
  }

  function stopNetworkMonitor() {
    if (networkMonitorTimer) {
      clearInterval(networkMonitorTimer);
      networkMonitorTimer = null;
    }
  }

  function enterApp() {
    document.getElementById("introScreen").classList.remove("show");
    document.getElementById("mainApp").style.display = "block";
    if (window.SoundEngine) SoundEngine.success();
    initData();
    toast("مرحباً بك في نظام الصيانة", "success");
    startNetworkMonitor();
  }

  var LAN_OK_KEY = "tm_lan_ok";

  function setLanOk(ok) {
    try {
      if (ok) localStorage.setItem(LAN_OK_KEY, "1");
      else localStorage.removeItem(LAN_OK_KEY);
    } catch (e) {}
  }

  function hasLanOk() {
    try {
      return localStorage.getItem(LAN_OK_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function runNetworkGate() {
    var ipEl = document.getElementById("ipBlock");
    var tipEl = document.getElementById("lanPermTip");
    if (tipEl) tipEl.classList.remove("show");

    // رجّع نص الزر لو موجود
    var btnLan = document.getElementById("btnLanPerm");
    if (btnLan) {
      btnLan.disabled = false;
      btnLan.textContent = "حسناً — متابعة وفتح إذن Chrome";
    }

    if (!navigator.onLine) {
      setLanOk(false);
      banDelayTimer = setTimeout(function () {
        lockSite("offline");
      }, 1500);
      return;
    }

    // نفحص الشبكة (وChrome يظهر طلب Local Network لو لسه متعملش Allow)
    var startTime = Date.now();
    isAllowedNetwork().then(function (ok) {
      if (ok) {
        // تم السماح ونجح الفحص → في الريفرش الجاي مش هنظهر نافذة التنبيه
        setLanOk(true);
        if (ipEl) ipEl.classList.remove("show");
        showIntro();
      } else {
        // رفض الإذن أو شبكة غلط → امسح العلامة عشان التنبيه يرجع بعد الريفرش
        setLanOk(false);
        var elapsed = Date.now() - startTime;
        var remaining = Math.max(0, 2500 - elapsed);
        banDelayTimer = setTimeout(function () {
          lockSite(navigator.onLine ? "network" : "offline");
        }, remaining);
      }
    });
  }

  function showLanPermissionTip() {
    var tipEl = document.getElementById("lanPermTip");
    var ipEl = document.getElementById("ipBlock");
    var introEl = document.getElementById("introScreen");
    var mainEl = document.getElementById("mainApp");
    var btnLan = document.getElementById("btnLanPerm");
    if (mainEl) mainEl.style.display = "none";
    if (introEl) introEl.classList.remove("show");
    if (ipEl) ipEl.classList.remove("show");
    if (btnLan) {
      btnLan.disabled = false;
      btnLan.textContent = "حسناً — متابعة وفتح إذن Chrome";
    }
    if (tipEl) tipEl.classList.add("show");
  }

  function boot() {
    var params = new URLSearchParams(location.search || "");
    var forceDev = params.get("dev") === "1";
    isDevMode = forceDev || location.protocol === "file:";
    var ipEl = document.getElementById("ipBlock");
    var introEl = document.getElementById("introScreen");
    var mainEl = document.getElementById("mainApp");
    var tipEl = document.getElementById("lanPermTip");

    // كل الشاشات متخفية في البداية
    if (mainEl) mainEl.style.display = "none";
    if (introEl) introEl.classList.remove("show");
    if (ipEl) ipEl.classList.remove("show");
    if (tipEl) tipEl.classList.remove("show");

    if (isDevMode) {
      showIntro();
      return;
    }

    // لو مفيش نت من الأول
    if (!navigator.onLine) {
      setLanOk(false);
      banDelayTimer = setTimeout(function () {
        lockSite("offline");
      }, 2000);
      return;
    }

    // لو المستخدم وافق قبل كده ونجح الفحص → نعدي من غير نافذة التنبيه
    if (hasLanOk()) {
      runNetworkGate();
      return;
    }

    // أول مرة أو بعد الرفض → نافذة التنبيه + عند الضغط يتبعت طلب البرميشن
    showLanPermissionTip();
  }

  // ——— Sound toggle UI ———
  function updateSoundBtn() {
    var btn = document.getElementById("soundToggle");
    if (!btn || !window.SoundEngine) return;
    if (SoundEngine.enabled) {
      btn.classList.remove("muted");
      btn.title = "إيقاف الصوت";
      btn.textContent = "🔊";
    } else {
      btn.classList.add("muted");
      btn.title = "تشغيل الصوت";
      btn.textContent = "🔇";
    }
  }

  // ——— Event wiring ———
  function wireEvents() {
    [
      "filterCarType",
      "filterModelYear",
      "filterCarModel",
      "filterMaintenance",
      "filterPartName",
    ].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener("change", function () {
          if (isUpdatingFilters) return;
          if (window.SoundEngine) SoundEngine.click();
          applyFilters();
        });
      }
    });

    var btnClear = document.getElementById("btnClearFilters");
    if (btnClear) btnClear.addEventListener("click", clearAllFilters);

    var btnExport = document.getElementById("btnExport");
    if (btnExport) btnExport.addEventListener("click", exportCSV);

    var btnSpecial = document.getElementById("btnSpecial");
    if (btnSpecial)
      btnSpecial.addEventListener("click", showPasswordBox);

    var btnLanPerm = document.getElementById("btnLanPerm");
    if (btnLanPerm) {
      btnLanPerm.addEventListener("click", function () {
        if (window.SoundEngine) SoundEngine.click();
        var btn = btnLanPerm;
        btn.disabled = true;
        btn.textContent = "جاري فتح إذن Chrome… اضغط Allow";
        // تشغيل الفحص فوراً عشان Chrome يظهر نافذة Local Network
        runNetworkGate();
      });
    }

    var btnCheckPw = document.getElementById("btnCheckPw");
    if (btnCheckPw) btnCheckPw.addEventListener("click", checkPassword);

    var pwInput = document.getElementById("pwInput");
    if (pwInput) {
      pwInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") checkPassword();
      });
    }

    var btnEnter = document.getElementById("btnEnter");
    if (btnEnter) btnEnter.addEventListener("click", enterApp);

    var soundBtn = document.getElementById("soundToggle");
    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        if (window.SoundEngine) {
          SoundEngine.toggle();
          updateSoundBtn();
          if (SoundEngine.enabled) SoundEngine.click();
        }
      });
    }
  }

  // ——— Boot ———
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      wireEvents();
      updateSoundBtn();
      boot();
    });
  } else {
    wireEvents();
    updateSoundBtn();
    boot();
  }

  // Expose for inline if needed
  window.TM = {
    clearAllFilters,
    checkPassword,
    showPasswordBox,
    enterApp,
    exportCSV,
  };
})();
