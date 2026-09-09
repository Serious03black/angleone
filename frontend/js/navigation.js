/**
 * Navigation & Header Controls
 */

document.addEventListener("DOMContentLoaded", () => {
  // Highlight Active Link based on current pathname
  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
  const navLinks = document.querySelectorAll(".nav-link");

  const hasServerActive = Array.from(navLinks).some(link => link.classList.contains("active"));
  if (!hasServerActive) {
    navLinks.forEach(link => {
      const href = link.getAttribute("href");
      if (href === currentPath || (currentPath === "/" && (href === "/" || href === "/index" || href === "index.html"))) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  // Watchlist Toggle Button (e.g. HIDE WATCHLIST / SHOW WATCHLIST)
  const toggleBtn = document.getElementById("toggle-watchlist-btn");
  const watchlistSidebar = document.querySelector(".watchlist-sidebar");
  const contentArea = document.querySelector(".content-area");

  if (toggleBtn && watchlistSidebar) {
    toggleBtn.addEventListener("click", () => {
      const isCollapsed = watchlistSidebar.classList.toggle("collapsed");
      if (contentArea) {
        contentArea.classList.toggle("full-width", isCollapsed);
      }
      toggleBtn.innerHTML = isCollapsed ? `👁 SHOW WATCHLIST` : `👁 HIDE WATCHLIST`;
    });
  }

  // Mobile Menu & Watchlist Drawer Toggle
  const mobileMenuBtn = document.getElementById("mobile-menu-btn");
  const watchlistOverlay = document.getElementById("watchlist-overlay");

  if (mobileMenuBtn && watchlistSidebar) {
    mobileMenuBtn.addEventListener("click", () => {
      watchlistSidebar.classList.toggle("mobile-open");
      if (watchlistOverlay) {
        watchlistOverlay.classList.toggle("show");
      }
    });
  }

  if (watchlistOverlay && watchlistSidebar) {
    watchlistOverlay.addEventListener("click", () => {
      watchlistSidebar.classList.remove("mobile-open");
      watchlistOverlay.classList.remove("show");
    });
  }

  // Ctrl + S Global Keyboard Shortcut to Focus Search
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
      e.preventDefault();
      const globalSearch = document.getElementById("global-search-input");
      if (globalSearch) {
        globalSearch.focus();
      }
    }
  });
});
