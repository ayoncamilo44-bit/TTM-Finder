let pendingImportText = "";

document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const organizeModal = document.getElementById("organize-modal");
  const btnAutoOrganize = document.getElementById("btn-auto-organize");
  const btnKeepRaw = document.getElementById("btn-keep-raw");
  const btnAddRow = document.getElementById("btn-add-row");
  const btnSaveLive = document.getElementById("btn-save-live");
  const gridBody = document.getElementById("grid-body");

  // 1. File Drag & Drop Handling
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

    // File picker on click
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

  // 2. Screen Paste Handling
  document.addEventListener("paste", (e) => {
    // Don't trigger if actively editing inside a grid cell
    if (document.activeElement && document.activeElement.isContentEditable) return;

    const pasteData = (e.clipboardData || window.clipboardData).getData("text");
    if (pasteData) {
      e.preventDefault();
      processIncomingText(pasteData);
    }
  });

  // 3. Inspect Incoming Data for Formatting Errors
  function processIncomingText(rawText) {
    pendingImportText = rawText;
    const isMessy =
      rawText.includes("•") ||
      rawText.includes("â€¢") ||
      rawText.includes("Cards:") ||
      rawText.includes("Status:") ||
      rawText.includes("- ");

    if (isMessy && organizeModal) {
      organizeModal.classList.remove("hidden");
    } else {
      parseAndRenderRaw(rawText);
    }
  }

  // 4. Modal Cleanup Button Handlers
  if (btnAutoOrganize) {
    btnAutoOrganize.addEventListener("click", () => {
      if (organizeModal) organizeModal.classList.add("hidden");
      const cleanSigners = autoOrganizeText(pendingImportText);
      renderGridRows(cleanSigners);
    });
  }

  if (btnKeepRaw) {
    btnKeepRaw.addEventListener("click", () => {
      if (organizeModal) organizeModal.classList.add("hidden");
      parseAndRenderRaw(pendingImportText);
    });
  }

  // 5. Automatic Cleanup Engine (Merges bullet lines into single signer entries)
  function autoOrganizeText(text) {
    const lines = text.split("\n");
    const signers = [];
    let currentSigner = null;

    lines.forEach((line) => {
      let trimmed = line.replace(/â€¢/g, "").replace(/•/g, "").trim();
      if (!trimmed) return;

      const isNoteLine =
        trimmed.startsWith("-") ||
        trimmed.startsWith("Cards:") ||
        trimmed.startsWith("Status:") ||
        trimmed.startsWith("Note:");

      if (isNoteLine && currentSigner) {
        currentSigner.notes += (currentSigner.notes ? " | " : "") + trimmed;
      } else if (trimmed.includes("\t")) {
        const cols = trimmed.split("\t");
        currentSigner = {
          name: cols[0] || "",
          category: cols[1] || "Sports",
          status: cols[3] || "Published",
          notes: cols.slice(4).join(" ") || ""
        };
        signers.push(currentSigner);
      } else {
        currentSigner = {
          name: trimmed,
          category: "Sports",
          status: "Published",
          notes: ""
        };
        signers.push(currentSigner);
      }
    });

    return signers;
  }

  function parseAndRenderRaw(text) {
    const lines = text.split("\n");
    const signers = lines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("\t");
        return {
          name: parts[0] || line,
          category: parts[1] || "Sports",
          status: parts[3] || "Draft",
          notes: parts.slice(4).join(" ") || ""
        };
      });
    renderGridRows(signers);
  }

  // 6. Interactive Visual Grid Generator
  function renderGridRows(signers) {
    if (!gridBody) return;
    gridBody.innerHTML = "";

    signers.forEach((s) => {
      addGridRow(s.name, s.category, s.status, s.notes);
    });
  }

  function addGridRow(name = "", category = "Sports", status = "Published", notes = "") {
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

  // 7. Grid Toolbar Functions
  if (btnAddRow) {
    btnAddRow.addEventListener("click", () => {
      addGridRow("New Signer", "Sports", "Published", "");
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

      // Creates a clean download file (signers.json)
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "signers.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      alert("Clean dataset generated as 'signers.json'! Upload or replace this file in your repository to update your live directory.");
    });
  }
});
