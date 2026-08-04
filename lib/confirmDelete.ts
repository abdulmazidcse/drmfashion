import Swal from "sweetalert2"

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))
}

const TRASH_ICON_HTML = `
  <span class="confirm-delete-mark confirm-delete-dot" style="top:0;left:46%;"></span>
  <span class="confirm-delete-mark confirm-delete-plus" style="top:8%;right:0;">+</span>
  <span class="confirm-delete-mark confirm-delete-plus" style="top:22%;left:-10%;">+</span>
  <span class="confirm-delete-mark confirm-delete-dot" style="bottom:24%;right:-8%;"></span>
  <span class="confirm-delete-mark confirm-delete-dot confirm-delete-dot-sm" style="bottom:2%;left:2%;"></span>
  <div class="confirm-delete-shadow"></div>
  <svg class="confirm-delete-trash" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="24" y="8" width="16" height="6" rx="3" fill="#f43f5e" />
    <rect x="14" y="15" width="36" height="7" rx="3.5" fill="#f43f5e" />
    <path d="M17 26h30l-2.6 26.5A5 5 0 0 1 39.4 57H24.6a5 5 0 0 1-4.98-4.5L17 26Z" fill="#f43f5e" />
    <rect x="26" y="31" width="3" height="19" rx="1.5" fill="#fecdd3" />
    <rect x="30.5" y="31" width="3" height="19" rx="1.5" fill="#fecdd3" />
    <rect x="35" y="31" width="3" height="19" rx="1.5" fill="#fecdd3" />
  </svg>
`

export async function confirmDelete(text: string, title = "Are you sure?"): Promise<boolean> {
  const result = await Swal.fire({
    html: `
      <div class="confirm-delete-card">
        <div class="confirm-delete-icon-wrap">${TRASH_ICON_HTML}</div>
        <h3 class="confirm-delete-title">${escapeHtml(title)}</h3>
        <p class="confirm-delete-text">${escapeHtml(text)}</p>
      </div>
    `,
    showCancelButton: true,
    buttonsStyling: false,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    customClass: {
      popup: "confirm-delete-popup",
      actions: "confirm-delete-actions",
      confirmButton: "confirm-delete-confirm",
      cancelButton: "confirm-delete-cancel",
    },
  })
  return result.isConfirmed
}
