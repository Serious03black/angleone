/**
 * Orders Page Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const orderTabs = document.querySelectorAll(".orders-tab-item");
  orderTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      orderTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      if (window.showToast) {
        window.showToast(`Showing ${tab.innerText}`);
      }
    });
  });

  const viewIdeasBtn = document.getElementById("view-ideas-btn");
  if (viewIdeasBtn) {
    viewIdeasBtn.addEventListener("click", () => {
      window.location.href = "/markets";
    });
  }
});
