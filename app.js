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
      // مسح خلايا قطع الغيار في العمود الأيسر (H/I/J) للصفوف 17–52 فقط
      for (r = 17; r <= 52; r++) {
        setVal("H" + r, null);
        setVal("I" + r, null);
        setVal("J" + r, null);
      }
      // مسح خلايا قطع الغيار في العمود الأيمن (M/N/O) للصفوف 18–43 فقط
      // لا نمسح الصفوف 44 و46–53 لأنها تحتوي على عناوين الإجماليات المدمجة (L:N)
      // ومسح M فيها يمسح الجملة بأكملها بسبب الدمج
      for (r2 = 18; r2 <= 43; r2++) {
        setVal("M" + r2, null);
        setVal("N" + r2, null);
        setVal("O" + r2, null);
      }
      var maxLeft = 36; // صفوف 17–52 = 36 خانة
      var maxRight = 26; // صفوف 18–43 = 26 خانة
      var leftParts = partRows.slice(0, maxLeft);
      var rightParts = partRows.slice(maxLeft, maxLeft + maxRight);
      leftParts.forEach(function (p, idx) {
        var row = 17 + idx;
        setVal("H" + row, p.partName || "");
        setVal("I" + row, p.quantity != null ? p.quantity : null);
        setVal("J" + row, Math.round(parseFloat(p.total) || 0));
      });
      rightParts.forEach(function (p, idx) {
        var rowR = 18 + idx;
        if (rowR > 43) return;
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
      toast("مكتبة التصدير غير محمّلة", "error");
    }
  }


  // ——— Screens (simplified — no network / no password) ———
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
    document.getElementById("introScreen").classList.add("show");
    document.getElementById("mainApp").style.display = "none";
    createParticles();
    if (window.SoundEngine) SoundEngine.open();
  }

  function enterApp() {
    document.getElementById("introScreen").classList.remove("show");
    document.getElementById("mainApp").style.display = "block";
    if (window.SoundEngine) SoundEngine.success();
    initData();
    toast("مرحباً بك في نظام الصيانة", "success");
  }

  function boot() {
    var mainEl = document.getElementById("mainApp");
    var introEl = document.getElementById("introScreen");
    if (mainEl) mainEl.style.display = "none";
    if (introEl) introEl.classList.remove("show");
    showIntro();
  }

  // ——— Sound toggle UI ———
  function updateSoundBtn() {
    var btn = document.getElementById("soundToggle");
    if (!btn || !window.SoundEngine) return;
    if (SoundEngine.enabled) {
      btn.textContent = "🔊";
      btn.title = "إيقاف الصوت";
    } else {
      btn.textContent = "🔇";
      btn.title = "تشغيل الصوت";
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
    clearAllFilters: clearAllFilters,
    enterApp: enterApp,
    exportCSV: exportCSV,
  };
})();
