import type { SweetAlertOptions, SweetAlertResult } from "sweetalert2"

// ─── Lazy SweetAlert2 ────────────────────────────────────────────────────────
// `sweetalert2` is ~70 KB gzipped (JS + injected CSS). Importing it directly
// from a component that ships on every page — Footer, checkout, account —
// pulled all of it into the initial bundle just to show the odd dialog.
//
// This shim keeps the exact `Swal.fire(options)` call signature, so call sites
// only swap their import: the real module is fetched on the first dialog and
// reused afterwards. Cost is a one-off chunk download on a user-initiated
// action, which is imperceptible next to shipping it to every visitor.
//
// Types come from `import type`, so nothing here reaches the runtime bundle.
// ─────────────────────────────────────────────────────────────────────────────

let modulePromise: Promise<typeof import("sweetalert2").default> | null = null

function loadSwal() {
  if (!modulePromise) {
    modulePromise = import("sweetalert2").then((m) => m.default)
  }
  return modulePromise
}

export const Swal = {
  async fire(options: SweetAlertOptions): Promise<SweetAlertResult> {
    const swal = await loadSwal()
    return swal.fire(options)
  },
}

export default Swal
