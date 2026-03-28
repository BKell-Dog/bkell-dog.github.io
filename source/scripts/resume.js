document.querySelectorAll(".accordion-header").forEach(button => {
  button.addEventListener("click", () => {
    const panel = button.nextElementSibling;
    const isOpen = button.getAttribute("aria-expanded") === "true";

    button.setAttribute("aria-expanded", !isOpen);

    if (!isOpen) {
      // OPEN
      panel.style.height = panel.scrollHeight + "px";
    } else {
      // CLOSE (important two-step for animation)
      panel.style.height = panel.scrollHeight + "px";
      requestAnimationFrame(() => {
        panel.style.height = "0px";
      });
    }
  });
});