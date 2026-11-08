const esc = (v = "") =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export async function mountNotifications({ container, shop, api, onOpen }) {
  const panel = document.createElement("section");
  panel.className = "surface notification-panel";
  panel.innerHTML =
    '<p class="helper" role="status">Loading payment notifications…</p>';
  container.prepend(panel);
  const path = `/api/shops/${shop.id}/notifications`;
  const render = async () => {
    try {
      const data = await api(path);
      if (!panel.isConnected) return;
      panel.innerHTML = `<details ${data.unread ? "open" : ""}><summary><strong>Payment notifications</strong> <span class="pill">${data.unread} unread</span></summary><p class="helper">Verified Square payments appear here even if email is unavailable.</p><label class="check-field"><input type="checkbox" id="merchantEmailEnabled" ${data.settings.enabled ? "checked" : ""}> Email new payments to ${esc(data.settings.email || "my verified sign-in email")}</label><p class="helper">${data.configured ? (data.testMode ? "Test emails are restricted to the platform’s test inbox." : "Emails are sent after Square confirms payment.") : "Email setup is pending. Dashboard notifications already work."}</p>${data.testAvailable ? `<button type="button" id="testMerchantEmail" class="button secondary small" ${!data.configured || !data.settings.enabled ? "disabled" : ""}>Send test email</button>` : ""}<div class="notification-items">${data.notifications.length ? data.notifications.map((n) => `<div class="notification-item"><div><strong>${esc(n.reference)} · ${esc(n.kind === "connection_test" ? "Email connection test" : n.status === "review_required" ? "Payment needs review" : n.balanceCents ? "Deposit received" : "Payment received")}</strong><p>${esc(n.title)} · ${n.kind === "connection_test" ? "No payment or order created" : esc(new Intl.NumberFormat(undefined, { style: "currency", currency: n.currency }).format(n.amountCents / 100))}</p><small>Email: ${esc(n.emailStatus === "accepted" ? "accepted by email provider" : n.emailStatus)}</small></div><button class="button secondary small" data-notification="${esc(n.id)}" data-request="${esc(n.requestId)}">${n.kind === "connection_test" ? "Mark read" : "View bouquet &amp; order"}${n.unread ? " · new" : ""} ↗</button></div>`).join("") : '<p class="helper">Your next confirmed payment will appear here.</p>'}</div></details><p class="helper" role="status" data-notification-message></p>`;
      panel.querySelector("#merchantEmailEnabled").onchange = async (e) => {
        e.target.disabled = true;
        try {
          await api(path, {
            method: "PUT",
            body: { enabled: e.target.checked },
          });
          await render();
        } catch (error) {
          e.target.checked = data.settings.enabled;
          panel.querySelector("[data-notification-message]").textContent =
            error.message;
          e.target.disabled = false;
        }
      };
      const testButton = panel.querySelector("#testMerchantEmail");
      if (testButton)
        testButton.onclick = async () => {
          testButton.disabled = true;
          try {
            await api(path, { method: "POST", body: { action: "test" } });
            await render();
            panel.querySelector("[data-notification-message]").textContent =
              "Test email queued. Check your inbox and the email status below. Repeat clicks within a minute reuse the same test.";
            setTimeout(() => {
              if (panel.isConnected) render();
            }, 4000);
          } catch (error) {
            panel.querySelector("[data-notification-message]").textContent =
              error.message;
            testButton.disabled = false;
          }
        };
      for (const button of panel.querySelectorAll("[data-notification]"))
        button.onclick = async () => {
          try {
            await api(path, {
              method: "PATCH",
              body: { id: button.dataset.notification },
            });
            if (/^rq_[a-f0-9]{32}$/.test(button.dataset.request || ""))
              onOpen(button.dataset.request);
            else await render();
          } catch (error) {
            panel.querySelector("[data-notification-message]").textContent =
              error.message;
          }
        };
    } catch (error) {
      if (panel.isConnected) panel.textContent = error.message;
    }
  };
  await render();
  const poll = () =>
    setTimeout(async () => {
      if (!panel.isConnected) return;
      if (!document.hidden && !panel.contains(document.activeElement))
        await render();
      poll();
    }, 60000);
  poll();
}
