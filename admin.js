let pendingImportText = "";

document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const organizeModal = document.getElementById("organize-modal");
  const btnAutoOrganize = document.getElementById("btn-auto-organize");
  const btnKeepRaw = document.getElementById("btn-keep-raw");
  const btnAddRow = document.getElementById("btn-add-row");
  const btnClearAll = document.getElementById("btn-clear-all");
  const btnSaveLive = document.getElementById("btn-save-live");
  const gridBody = document.getElementById("grid-body");

  // --- AUTOMATED ADDRESS SCRUBBER (PRIVACY PROTECTION) ---
  function sanitizePrivacy(text) {
    if (!text) return "";
    return text
      .replace(/\b\d+\s+[A-Za-z0-9\s\.\']+(Ln|Ln\.|Street|St|St\.|Circle|Cir|Cir\.|Way|Road|Rd|Rd\.|Avenue|Ave|Ave\.|Boulevard|Blvd|Blvd\.|Drive|Dr|Dr\.|Court|Ct|Ct\.|Place|Pl|Pl\.|Parkway|Pkwy|Pkwy\.|Box\s+\d+)\b,?/gi, "")
      .replace(/\b\d{5}(-\d{4})?\b,?/g, "")
      .replace(/\s+,/g, ",")
      .replace(/,\s*,/g, ",")
      .replace(/^[\s,]+|[\s,]+$/g, "")
      .trim();
  }

  // 1. File Drag & Drop / File Selection
  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#63b3ed";
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "#4a5568";
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#4a5568";
      const file = e.dataTransfer.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => processIncomingText(event.target.result);
        reader.readAsText(file);
      }
    });

    dropZone.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".txt,.csv,.tsv";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => processIncomingText(event.target.result);
          reader.readAsText(file);
        }
      };
      input.click();
    });
  }

  // 2. Clipboard Paste Handling
  document.addEventListener("paste", (e) => {
    if (document.activeElement && document.activeElement.isContentEditable) return;
    e.preventDefault();
    const pasteData = (e.clipboardData || window.clipboardData).getData("text");
    if (pasteData) {
      processIncomingText(pasteData);
    }
  });

  function processIncomingText(rawText) {
    pendingImportText = rawText;
    if (organizeModal) {
      organizeModal.classList.remove("hidden");
    } else {
      parseAndRenderScrubbed(rawText);
    }
  }

  if (btnAutoOrganize) {
    btnAutoOrganize.addEventListener("click", () => {
      if (organizeModal) organizeModal.classList.add("hidden");
      parseAndRenderScrubbed(pendingImportText);
    });
  }

  if (btnKeepRaw) {
    btnKeepRaw.addEventListener("click", () => {
      if (organizeModal) organizeModal.classList.add("hidden");
      parseAndRenderScrubbed(pendingImportText);
    });
  }

  // 3. Parsing and Row Generation
  function parseAndRenderScrubbed(text) {
    const lines = text.split("\n");
    const signers = [];

    lines.forEach((line) => {
      let trimmed = line.replace(/â€¢/g, "").replace(/•/g, "").trim();
      if (!trimmed) return;

      if (trimmed.toLowerCase().startsWith("name,") || trimmed.toLowerCase().startsWith("signer name")) return;

      let name = "";
      let category = "Sports";
      let status = "Active";
      let notes = "";

      if (trimmed.includes(",")) {
        const parts = trimmed.split(",");
        name = parts[0].trim();
        if (parts.length > 1) category = parts[1].trim() || "Sports";
        if (parts.length > 2) status = parts[2].trim() || "Active";
        if (parts.length > 3) notes = sanitizePrivacy(parts.slice(3).join(", "));
      } else {
        name = sanitizePrivacy(trimmed);
      }

      if (name) {
        signers.push({
          name: name,
          category: category,
          status: status,
          notes: notes
        });
      }
    });

    renderGridRows(signers);
  }

  // Continuous Import: Appends rows to existing list without clearing
  function renderGridRows(signers) {
    if (!gridBody) return;
    signers.forEach((s) => {
      addGridRow(s.name, s.category, s.status, s.notes);
    });
  }

  function addGridRow(name = "", category = "Sports", status = "Active", notes = "") {
    if (!gridBody) return;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="drag-handle">≡</td>
      <td contenteditable="true">${name}</td>
      <td contenteditable="true">${category}</td>
      <td contenteditable="true">${status}</td>
      <td contenteditable="true">${notes}</td>
      <td>
        <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="this.closest('tr').remove()">Delete</button>
      </td>
    `;
    gridBody.appendChild(tr);
  }

  if (btnAddRow) {
    btnAddRow.addEventListener("click", () => {
      addGridRow("New Signer", "Sports", "Active", "");
    });
  }

  if (btnClearAll) {
    btnClearAll.addEventListener("click", () => {
      if (gridBody) gridBody.innerHTML = "";
    });
  }

  if (btnSaveLive) {
    btnSaveLive.addEventListener("click", () => {
      const rows = gridBody.querySelectorAll("tr");
      const exportData = [];

      rows.forEach((tr) => {
        const cells = tr.querySelectorAll("td");
        if (cells.length >= 5) {
          exportData.push({
            name: cells[1].innerText.trim(),
            category: cells[2].innerText.trim(),
            status: cells[3].innerText.trim(),
            notes: cells[4].innerText.trim()
          });
        }
      });

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "signers.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      alert("Clean public dataset generated! Replace signers.json in your repository to update the live site.");
    });
  }
});
