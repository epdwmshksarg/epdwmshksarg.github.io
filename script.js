const form = document.querySelector("#registration-form");
const registrationView = document.querySelector("#registration-view");
const successView = document.querySelector("#success-view");
const resetButton = document.querySelector("#reset-button");
const saveQrButton = document.querySelector("#save-qr-button");
const qrCode = document.querySelector("#qrcode");

function makeReference() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `EV-${new Date().getFullYear()}-${suffix}`;
}

async function compressRegistration(registration) {
  const json = JSON.stringify(registration);
  if (!("CompressionStream" in window)) return json;
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `EV1:${btoa(binary)}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const data = new FormData(form);
  const registration = Object.fromEntries(data.entries());
  const reference = makeReference();
  registration.reference = reference;
  registration.updates = data.get("updates") === "on";
  const verificationPayload = await compressRegistration({ type: "EV EV registration", registration });

  document.querySelector("#reference-id").textContent = reference;
  document.querySelector("#vehicle-name").textContent = registration.vehicle;
  document.querySelector("#owner-name").textContent = registration.ownerName;
  document.querySelector("#battery-serial").textContent = registration.batterySerial;
  qrCode.replaceChildren();

  if (typeof QRCode === "undefined") {
    qrCode.textContent = "QR code unavailable";
    qrCode.classList.add("qr-fallback");
  } else {
    new QRCode(qrCode, {
      text: verificationPayload,
      width: 480,
      height: 480,
      colorDark: "#18352e",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.L,
    });
  }

  registrationView.hidden = true;
  successView.hidden = false;
  successView.scrollIntoView({ behavior: "smooth", block: "center" });
});

resetButton.addEventListener("click", () => {
  form.reset();
  qrCode.replaceChildren();
  qrCode.classList.remove("qr-fallback");
  successView.hidden = true;
  registrationView.hidden = false;
  document.querySelector("#form-title").focus();
});

saveQrButton.addEventListener("click", () => {
  const image = qrCode.querySelector("img");
  const canvas = qrCode.querySelector("canvas");
  const source = image ? image.src : canvas ? canvas.toDataURL("image/png") : null;
  if (!source) return;
  const link = document.createElement("a");
  link.href = source;
  link.download = `${document.querySelector("#reference-id").textContent}-verification.png`;
  link.click();
});
