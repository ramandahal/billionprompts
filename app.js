/* Local-only intake: no requests, file reads, AI calls, or automatic draft saves. */
(() => {
  "use strict";

  const form = document.getElementById("discoveryForm");
  if (!form) return;

  const status = document.getElementById("formStatus");
  const saveButton = document.getElementById("saveDraft");
  const deleteButton = document.getElementById("deleteDraft");
  const clearDocumentsButton = document.getElementById("clearDocuments");
  const documentStatus = document.getElementById("documentStatus");
  const downloadLink = document.getElementById("submissionDownload");
  const documents = form.elements.namedItem("documents");
  const storageKey = "billionprompts.hidden-fortune.draft.v1";
  const textFields = [
    "fullName", "email", "primaryGoal", "threeYearVision", "conversationText",
    "linkedinUrl", "portfolioUrl", "delicateContext"
  ];
  const consentFields = ["ownershipConsent", "privacyConsent", "analysisConsent"];
  let documentNames = [];
  let downloadUrl = null;

  function announce(message, state = "success") {
    status.textContent = message;
    status.dataset.state = state;
  }

  function collectFields() {
    return Object.fromEntries(textFields.map(name => [name, form.elements.namedItem(name).value]));
  }

  function showDocuments(restored = false) {
    documentStatus.textContent = documentNames.length
      ? `${restored ? "Restored document names" : "Selected document names"}: ${documentNames.join(", ")}. Names only; file contents are not included.`
      : "No document names selected.";
    clearDocumentsButton.hidden = documentNames.length === 0;
  }

  function discardDownload() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
    downloadLink.removeAttribute("href");
    downloadLink.hidden = true;
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft || draft.schemaVersion !== 1 || !draft.fields ||
          textFields.some(name => typeof draft.fields[name] !== "string") ||
          !Array.isArray(draft.documentNames) ||
          draft.documentNames.some(name => typeof name !== "string")) {
        throw new Error("Unsupported draft");
      }
      textFields.forEach(name => { form.elements.namedItem(name).value = draft.fields[name]; });
      // Consent must be granted for this submission; never restore saved consent.
      consentFields.forEach(name => { form.elements.namedItem(name).checked = false; });
      documentNames = draft.documentNames.slice();
      showDocuments(true);
      announce("Saved browser draft restored. Review the fields and confirm consent again. Only document names were restored; nothing was sent.");
    } catch {
      announce("The saved draft could not be loaded, or browser storage is unavailable. You can still fill in the form and download it. Use Delete saved draft to remove an unreadable draft.", "error");
    }
  }

  form.addEventListener("submit", event => {
    // Always prevent the native POST, including on Netlify and on static Hostinger.
    event.preventDefault();
    if (form.elements.namedItem("bot-field").value) {
      announce("Please leave the anti-spam field empty.", "error");
      return;
    }
    if (!form.reportValidity()) {
      announce("Complete the required fields and consent checkboxes before creating your submission.", "error");
      return;
    }

    const submission = {
      schemaVersion: 1,
      project: "Hidden Fortune",
      createdAt: new Date().toISOString(),
      delivery: "local-download-only",
      fields: collectFields(),
      documentNames: documentNames.slice(),
      fileContentsIncluded: false,
      consent: Object.fromEntries(consentFields.map(name => [name, form.elements.namedItem(name).checked]))
    };
    try {
      discardDownload();
      const blob = new Blob([JSON.stringify(submission, null, 2) + "\n"], { type: "application/json;charset=utf-8" });
      downloadUrl = URL.createObjectURL(blob);
      downloadLink.href = downloadUrl;
      downloadLink.download = `hidden-fortune-submission-${submission.createdAt.replace(/[:.]/g, "-")}.json`;
      downloadLink.hidden = false;
      // Retain a visible link if the browser blocks the automatic download.
      downloadLink.click();
      announce("Your submission file is ready. If the download did not start, use the download link below. Nothing was sent to BillionPrompts.ai; file contents and an Opportunity Blueprint are not included.");
    } catch {
      discardDownload();
      announce("The download could not be prepared. Your form is still here; try again in a browser that supports downloads, or save a browser draft.", "error");
    }
  });

  saveButton.addEventListener("click", () => {
    try {
      // Partial drafts are allowed. No honeypot, consent, or file contents are stored.
      localStorage.setItem(storageKey, JSON.stringify({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        fields: collectFields(),
        documentNames: documentNames.slice()
      }));
      announce("Draft saved in this browser only. It is not encrypted and may be accessible to others using this browser. Consent must be confirmed again after restoring. Nothing was sent.");
    } catch {
      announce("The draft could not be saved. Browser storage may be blocked or full. Your form is still here, and you can download a completed submission instead.", "error");
    }
  });

  deleteButton.addEventListener("click", () => {
    try {
      localStorage.removeItem(storageKey);
      announce("Saved browser draft deleted. The current form and any downloaded files remain; no server data was stored.");
    } catch {
      announce("The saved draft could not be deleted because browser storage is unavailable. Try clearing this site's data in your browser settings.", "error");
    }
  });

  documents.addEventListener("change", () => {
    documentNames = Array.from(documents.files, file => file.name);
    showDocuments();
    discardDownload();
  });

  clearDocumentsButton.addEventListener("click", () => {
    documents.value = "";
    documentNames = [];
    showDocuments();
    discardDownload();
    announce("Document names cleared. No file contents were read or uploaded.");
    documents.focus();
  });

  // A prepared file is a snapshot: hide it once the form changes to avoid stale exports.
  form.addEventListener("input", discardDownload);
  form.addEventListener("change", discardDownload);
  // Prevent browser history from bringing back consent from a prior page visit.
  window.addEventListener("pageshow", () => {
    consentFields.forEach(name => { form.elements.namedItem(name).checked = false; });
  });
  showDocuments();
  restoreDraft();
  form.querySelectorAll("button[data-browser-action]").forEach(button => { button.disabled = false; });
})();
