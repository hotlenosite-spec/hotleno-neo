export function isDevAdminBypassEnabled() {
  return (
    process.env.NEXT_PUBLIC_DEV_ADMIN_BYPASS === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function isDevPreviewAllPagesEnabled() {
  return (
    process.env.NEXT_PUBLIC_DEV_PREVIEW_ALL_PAGES === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function getDevAdminBypassWarning() {
  if (!isDevAdminBypassEnabled()) return "";

  return (
    "NEXT_PUBLIC_DEV_ADMIN_BYPASS is enabled. This is allowed only for local " +
    "development and is forcibly disabled in production builds."
  );
}

export function getDevPreviewAllPagesWarning() {
  if (!isDevPreviewAllPagesEnabled()) return "";

  return "[HOTLENO SECURITY] DEV_PREVIEW_ALL_PAGES is enabled for local development only.";
}

export function warnDevPreviewAllPagesEnabled() {
  const warning = getDevPreviewAllPagesWarning();
  if (warning) {
    console.warn(warning);
  }
}
