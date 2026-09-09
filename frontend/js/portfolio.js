/**
 * Portfolio Page Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const portfolioTabs = document.querySelectorAll(".portfolio-tab-item");
  portfolioTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      portfolioTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      if (window.showToast) {
        window.showToast(`Switched to ${tab.innerText} Portfolio view`);
      }
    });
  });

  const investBtns = document.querySelectorAll(".invest-now-btn");
  investBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "/markets";
    });
  });
});
